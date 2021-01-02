---
layout: post
post_class: text-post
title: Faster Unit Tests with Entity Framework
tags:
  - Development
  - EntityFramework
  - LINQ
  - CSharp
---
Wie weit auch immer *Entity Framework* (oder ein anderer OR-Mapper) mit einer "datengetriebenen" Anwendung verdrahtet wird (oder eben nicht) -- mit der Zeit sammeln sich haufenweise LINQ-Queries an, die natürlich getestet werden wollen. Was bei einfachen Statements noch trivial erscheinen mag, wird aufgrund unterschiedlicher Verarbeitung von Queries nach einer entsprechenden Übersetzung durch den OR-Mapper (gelinde gesagt) umständlich. In der Regel werden schlussendlich Integrationstests das Mittel der Wahl, die zwar funktionieren, was jedoch seinen Preis (Speed!) hat.

Warum? Meistens sprechen zwei Gründe gegen schnellere *Unit Tests* ohne echte Datenbank im Hintergrund: erstens, ein *SQL Server* wirft nicht mit einer `NullReferenceException` um sich, nur weil er irgendeinen Datensatz nicht finden kann; zweitens, es werden `SqlFunctions` verwendet, die nicht einfach so ausgeführt werden können; drittens, siehe erstens.

Für Ersteres gibt es [eine Lösung][1], [genauso][0] für Zweiteres. Folgender Code ist genau genommen nicht neu, allerdings mit "mehr Kontext": wir werden für `DbSet` ein passendes *Test Double* erstellen. Wird dieses hinter einer mehr oder weniger hübschen Abstraktion versteckt, so funktionieren diese Konzepte wahrscheinlich genauso, vielleicht sogar besser.

Gesagt, getan:

```csharp
public class FakeDbSet<TEntity> : DbSet<TEntity>, IQueryable<TEntity>
    where TEntity : class
{
    private readonly IEnumerable<PropertyInfo> keys;
    private readonly ICollection<TEntity> items;
    private readonly IQueryable<TEntity> query;

    public FakeDbSet()
    {
        keys = typeof(TEntity).GetProperties()
                              .Where(p => Attribute.IsDefined(p, typeof(KeyAttribute))
                                       || "Id".Equals(p.Name, StringComparison.Ordinal))
                              .ToList();

        items = new List<TEntity>();
        query = items.AsQueryable()
                     .ToSubstitution(typeof(SqlFunctions), typeof(FakeDbFunctions))
                     .ToNullsafe();
    }
}
```

Die Objekte werden in einer einfachen, dafür schnellen Liste gehalten. Für Queries werden mittels [NeinLinq][3] sowohl "SQL-Funktionen" ersetzt (`ToSubstitution`) als auch "Null-Checks" eingefügt (`ToNullsafe`), um eher dem Verhalten eines *SQL Servers* zu genügen.

Fehlen noch `DbSet`-Methoden, die ungefähr so aussehen könnten:

```csharp
public override TEntity Remove(TEntity entity)
{
    if (entity == null)
        throw new ArgumentNullException("entity");
    if (keys.Any(k => k.GetValue(entity) == null))
        throw new ArgumentOutOfRangeException("entity");

    var item = items.SingleOrDefault(i =>
        keys.All(k => k.GetValue(entity).Equals(k.GetValue(i)))
    );

    if (item != null)
        items.Remove(item);
    return item;
}
```

Die *LINQ Interfaces* müssen umgeleitet werden, was direkt möglich ist:

```csharp
public IQueryProvider Provider
{
    get { return query.Provider; }
}
```

Und verwendete `SqlFunctions` sollten natürlich ebenso nachgebaut werden:

```csharp
public static class FakeDbFunctions
{
    public static int? CharIndex(string toSearch, string target, int? startLocation)
    {
        if (toSearch == null)
            return null;
        if (target == null)
            return null;

        return target.IndexOf(toSearch, (startLocation ?? 1) - 1,
            StringComparison.CurrentCultureIgnoreCase) + 1;
    }
}
```

Darüber hinaus können asynchrone Queries getestet werden, indem `IDbAsyncEnumerable` auch noch implementiert wird -- Stichwort `Task.FromResult`.

Als kleine Starthilfe ist in [diesem Gist][2] mehr davon zu finden...


[0]: /2014/12/17/replacing-functions-within-linq-queries/
[1]: /2014/02/28/graceful-null-safe-linq-queries/
[2]: https://gist.github.com/axelheer/bdbbd2f92600a45f22d6
[3]: https://www.nuget.org/packages/NeinLinq/
