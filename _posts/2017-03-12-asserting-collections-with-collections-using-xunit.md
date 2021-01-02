---
layout: post
post_class: text-post
title: Asserting Collections with Collections using xUnit
tags:
  - Development
  - CSharp
---

Werden im *Assert* Abschnitt eines Unit Tests ganze Collections überprüft, so bietet [xUnit][0] out-of-the-box ein paar elegante Möglichkeiten diese zu validieren. Insbesondere im Fehlerfall hilft der Output oft den kaputten Datensatz direkt zu identifizieren, wobei das mit der Ursache natürlich eine andere Geschichte ist...

Beispiel:

```csharp
[Fact]
public void ShouldDoIt()
{
    var actual = ...

    Assert.Collection(actual,
    a =>
    {
        Assert.Equal("Narf", a.Name);
        Assert.True(a.Active);
    },
    a =>
    {
        Assert.Equal("Asdf", a.Name);
        Assert.False(a.Active);
    });
}
```

Passt ein Wert des zweiten Elements nicht, so bekommt man das in der Regel relativ detailliert mitgeteilt:

```
Error Message:
 Assert.Collection() Failure
Collection: [{ Name = Narf, Active = True }, { Name = Asdf, Active = True }]
Error during comparison of item at index 1
Inner exception: Assert.False() Failure
        Expected: False
        Actual:   True
```

Hat man das gewünschte Ergebnis auch in Form einer Collection zur Verfügung, so hilft einem wie gewohnt `Assert.Equal` weiter, das nicht nur mit einfachen Objekten, sondern genauso mit Collections umgehen kann. Sogar eine Überladung für einen mehr oder weniger speziellen `IEqualityComparer` steht zur Verfügung.

```csharp
[Fact]
public void ShouldDoIt()
{
    var expected = ...

    var actual = ...

    Assert.Equal(expected, actual);
}
```

Handelt es sich jedoch um inkompatible Strukturen -- werden beispielsweise *Models* mit *View Models* verglichen --, so wird oft in der einen oder anderen Art und Weise iteriert, wodurch neben einer gewissen Eleganz eben jene Zusatzinfos im Fehlerfall verloren gehen. Ohne das Anwerfen eines Debuggers ist es dann nicht mehr wirklich nachvollziehbar, welches Element auf einmal Mist beinhaltet.

Dabei lässt sich `Assert.Collection` mit einem einfachen Trick auch dafür benutzen.

```csharp
public static class TestExtensions
{
    public static void AssertWith<TExpected, TActual>(this IEnumerable<TActual> actual, IEnumerable<TExpected> expected, Action<TExpected, TActual> inspector)
    {
        Assert.Collection(actual, expected.Select(e => (Action<TActual>)(a => inspector(e, a))).ToArray());
    }
}
```

Mittels *LINQ* bzw. ein wenig funktionaler Programmierung wird das "expected" gemeinsam mit einem allgemein gültigen "Inspector" in ein mit `Assert.Collection` kompatibles Inspector-Array umgewandelt, was sich wie folgt anwenden lässt.

```csharp
[Fact]
public void ShouldDoIt()
{
    var expected = ...

    var actual = ...

    actual.AssertWith(expected, (e, a) =>
    {
        Assert.Equal(e.Name, a.Name);
        Assert.Equal(e..., a.Active);
    });
}
```

Bei Bedarf kann das sogar beliebig verschachtelt werden.

[0]: https://xunit.github.io/
