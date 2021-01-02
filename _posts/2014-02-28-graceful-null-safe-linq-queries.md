---
layout: post
post_class: text-post
title: Graceful null-safe LINQ Queries
tags:
  - Development
  - LINQ
  - CSharp
redirect_from:
  - /post/78118823919/graceful-null-safe-linq-queries/
  - /post/78118823919/
---
Werden LINQ Queries auf SQL Datenbanken oder sonstigen Datenstrukturen ausgeführt, die bei einem Wert "NULL" nicht gleich in Panik geraten, um anschließend auf und davon zu laufen oder einfach mit Exeptions um sich zu werfen, ist der Umgang mit unter Umständen unvollständigen Daten ein leichtes Unterfangen. Bei gewöhnlichen Typen des .NET Frameworks müssen hingegen zahlreiche Zugriffe mittels "null-checks" abgesichert werden -- wie in ganz normalem C#-Code auch.

Das nervt. Insbesondere bei in erster Linie für SQL Datenbanken geschriebenen Queries, welche aus Performancegründen im Rahmen von Unit Tests und anderen weniger produktionsähnlichen Szenarien auf "in-memory" Konstrukten ausgeführt werden sollen. Um derartiges zu ermöglichen, müssen hingegen "null-checks" eingebaut werden, die wiederum für den Echtbetrieb eigentlich gar nicht notwendig wären (abgesehen davon, dass sie durchaus als hässlich bezeichnet werden können).

Folgendes Beispiel könnte ein solches Statement repräsentieren:

```csharp
query = from a in data
        orderby a.SomeInteger
        select new
        {
            Year    = a.SomeDate.Year,
            Integer = a.SomeOther.SomeInteger,
            Others  = from b in a.SomeOthers
                      select b.SomeDate.Month,
            More    = from c in a.MoreOthers
                      select c.SomeOther.SomeDate.Day
        };
```

Die zugegebenermaßen nicht sehr sprechende Eigenschaft `SomeOther` könnte nicht gesetzt sein, bei `SomeOthers` sowie `MoreOthers` sieht es auch nicht viel besser aus. Um auf Nummer sicher zu gehen, müsste ungefähr folgendes verbrochen werden:

```csharp
query = from a in data
        orderby a.SomeInteger
        select new
        {
            Year    = a.SomeDate.Year,
            Integer = a.SomeOther != null
                    ? a.SomeOther.SomeInteger
                    : 0,
            Others  = a.SomeOthers != null
                    ? from b in a.SomeOthers
                      select b.SomeDate.Month
                    : null,
            More    = a.MoreOthers != null
                    ? from c in a.MoreOthers
                      select c.SomeOther != null
                          ? c.SomeOther.SomeDate.Day
                          : 0
                    : null
        };
```

Das muss doch besser gehen. LINQ Queries werden mittels *Expressions* dargestellt, sind kurz vor ihrer Exekution (ok, Ausführung) noch nicht kompiliert, können also noch manipuliert werden. Wie wären somit automatisch eingefügte "null-checks"? Was auf den ersten Blick nach schwarzer Magie klingen mag, ist eigentlich relativ einfach umzusetzen...

Man nehme eine Art Proxy für unser Query (genau genommen vier mal):

```csharp
class NullsafeQuery : IQueryable
{
    private readonly IQueryProvider provider;

    public NullsafeQuery(IQueryable innerQuery)
    {
        provider = new NullsafeQueryProvider(innerQuery.Provider);

        ...
    }

    ...
}

class NullsafeOrderedQuery : NullsafeQuery, IOrderedQueryable
{
    ...
}

class NullsafeQuery<T> : NullsafeQuery, IQueryable<T>
{
    ...
}

class NullsafeOrderedQuery<T> : NullsafeQuery<T>, IOrderedQueryable<T>
{
    ...
}
```

Das jeweils richtige `NullsafeQuery` wird durch eine *Extension Method* `ToNullsafe` für alle möglichen *Queryables* gewählt, um die eigentliche Verwendung etwas schmackhafter zu gestalten.

Einen weiteren Proxy für den entsprechenden Query Provider:

```csharp
class NullsafeQueryProvider : IQueryProvider
{
    private readonly IQueryProvider innerProvider;

    ...

    public IQueryable CreateQuery(Expression expression)
    {
        return innerProvider.CreateQuery(expression).ToNullsafe();
    }

    ...

    public object Execute(Expression expression)
    {
        var rewriter = new NullsafeQueryRewriter();
        expression = rewriter.Visit(expression);

        return innerProvider.Execute(expression);
    }
}
```

Jedes neu zu erzeugende Query wird wieder in einem Proxy verpackt, um eben diesen nicht bei Verkettungen jeglicher Art zu verlieren. Die Operation `ToNullsafe` kann demnach an beliebiger Stelle durchgeführt werden, um auch in nachfolgenden Queries zu greifen. Bei der Ausführung selbst kann schlussendlich ein *Expression Visitor* eingesetzt werden, um "null-checks" einzufügen.

```csharp
class NullsafeQueryRewriter : ExpressionVisitor
{
    protected override Expression VisitMember(MemberExpression node)
    {
        if (node == null || node.Expression == null)
            return node;

        return Expression.Condition(
            Expression.Equal(
                Visit(node.Expression),
                Expression.Default(node.Expression.Type)),
            Expression.Default(node.Type),
            node);
    }
}
```

Entspricht der "linke" Teile eines *Member Access* bereits seinem Default-Wert -- unter Umständen einem bösen "NULL" -- so wird gleich der Default-Wert des eigentlichen Members gewählt (ungefähr so: `x == null ? null : x.y`). Dank des Visit-Mechanismus wird diese gar nicht so schwarze Magie für einen vollständigen *Expression Tree* durchgeführt -- auch rekursiv genannt.

Das lässt sich noch weiter verbessern, indem abhängig vom jeweiligen Typ ein spezieller "Fallback" gewählt wird (z.B. `new List<T>()` für ein "NULL" der Art `IEnumerable<T>`). Wie das funktioniert ist aber eine andere Geschichte...

...die in einem [GitHub Repository][0] nachgelesen werden kann.

[0]: https://github.com/axelheer/nein-linq
