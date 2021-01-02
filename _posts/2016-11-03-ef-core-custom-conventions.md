---
layout: post
post_class: text-post
title: EF Core - Custom Conventions
tags:
  - Development
  - EntityFramework
  - CSharp
---

Die mit *Entity Framework 6* [eingeführten][0] "Custom Conventions" waren eine sehr sinnvolle Erleichterung, schließlich vereinfachen diese insbesondere eine umfangreiche Code-Basis, reduzieren repetitiven und damit fehleranfälligen Code und helfen, einheitliche Regeln in ein Projekt zu bringen. Konventionen halt.

Diese bzw. eine ähnliche Funktionalität hat es jedoch (noch) nicht in das neue *EF Core* [geschafft][1]. Und wenn der Nachfolger des bereits gewohnten Vorgängers eine lieb gewonnene Funktionalität nicht mehr auf die vertraute Art und Weise zur Verfügung stellt, dann ist das naturgemäß furchtbar, schrecklich und rechtfertigt selbst ansonsten eher [lausige Lösungen][2]. Bevor man also ins frische Wasser springt, sollte ein Blick auf den [offiziellen Vergleich][3] nicht schaden -- es gibt viele neue tolle Sachen, dafür muss teilweise auf alten Stoff verzichtet werden. Fortschritt halt.

Sucht man nach dem gewünschten Feature, so trifft man auf folgenden Eintrag:

> Custom Conventions: *partial*

Wie jetzt? Teilweise, jedoch irgendwie nicht vorhanden?

Sucht man weiter, so stolpert man über eine neue, jedoch unscheinbare Property `Model` vom Typ `IModel` des guten alten `ModelBuilder`. Und siehe da, hier lässt sich so ziemlich alles modifizieren, ohne umständlich von vorgegebenen Basisklassen ableiten zu müssen. Wer will das heutzutage schon? Der aktuelle Zustand kann jedenfalls abseits von *Builder* oder *Convention* Mechanismen direkt manipuliert werden, sollten eben diese Verfahren nicht den Anforderungen genügen. Um der Nostalgie gerecht zu werden, können natürlich die bereits gewohnten Konzepte implementiert werden.

Nostalgie?

```csharp
public interface ICustomConvention
{
    void Apply(ModelBuilder modelBuilder);
}
```

So könnte die Grundlage für eine auf eigenen Attributen aufbauende Konvention aussehen:

```csharp
public abstract class CustomAttributeConvention<T> : ICustomConvention
    where T : Attribute
{
    public void Apply(ModelBuilder modelBuilder)
    {
        if (modelBuilder == null)
            throw new ArgumentNullException(nameof(modelBuilder));

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var entityTypeInfo = entityType.ClrType.GetTypeInfo();

            foreach (var property in entityType.GetProperties())
            {
                var propertyInfo = entityTypeInfo.GetDeclaredProperty(property.Name);

                var attribute = propertyInfo?.GetCustomAttribute<T>();
                if (attribute != null)
                {
                    Apply(attribute, property);
                }
            }
        }
    }

    protected abstract void Apply(T attribute, IMutableProperty property);
}
```

Soll das bereits in *Entity Framework 6* [recht gut funktionierende][4] *Custom Attribute* `DecimalLengthAttribute` genauso im neuen *EF Core* seinen Dienst verrichten, hilft schlussendlich diese Konvention weiter:

```csharp
public class DecimalLengthConvention : CustomAttributeConvention<DecimalLengthAttribute>
{
    protected override void Apply(DecimalLengthAttribute attribute, IMutableProperty property)
    {
        property.Relational().ColumnType = $"decimal({attribute.Precision},{attribute.Scale})";
    }
}
```

Das "Anwenden" der Konvention erfolgt im bekannten `OnModelCreating`.

Nostalgie halt.


[0]: https://msdn.microsoft.com/library/jj819164.aspx
[1]: https://github.com/aspnet/EntityFramework/issues/214
[2]: https://blogs.msmvps.com/ricardoperes/2016/06/12/implementing-missing-features-in-entity-framework-core-part-4-conventions/
[3]: https://docs.efproject.net/en/latest/efcore-vs-ef6/features.html
[4]: /2015/01/04/taming-decimals-with-entity-framework/
