---
layout: post
post_class: text-post
title: Taming Decimals with Entity Framework
tags:
  - Development
  - EntityFramework
  - SQL
  - CSharp
---
Für so ziemlich jede häufig genutzte Konfigurationsmöglichkeit eines Feldes in *Entity Framework* gibt es mehr oder wenige Attribute, die einem die Nutzung der *Fluent API* ersparen können. Schließlich werden Attribute auch von anderen Frameworks unterstützt (man muss nicht doppelt und dreifach konfigurieren), es ist alles auf einen Blich sichtbar (das ist toll, wirklich!) und separate Konfigurationsklassen werden obsolet. Jedoch gibt es einen beliebten Datentyp, für den nach wie vor Widerstand geleistet wird: *Decimal*.

Dessen Standardwerte für *Precision* bzw. *Scale* sind in den seltensten Fällen wirklich passend, werden aber meistens verwendet, da eben kein simples Attribut zur Verfügung steht, um sinnvolle Werte zu vergeben. Her damit:

```csharp
public class DecimalLengthAttribute : ValidationAttribute
{
    public byte Precision { get; private set; }

    public byte Scale { get; private set; }

    public DecimalLengthAttribute(byte precision, byte scale)
    {
        Precision = precision;
        Scale = scale;
    }

    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        var number = new SqlDecimal(((decimal?)value) ?? 0m);

        if (number.Precision > Precision)
            return new ValidationResult(string.Format(CultureInfo.CurrentCulture,
                "'{0}' does not fit within the specified precision of {1}.", value, Precision));

        if (number.Scale > Scale)
            return new ValidationResult(string.Format(CultureInfo.CurrentCulture,
                "'{0}' does not fit within the specified scale of {1}.", value, Scale));

        return ValidationResult.Success;
    }
}
```

Wie bereits in einem [anderen Post][0] demonstriert, ist derartiges sehr einfach zu implementieren, die Metriken für *Decimals* können darüber hinaus von den guten alten ADO.NET Strukturen für SQL geborgt werden. Damit alleine wird zwar noch nicht die eigentliche Datenbank modifiziert, eine Entität kann allerdings bereits entsprechend validiert werden:

```csharp
public class Model
{
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; }

    [DecimalLength(4, 2)]
    public decimal Number { get; set; }

    [DecimalLength(8, 3)]
    public decimal? OtherNumber { get; set; }
}
```

Und für das SQL Schema genügt eine Konvention:

```csharp
protected override void OnModelCreating(DbModelBuilder modelBuilder)
{
    modelBuilder.Properties<decimal>()
                .Having(p => p.GetCustomAttribute<DecimalLengthAttribute>())
                .Configure((c, a) => c.HasPrecision(a.Precision, a.Scale));

    modelBuilder.Properties<decimal?>()
                .Having(p => p.GetCustomAttribute<DecimalLengthAttribute>())
                .Configure((c, a) => c.HasPrecision(a.Precision, a.Scale));
}
```

Na gut, zwei Konventionen.

[0]: /2014/09/27/iban-validation-done-right/
