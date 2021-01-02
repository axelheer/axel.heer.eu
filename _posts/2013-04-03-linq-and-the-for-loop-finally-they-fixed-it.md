---
layout: post
post_class: text-post
title: LINQ and the for-loop - finally they fixed it!
tags:
  - Development
  - LINQ
  - CSharp
redirect_from:
  - /post/47032916191/linq-and-the-for-loop-finally-they-fixed-it/
  - /post/47032916191/
---
Eines der nervigsten "Features" von LINQ war (!), dass man bei Verkettungen innerhalb von for-Schleifen ein wenig aufpassen musste: es waren teilweise Statements notwendig, die auf den ersten Blick einen eigentlich eher unnötigen Eindruck machten.

Beispiel:

```csharp
var divisors = new[] { 2, 3, 5, 7 };
var numbers = Enumerable.Range(2, 100);
foreach (var d in divisors) {
    numbers = numbers.Where(n => n % d != 0);
}
foreach (var r in numbers) {
    Console.WriteLine(r);
}
```

Das hat so nicht funktioniert, zumindest nicht so wie es sollte. Die Variable `d`, ein Zeiger auf das aktuelle Iterationselement, wurde als Zeiger auf diesen Zeiger erst zu einem späteren Zeitpunkt aufgelöst. In unserem Fall erst bei der Ausgabe, `d` wäre somit immer gleich 7.

```csharp
var divisors = new[] { 2, 3, 5, 7 };
var numbers = Enumerable.Range(2, 100);
foreach (var d in divisors) {
    var _d = d;
    numbers = numbers.Where(n => n % _d != 0);
}
foreach (var r in numbers) {
    Console.WriteLine(r);
}
```

Das wäre der entsprechende Workaround, der nach wie vor bei älteren C# Versionen notwendig ist. Mittlerweile scheint erstere Version aber auch zu funktionieren. Hurra.

Vor allem Copy & Paste Programmierer sollten hier also aufpassen. ^^
