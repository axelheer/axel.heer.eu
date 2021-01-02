---
layout: post
post_class: text-post
title: Implementing UPSERT using LINQ
tags:
  - Development
  - LINQ
  - EntityFramework
  - CSharp
---
Eigentlich bietet *Entity Framework* von Haus aus einen Mechanismus namens [AddOrUpdate][0], der sich im *Migrations* Namespace versteckt, jedoch befindet sich dieser irgendwie zu Recht auf Tauchstation -- beispielsweise werden nicht einmal Nullables unterstützt. Dabei handelt es sich nun wirklich nicht um Raketenwissenschaft (die mittlerweile sogar [Raketen auf Drohnen landen][1] lässt!), schließlich müssen nur die *Primary keys* extrahiert sowie die "Alternate keys" verglichen werden. Fehlt nur noch eine einfache Fallunterscheidung und wir sind fertig.

Der Reihe nach: die Primärschlüssel sind einmal eine Fingerübung.

```csharp
private static PropertyInfo[] PrimaryKeys<TEntity>()
    where TEntity : class
{
    return typeof(TEntity).GetProperties()
                          .Where(p => Attribute.IsDefined(p, typeof(KeyAttribute))
                                   || "Id".Equals(p.Name, StringComparison.Ordinal))
                          .ToArray();
}
```

Sollen die semantischen Schlüssel aka *Identifier expressions* analog zum Vorbild mittels Lambda-Ausdruck und optional in einem anonymen Objekt übergeben werden können? Also `.AddOrUpdate(m => m.Name, ...)` für "einfache" bzw. `.AddOrUpdate(m => new { m.Name, m.OtherId }, ...)` für "mehrfache" Varianten, dann müssen wir uns wieder einmal mit *Expressions* spielen.

```csharp
private static PropertyInfo[] Properties<TEntity>(Expression<Func<TEntity, object>> identifiers)
    where TEntity : class
{
    // e => e.SomeValue
    var direct = identifiers.Body as MemberExpression;
    if (direct != null)
    {
        return new[] { (PropertyInfo)direct.Member };
    }

    // e => (object)e.SomeValue
    var convert = identifiers.Body as UnaryExpression;
    if (convert != null)
    {
        return new[] { (PropertyInfo)((MemberExpression)convert.Operand).Member };
    }

    // e => new { e.SomeValue, e.OtherValue }
    var multiple = identifiers.Body as NewExpression;
    if (multiple != null)
    {
        return multiple.Arguments
                       .Cast<MemberExpression>()
                       .Select(a => (PropertyInfo)a.Member)
                       .ToArray();
    }

    throw new NotSupportedException();
}
```

Wie oben zu sehen ist, haben wir genau genommen sogar drei Varianten, da *Boxing*/*Unboxing* hier auch ein Thema ist, das sich in einem zusätzlichen *Cast* auf *Object* bemerkbar macht. *Value types* werden in dieser Situation explizit in einer *Unary expression* auf *Object* konvertiert, was bei gewöhnlichem Code implizit passiert, hier jedoch extra berücksichtigt werden muss.

Letztendlich können wir unsere Entitäten entsprechend mergen, wofür wir noch einmal *Expressions* bemühen dürfen, um die dazu passende *Where clause* aufbauen zu können. Dafür ist für jede *Property* eine konstante *Equal expression* zu erstellen, welche mittels logischem *And also* an den vorherigen Ausdruck gehängt wird -- *Aggregate* macht's <s>möglich</s> elegant.

```csharp
public static void AddOrUpdate<TEntity>(this DbContext context,
    Expression<Func<TEntity, object>> identifiers,
    params TEntity[] entities)
    where TEntity : class
{
    var primaryKeys = PrimaryKeys<TEntity>();
    var properties = Properties<TEntity>(identifiers);

    for (var i = 0; i < entities.Length; i++)
    {
        // build where condition for "identifiers"
        var parameter = Expression.Parameter(typeof(TEntity));
        var matches = properties.Select(p => Expression.Equal(
            Expression.Property(parameter, p),
            Expression.Constant(p.GetValue(entities[i]), p.PropertyType)));
        var match = Expression.Lambda<Func<TEntity, bool>>(
            matches.Aggregate((p, q) => Expression.AndAlso(p, q)),
            parameter);

        // match "identifiers" for current item
        var current = context.Set<TEntity>().SingleOrDefault(match);
        if (current != null)
        {
            // update primary keys
            foreach (var k in primaryKeys)
                k.SetValue(entities[i], k.GetValue(current));

            // update all the values
            context.Entry(current).CurrentValues.SetValues(entities[i]);

            // replace updated item
            entities[i] = current;
        }
        else
        {
            // add new item
            entities[i] = context.Set<TEntity>().Add(entities[i]);
        }
    }
}
```

Das ursprüngliche Array wird übrigens mit frischen Proxy-Objekten aktualisiert, damit *Entity Framework* bei weiteren Operationen nicht analog zum Original völlig durcheinander kommt.


[0]: https://msdn.microsoft.com/library/hh846520.aspx
[1]: https://edition.cnn.com/2016/04/08/tech/spacex-historic-rocket-landing-irpt/
