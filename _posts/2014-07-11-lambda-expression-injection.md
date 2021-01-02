---
layout: post
post_class: text-post
title: Lambda-Expression-Injection
tags:
  - Development
  - EntityFramework
  - LINQ
  - CSharp
redirect_from:
  - /post/91462855205/lambda-expression-injection/
  - /post/91462855205/
---
Werden LINQ-Queries für ein anderes System transformiert bzw. übersetzt, so kann in der Regel nur ein sehr eingeschränktes Set an Funktionen innerhalb eben jener Queries verwendet werden, schließlich muss der zuständige LINQ-Provider einen entsprechend äquivalenten Code (oder was auch immer) generieren können. Was zu Beginn noch relativ vernachlässigbar erscheint, wo doch mehr in der .NET-Welt implementiert werden kann (wartbarer, testbarer, so was von 21. Jahrhundert, ...), wirkt mit der Zeit doch ein wenig unbefriedigend: immer mehr Code-Teile werden herumkopiert, da ein Auslagern in Funktionen mangels Support durch den LINQ-Provider einfach nicht möglich ist.

Wie soll auch ein *Entity Framework* einen fix/fertig übersetzen Code vernünftig zur Laufzeit in ein SQL-Query verwandeln können? Schreibt man beispielsweise eine kleine Funktion, um einen selektierten Text ggf. ein wenig zu beschränken...

```csharp
public static string LimitText(this string value, int maxLength)
{
    if (value != null && value.Length > maxLength - 3)
        return value.Substring(0, maxLength - 3) + "...";
    return value;
}
```

...so bleibt dem beliebten OR/M nichts anderes übrig als seine Unfähigkeit einzugestehen:

> LINQ to Entities does not recognize the method 'System.String LimitText(System.String, Int32)' method, and this method cannot be translated into a store expression.

Ein Kopieren des Ausdrucks in das eigentliche Query löst dieses Problem. Was bei diesem einfachen Beispiel vielleicht noch mit dem Gewissen vereinbart werden kann, stellt bei gröberen Funktions-Brocken einen ziemlichen "Code-Smell" dar. Und der stinkt.

Nun lassen sich *Expression Trees* wunderbar manipulieren, wie bereits an der [einen][0] oder [anderen][1] Stelle demonstriert wurde. Wir verwenden somit den bewährten Rewrite-Mechanismus ([RewriteQuery][2], [RewriteQueryBuilder][3] und [RewriteQueryProvider][4]), um ein Query on-the-fly umschreiben zu können, sowie den [ParameterBinder][5] für das "Einfügen" von Lambda-Ausdrücken. Wenn eine Methode also mittels Attribut als "Injectable" markiert wurde, so soll der passende Ausdruck direkt in den *Expression Tree* eingefügt werden, damit ein LINQ-Provider den gewünschten Übersetzungsvorgang auch erfolgreich durchführen kann.

Das könnte ungefähr so aussehen:

```csharp
[InjectLambda]
public static string LimitText(this string value, int maxLength) { /* ... */ }

public static Expression<Func<string, int, string>> LimitText()
{
    return (v, l) => v != null && v.Length > l - 3 ? v.Substring(0, l - 3) + "..." : v;
}
```

Fehlt nur noch ein Expression Visitor, der für all diese Methoden direkt die passenden Lambda-Ausdrücke einsetzt, deren Parameter in den ursprünglichen *Expression Tree* integriert, sowie mit möglichst wenig *Reflection* auskommt -- der Performance zuliebe.

```csharp
public class InjectableQueryRewriter : ExpressionVisitor
{
    private readonly Dictionary<MethodInfo, Func<LambdaExpression>> cache =
        new Dictionary<MethodInfo, Func<LambdaExpression>>();

    /* ... */
}
```

In einem einfachen *Dictionary* werden pro Methode Funktionen gespeichert, die wiederum Lambda-Ausdrücke generieren. Diese Funktionen wollen einmal erstellt werden:

```csharp
private Func<LambdaExpression> replacementOfMethod(MethodInfo call)
{
    var metadata = call.GetCustomAttribute<InjectLambdaAttribute>();
    if (metadata == null)
        return null;

    var target = metadata.Target ?? call.DeclaringType;
    var method = metadata.Method ?? call.Name;

    try
    {
        var factory = target.GetMethods()
                            .Where(m => m.Name == method
                                     && !m.GetParameters().Any()
                                     && typeof(LambdaExpression).IsAssignableFrom(m.ReturnType))
                            .Single();

        return Expression.Lambda<Func<LambdaExpression>>(Expression.Call(factory)).Compile();
    }
    catch (Exception ex)
    {
        throw new InvalidOperationException(
            string.Format("Unable to retrieve lambda expression for {0}.{1}.", target.Name, method),
            ex);
    }
}
```

Um ein wenig flexibel zu sein, könnte ein Attribut `InjectLambdaAttribute` die Angabe von Klasse und Methode ermöglichen, allerdings sollte es eine Konvention auch tun. Geschmackssache. Auf jeden Fall wird schlussendlich ein Lambda-Ausdruck generiert, der eine einen Lambda-Ausdruck generierende Methode aufruft (Achievement unlocked?), um gleich im Anschluss für den Cache kompiliert zu werden. Wir kommen also ohne `Invoke` via *Reflection* oder dergleichen aus.

Der eigentliche "Besuch" einer *Method-Call-Expression* könnte dann ungefähr so funktionieren:

```csharp
protected override Expression VisitMethodCall(MethodCallExpression node)
{
    if (node == null || node.Method == null)
        return node;

    if (node.Object == null)
    {
        Func<LambdaExpression> factory;
        if (!cache.TryGetValue(node.Method, out factory))
        {
            factory = replacementOfMethod(node.Method);
            cache[node.Method] = factory;
        }

        if (factory != null)
        {
            var replacement = factory();
            var binders = replacement.Parameters.Zip(node.Arguments,
                (p, a) => new ParameterBinder(p, a));

            return Visit(binders.Aggregate(replacement.Body, (e, b) => b.Visit(e)));
        }
    }

    return base.VisitMethodCall(node);
}
```

Im ersten Schritt wird für statische Methoden überprüft, ob ein entsprechendes Replacement verfügbar ist. Wenn ja, wird im Anschluss der passende Lambda-Ausdruck erstellt, dessen Parameter durch die ursprünglichen Argumente des Method-Calls ersetzt, sowie nach einem zusätzlichen rekursiven Besuch (eingefügte Methoden sollen ja wiederum Methoden eingefügt bekommen können!) retourniert.

Hat man einen derartigen Mechanismus einmal in der Hand, entstehen gleich viel hübschere LINQ-Queries. Awesome, wie die Amis lautstark zu bemerken pflegen.

**Update**

[Full sample on GitHub][6]

[0]: /2013/10/25/predicate-expression-translation/
[1]: /2014/02/28/graceful-null-safe-linq-queries/
[2]: https://github.com/axelheer/nein-linq/blob/master/NeinLinq/RewriteQuery.cs
[3]: https://github.com/axelheer/nein-linq/blob/master/NeinLinq/RewriteQueryBuilder.cs
[4]: https://github.com/axelheer/nein-linq/blob/master/NeinLinq/RewriteQueryProvider.cs
[5]: https://github.com/axelheer/nein-linq/blob/master/NeinLinq/ParameterBinder.cs
[6]: https://github.com/axelheer/nein-linq
