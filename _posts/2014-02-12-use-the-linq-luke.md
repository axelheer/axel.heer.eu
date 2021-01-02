---
layout: post
post_class: text-post
title: Use the LINQ, Luke!
tags:
  - Development
  - LINQ
  - CSharp
redirect_from:
  - /post/76438342400/use-the-linq-luke/
  - /post/76438342400/
---
Das für IT-Verhältnisse steinalte LINQ (sowas von 2007!) lässt einen schnell vergessen -- wenn nicht sogar verdrängen --, wie "codeaufwändig" das Verarbeiten von Collections bzw. Collection-artigen Datenstrukturen anno dazumal bewerkstelligt werden musste. Ganz zu schweigen von dem einen oder anderen gelenkschonenden Query provider für SQL, XML, oder was auch immer...

Jetzt gibt es aber nach wie vor solch gewöhnliche Objekte, die mit einer Collection auf den ersten Blick nicht so viel gemeinsam haben; die auf denselben Blick nach wie vor mit klassischen Programmierkonstrukten (sowas von 20. Jahrhundert!) bearbeitet werden wollen, aber nicht unbedingt müssen, ein wenig Getrickse vorausgesetzt.

Beispiel:

```csharp
try {
    // let's violate an unique index...
}
catch (Exception ex) {
    var errors = new List<int>();

    var current = ex;
    while (current != null) {
        var sqlEx = ex as SqlException;
        if (sqlEx != null) {
            foreach (SqlError error in sqlEx.Errors) {
                errors.Add(error.Number);
            }
        }
        current = current.InnerException;
    }

    if (errors.Contains(2601)) {
        // Unique constraint violation!
    }
}
```

Naja. Eine Exception hat nun mal eine `InnerException`, welche an der einen oder anderen Stelle eine `SqlException` sein könnte, die wiederum zumindest einen Fehler enthalten sollte. Die Fehlernummer 2601 würde eine eventuell zu behandelnde Indexverletzung bedeuten.

Mit LINQ:

```csharp
try {
    // let's violate an unique index...
}
catch (Exception ex) {
    var errors = ex.Flatten(e => e.InnerException)
                   .OfType<SqlException>()
                   .SelectMany(s => s.Errors.Cast<SqlError>());

    if (errors.Any(e => e.Number == 2601)) {
        // Unique constraint violation!
    }
}
```

Noch ein Beispiel:

```csharp
public void SetReadOnlyRecursive(Control control, bool value) {
    foreach (Control child in control.Controls) {
        SetReadOnlyRecursive(child, value);
    }

    var textBox = control as TextBoxBase;
    if (textBox != null) {
        textBox.ReadOnly = value;
    }
}
```

Der Code ist so richtig *Old School*. Wer hat derartiges nicht schon einmal geschrieben?

Mit LINQ:

```csharp
control.Flatten(c => c.Controls.Cast<Control>())
       .OfType<TextBoxBase>()
       .Each(t => t.ReadOnly = true);
```

Womit eigentlich nur noch die Sache mit dem Getrickse geklärt werden muss -- *Extension Methods* wie `Flatten` oder `Each` sind im .NET Framework grundsätzlich nicht vorgesehen.

Kurzum:

```csharp
public static IEnumerable<T> Flatten<T>(this T value, Func<T, T> inner) {
    var comparer = EqualityComparer<T>.Default;
    while (!comparer.Equals(value, default(T))) {
        yield return value;
        value = inner(value);
    }
}

public static IEnumerable<T> Flatten<T>(this T value, Func<T, IEnumerable<T>> inner) {
    foreach (var i in inner(value)) {
        foreach (var j in Flatten(i, inner)) {
            yield return j;
        }
    }
    yield return value;
}

public static IEnumerable<T> Each<T>(this IEnumerable<T> items, Action<T> action) {
    foreach (var i in items) {
        action(i);
    }
    return items;
}
```

Und das sind nur Beispiele, um ein wenig LINQ-Fantasien anzuregen.
