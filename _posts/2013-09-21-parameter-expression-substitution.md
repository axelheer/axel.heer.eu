---
layout: post
post_class: text-post
title: Parameter Expression Substitution
tags:
  - Development
  - LINQ
  - CSharp
redirect_from:
  - /post/61844551195/parameter-expression-substitution/
  - /post/61844551195/
---
Werden in einem größeren Projekt *Expressions* für *LINQ queries* mehr oder weniger zentral verwaltet, um nicht allzu oft Copy & Paste Shortcuts bemühen zu müssen, oder sogar ein wenig dynamisch zusammengestellt, so steht man relativ schnell vor dem Problem, diverse *Predicates* miteinander verknüpfen zu wollen. Sind diese Predicates vom selben Typ, so warten bereits populäre Lösungen darauf gefunden zu werden -- Stichwort [LINQKit][0].

Wenn unsere *Predicates* jedoch von unterschiedlicher aber "verwandter" Signatur sind, so bietet sich ein gutes / altes Konzept aus der Mathematik an: die Substitution. Bezieht sich das eine auf einen Typ *A* und das andere auf einen Typ *B*, wobei Variablen vom Typ *B* durch einen Ausdruck *C* vom Typ *A* ersetzt werden können, so kann ersteres nach einer entsprechenden Substition mit zweiterem leicht kombiniert werden.

In "mathematischem Pseudocode" möchten wir also *P(a)* und *Q(b)* zu *P(a) ∧ Q(C(a))* überführen.

Und jetzt in LINQ: starten wir einmal mit einem 08/15 Beispiel. Es gibt Organisationen und Produkte, die jeweils innerhalb eines bestimmten Zeitrahmens existieren.

```csharp
public interface IMortal {
    DateTime ValidFrom { get; set; }
    DateTime? ValidTo { get; set; }
}

public class Organisation : IMortal {
    public int Id { get; private set; }
    public string Name { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
}

public class Product : IMortal {
    public int Id { get; private set; }
    public string Name { get; set; }
    public Organisation Organisation { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
}
```

Die Validierung eines Zeitpunktes -- ob er auch zwischen Anfang und Ende positioniert ist -- sieht für beide Typen gleich aus, gilt aber einmal für Organisationen und das andere Mal für Produkte. Darüber hinaus sind Produkte automatisch ungültig, wenn die dazugehörige Organisation "stirbt". Zwar gestellt, entspricht aber dem zuvor besprochenen...

Ein Ausdruck der Art

```csharp
private Expression<Func<IMortal, bool>> ValidToday() {
    return v => v.ValidFrom < DateTime.Today
        && (!v.ValidTo.HasValue || v.ValidTo.Value > DateTime.Today);
}
```

soll also für Organisationen

```csharp
public Expression<Func<Organisation, bool>> ValidOrganisation() {
    return ValidToday().Translate().To<Organisation>();
}
```

und in kombinierter Form auch für Produkte

```csharp
public Expression<Func<Product, bool>> ValidProduct() {
    return ValidOrganisation().Translate()
                              .To<Product>(p => p.Organisation)
                              .And(ValidToday().Translate()
                                               .To<Product>());
}
```

verwendet werden können.

Um die beiden *Extension Methods* -- `Translate` sowie `And` -- zu implementieren, benötigen wir einen Mechanismus, um den Parameter einer *Expression* durch eine beliebige andere *Expression* zu ersetzen. Beliebig deshalb, um dann auch gleich substituieren zu können.

Klingt kompliziert, ist es aber nicht (.NET 4.0 vorausgesetzt):

```csharp
internal class ParameterBinder : ExpressionVisitor {
    private readonly ParameterExpression parameter;
    private readonly Expression replacement;

    public ParameterBinder(ParameterExpression parameter, Expression replacement) {
        this.parameter = parameter;
        this.replacement = replacement;
    }

    protected override Expression VisitParameter(ParameterExpression node) {
        if (node == parameter) {
            return replacement;
        }
        return node;
    }
}
```

Der Übersetzer kann in diesem Beispiel einen Parameter durch einen kompatiblen Ausdruck oder einfach durch einen anderen -- natürlich genauso kompatiblen -- Parameter ersetzen:

```csharp
public class PredicateTranslator<T> {
    private readonly Expression<Func<T, bool>> expression;

    internal PredicateTranslator(Expression<Func<T, bool>> expression) {
        this.expression = expression;
    }

    public Expression<Func<U, bool>> To<U>() where U : T {
        var t = expression.Parameters[0];
        var u = Expression.Parameter(typeof(U), t.Name);

        var binder = new ParameterBinder(t, u);

        return Expression.Lambda<Func<U, bool>>(
            binder.Visit(expression.Body), u);
    }

    public Expression<Func<U, bool>> To<U>(Expression<Func<U, T>> path) {
        var t = expression.Parameters[0];
        var u = path.Parameters[0];

        var binder = new ParameterBinder(t, path.Body);

        return Expression.Lambda<Func<U, bool>>(
            binder.Visit(expression.Body), u);
    }
}
```

Die "Hülle" des jeweiligen Lamda-Ausdrucks muss jeweils mittels *Expression* neu erstellt werden, schließlich ändern wir hier die Signatur. Der Rest kann direkt durch den *Expression Visitor* geschossen werden.

Da das Instanzieren des Übersetzers sowas von 2006 ist, fehlt noch die dazu passende *Extension Method*, zu der sich auch gleich die Implementierung von `And` gesellen kann:

```csharp
public static PredicateTranslator<T> Translate<T>(this Expression<Func<T, bool>> expression) {
    return new PredicateTranslator<T>(expression);
}

public static Expression<Func<T, bool>> And<T>(this Expression<Func<T, bool>> left, Expression<Func<T, bool>> right) {
    var l = left.Parameters[0];
    var r = right.Parameters[0];

    var binder = new ParameterBinder(l, r);

    return Expression.Lambda<Func<T, bool>>(
        Expression.AndAlso(binder.Visit(left.Body), right.Body), r);
}
```

Was sich mit dem `ParameterBinder` wohl noch so anstellen lässt?

**Update**

[Full sample on GitHub][1]

[0]: http://www.albahari.com/nutshell/linqkit.aspx
[1]: https://github.com/axelheer/nein-linq
