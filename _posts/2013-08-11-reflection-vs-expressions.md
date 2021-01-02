---
layout: post
post_class: text-post
title: Reflection vs. Expressions
tags:
  - Development
  - LINQ
  - CSharp
redirect_from:
  - /post/57972201578/reflection-vs-expressions/
  - /post/57972201578/
---
Hin und wieder kommt ein .NET-Entwickler in die Verlegenheit, mehr oder weniger dynamisch mit Objekten hantieren zu müssen. Seit der allerersten Version kann und wird hier in der Regel [Reflection][0] genutzt, für in Sachen Performance auch ansehnliche Lösungen greift man auf das etwas weniger triviale [Reflection Emit][1] zurück. Mittlerweile werden jedoch immer öfter die mit [LINQ][2] eingeführten [Expression Trees][3] genutzt, um "dynamische" Szenarien zu meistern -- diese sind sicherer, flexibler, eleganter und einfach nur cool.

Doch wie sieht es mit der Geschwindigkeit aus?

Um diese ein wenig abschätzen zu können, sei eine einfache Klasse zum direkten Setzen einer Property zu implementieren -- sowohl mittels Reflection als auch mit Expressions. Und das in einer "praxisnahen" Implementierung (= straightforward). Das macht auf den ersten Blick nicht allzu viel Sinn, soll aber auch nur die Messung der Laufzeit eines oft umgesetzten Musters (lesen/schreiben von Eigenschaften) ermöglichen...

Zu Beginn benötigen wir jedoch eine Art Referenz, also eine vermeintlich optimale Lösung (wenn es so einfach wäre, würde (hoffentlich) niemand auf etwas dynamisches zurückgreifen wollen....):

```csharp
class DirectMapper {
    private readonly Something target;

    public DirectMapper(Something target) {
        this.target = target;
    }

    public void Set(string value) {
        target.Value = value;
    }
}
```

Wird die Methode `Set` 1.000.000 mal aufgerufen, so dauert das bei mir gewaltige 5 ms.

```csharp
class ReflectionMapper {
    private readonly object target;
    private readonly Type targetType;

    public ReflectionMapper(object target) {
        this.target = target;
        this.targetType = target.GetType();
    }

    public void Set(string name, object value) {
        var prop = targetType.GetProperty(name);
        prop.SetValue(target, value);
    }
}
```

Dynamisch, aber um über einen Faktor 65 langsamer: 327 ms.

```csharp
class ExpressionMapper<T> {
    private readonly T target;

    public ExpressionMapper(T target) {
        this.target = target;
    }

    public void Set<U>(Expression<Func<T, U>> path, U value) {
        var param = Expression.Parameter(typeof(U));
        var expr = Expression.Lambda<Action<T, U>>(
            Expression.Assign(
                path.Body,
                param),
            path.Parameters[0], param);
        var assign = expr.Compile();
        assign(target, value);
    }
}
```

Super, die Laufzeit verursacht jedoch Schmerzen: 95.108 ms.

Damn! Lässt sich das schnell und einfach verbessern? Naja, Expressions sind leider nicht "vergleichbar". Auf Deutsch: `GetHashCode` liefert irgendwas und `Equals` arbeitet nur auf Basis von Referenzen. Ein einfaches Dictionary für kompilierte Lambdas ist also nicht möglich. Schade.

Eine Kombination aus beiden Welten führt zu folgender (eingeschränkten) Variante:

```csharp
class CombinedMapper<T> {
    private readonly T target;

    public CombinedMapper(T target) {
        this.target = target;
    }

    public void Set<U>(Expression<Func<T, U>> path, U value) {
        var expr = (MemberExpression)path.Body;
        var prop = (PropertyInfo)expr.Member;
        prop.SetValue(target, value);
    }
}
```

Ein Kompromiss, der allerdings noch immer 2.794 ms benötigt.

Fazit: analog zu *Reflection Emit* sollten Mechanismen gewählt werden, welche ein wenig Vorarbeit leisten, um dann nicht bei jedem Aufruf *Expressions* verarbeiten zu müssen.

[0]: https://msdn.microsoft.com/library/system.reflection
[1]: https://msdn.microsoft.com/library/system.reflection.emit
[2]: https://msdn.microsoft.com/library/system.linq
[3]: https://msdn.microsoft.com/library/system.linq.expressions
