---
layout: post
post_class: text-post
title: Replacing Functions within LINQ Queries
tags:
  - Development
  - EntityFramework
  - LINQ
  - CSharp
---
Nach der [einen][0] oder [anderen][1] -- mehr oder weniger ausgefallenen -- [Spielerei][2] mit LINQ wäre einmal etwas Einfaches -- unter Umständen relativ Nützliches -- angebracht. Irgendwann schleichen sich praktische, aber leider stark "gekoppelte" Hilfsklassen ein, wenn nicht gerade dogmatisch auf eventuelle Abhängigkeiten geachtet wird, welche explizit mit dem verwendeten LINQ Provider (Entity Framework, LINQ-to-SQL, ...) zusammenhängen. Jetzt möchte man, für welche Zwecke auch immer, anderes verwenden, das sogar analog arbeitet.

Konkretes Beispiel: `SqlFunctions` soll durch `SqlCeFunctions` ersetzt werden.

Mit den in den bereits verlinkten Posts besprochenen "Rewrite"-Tricks, die es ermöglichen einen *Expression Tree* on-the-fly umzuschreiben, um den verwendeten LINQ Provider glücklich zu machen, ist nur ein eher einfacher *Expression Visitor* zu implementieren, der die entsprechenden Typdefinitionen tauscht.

```csharp
public class SubstitutionQueryRewriter : ExpressionVisitor
{
    private readonly Type from;
    private readonly Type to;

    public SubstitutionQueryRewriter(Type from, Type to)
    {
        this.from = from;
        this.to = to;
    }
}
```

Als `from` könnte direkt `typeof(SqlFunctions)`, als `to` beispielsweise `typeof(SqlCeFunctions)` oder passende `typeof(FakeSqlFunctions)` übergeben werden, um schlussendlich eine alternative Datenbank zu verwenden oder super-performant in-memory zu arbeiten.

Dazu ist nur ein einziger "Besuch" notwendig:

```csharp
protected override Expression VisitMethodCall(MethodCallExpression node)
{
    if (node == null || node.Method == null)
        return node;

    if (node.Method.DeclaringType == from)
    {
        var typeArguments = node.Method.GetGenericArguments();
        var arguments = node.Arguments.Select(a => Visit(a)).ToArray();

        // assume equivalent method signature
        return Expression.Call(to, node.Method.Name, typeArguments, arguments);
    }

    return base.VisitMethodCall(node);
}
```

Wer mag, kann ein wenig validieren anstatt nur zu "assumen".

Und nun, nachdem sich hier bereits ein paar LINQ-Manipulationen gesammelt haben, die im Verlauf des praktischen Einsatzes auch ein wenig "hübscher" geworden sind, kann es nicht nur in seiner Vollständigkeit [auf GitHub][3] geladen, sondern geradewegs als [NuGet Package][4] eingebunden werden:

```
PM> Install-Package NeinLinq
```

Der "Rewrite-Mechanismus" kann im Übrigen für eigene "Rewriter" genutzt werden.

[0]: /2014/07/11/lambda-expression-injection/
[1]: /2014/02/28/graceful-null-safe-linq-queries/
[2]: /2013/10/25/predicate-expression-translation/
[3]: https://github.com/axelheer/nein-linq
[4]: https://www.nuget.org/packages/NeinLinq
