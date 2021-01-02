---
layout: post
post_class: text-post
title: Generic queries for generic properties
tags:
  - Development
  - EntityFramework
  - LINQ
  - CSharp
redirect_from:
  - /post/50999474301/generic-queries-for-generic-properties/
  - /post/50999474301/
---
Werden Entitäten mit Schnittstellen dekoriert, die gewisse Eigenschaften, jedoch nicht deren Typ festlegen, um dazu passende generische Queries zu schreiben, so kann das dem *Entity Framework* einfach zu skurril werden. Und skurril klingt das jetzt auch ein wenig.

Um nicht gleich alle Klarheiten zu beseitigen, soll folgendes abstrakte, dafür minimale Beispiel die Voraussetzungen abstecken:

```csharp
public interface IHasProp<T> {
    T Prop { get; set; }
}

public class Whatever : IHasProp<string> {
    public int Id { get; set; }
    public string Prop { get; set; }
}
```

Soll ja mal vorkommen. Ebenso wie eine generische Hilfsmethode, die der Einfachheit halber alle Elemente mit einem für `Prop` gegebenen Wert selektiert:

```csharp
public static IQueryable<T> WherePropEquals<T, TProp>(this IQueryable<T> query, TProp value)
    where T : class, IHasProp<TProp> {
    return query.Where(t => t.Prop.Equals(value));
}
```

Fehler!

> Unable to create a constant value of type 'System.Object'. Only primitive types or enumeration types are supported in this context.

Vielleicht von der anderen Seite?

```csharp
public static IQueryable<T> WherePropEquals<T, TProp>(this IQueryable<T> query, TProp value)
    where T : class, IHasProp<TProp> {
    return query.Where(t => value.Equals(t.Prop));
}
```

Auch nicht.

> Unable to cast the type 'System.String' to type 'System.Object'. LINQ to Entities only supports casting EDM primitive or enumeration types.

Der C#-Compiler scheint den Expression Tree direkt mittels `Object.Equals` aufzubauen, was dem *Entity Framework* leider überhaupt nicht schmeckt. Im Detail wird der dem Parameter `t` gegenübergestellte Wert sogar implizit auf `Object` gecastet, was die entsprechende Expression ungefähr wie folgt aussehen lässt:

```
.Lambda #Lambda1<System.Func`2[GenericEntity.Whatever,System.Boolean]>(GenericEntity.Whatever $t) {
    .Call ($t.Prop).Equals((System.Object).Constant(c__DisplayClass0`2[GenericEntity.Whatever,System.String]).value)
}
```

Naja. Das können wir doch besser.

```csharp
public static IQueryable<T> WherePropEquals<T, TProp>(this IQueryable<T> query, TProp value)
    where T : class, IHasProp<TProp> {
    var t = Expression.Parameter(typeof(T), "t");
    var predicate = Expression.Lambda<Func<T, bool>>(
        Expression.Equal(Expression.Property(t, "Prop"), Expression.Constant(value)), t);
    return query.Where(predicate);
}
```

Der zur Laufzeit generierte Expression Tree fällt deutlich schlanker aus...

```
.Lambda #Lambda1<System.Func`2[GenericEntity.Whatever,System.Boolean]>(GenericEntity.Whatever $t) {
    $t.Prop == "..."
}
```

...und wird vom *Entity Framework* auch erfolgreich verarbeitet.

Noch eine kleine Bemerkung: in diesem konkreten Beispiel wäre sogar, da hier leicht zusätzliche Einschränkungen in Kauf zu nehmen sind, ein eleganterer Weg möglich, um das *Entity Framework* glücklich zu machen.

```csharp
public interface IHasProp<T>
    where T : IEquatable<T> {
    T Prop { get; set; }
}

public class Whatever : IHasProp<string> {
    public int Id { get; set; }
    public string Prop { get; set; }
}

public static IQueryable<T> WherePropEquals<T, TProp>(this IQueryable<T> query, TProp value)
    where T : class, IHasProp<TProp>
    where TProp : IEquatable<TProp> {
    return query.Where(t => t.Prop.Equals(value));
}
```

Das generische -- um dieses Vokabel hiermit endgültig überzustrapazieren -- Interface `IEquatable` sorgt für ein Verschwinden des zu Beginn besprochenen impliziten Casts auf `Object`. Sollte eine derartige Lösung möglich sein, so ist sie natürlich zu bevorzugen.

Wenn da nicht immer diese Abhängigkeiten wären...
