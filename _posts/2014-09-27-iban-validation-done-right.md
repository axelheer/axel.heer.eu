---
layout: post
post_class: text-post
title: IBAN Validation - done right
tags:
  - Development
  - Regex
  - CSharp
---
Um wieder *Reguläre Ausdrücke* zu bemühen und auch gleich mit dem im .NET Framework bereits seit längerem vorhandenen `ValidationAttribute` zu kombinieren, bietet sich eine IBAN-Validierung an. Klingt einfach, ist es aber nur ein wenig -- viele Implementierungen nehmen auf "längere" IBANs (Frankreich, Malta, ...) genauso wenig Rücksicht wie auf IBANs mit Buchstaben (Großbritannien, Niederlande, ...).

Starten wir mit der grundsätzlichen Struktur so einer "Nummer": sie wird in Länderkürzel, Prüfziffer sowie der Kontoidentifikation unterteilt, wie leicht [nachgelesen][0] werden kann, welche für eine Validierung extra in Position gebracht werden müssen. Gültige [Beispiele][1] schaden übrigens auch nicht, um den ganzen Mechanismus testen zu können (soll ja mal vorkommen). Der entsprechende *Reguläre Ausdruck* gestaltet sich somit relativ einfach, er besteht aus drei passenden Gruppen, die sowohl beim Lesen als auch beim Verarbeiten helfen sollen.

```csharp
public class IbanAttribute : ValidationAttribute
{
    private static readonly Regex pattern
        = new Regex(@"^(?<l>[A-Z]{2})(?<p>[0-9]{2})(?<n>[0-9A-Z]{8,30})$");

    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        if (value == null)
            return ValidationResult.Success;

        var match = pattern.Match(value.ToString());

        if (!match.Success)
            return new ValidationResult(string.Format(
                "'{0}' entspricht keinem gültigen IBAN-Format.", value));

        var number = string.Concat(match.Groups["n"].Value,
                                   match.Groups["l"].Value,
                                   match.Groups["p"].Value);

        /* validate number */
    }
}
```

Die Variable `number` enthält also alle Ziffern und Buchstaben in der für die Validierung notwendigen Reihenfolge, wobei dank *Regex* keine bösen Überraschungen zu erwarten sind. Laut Spezifikation muss diese Nummer modulo 97 gleich 1 ergeben, wobei Buchstaben nach ihrer Position im Alphabet plus 10 bewertet werden. Und schon kommt der Clou: ein wenig Getrickse vorausgesetzt ist kein Parsen oder dergleichen notwendig. Versucht man nämlich einen Lösungsweg mittels `ulong.Parse` / `decimal.Parse` / `whatever.Parse` zu finden, so gerät man -- zumindest mit nicht österreichischen IBANs -- schnell in des Teufels Küche (Länge / Buchstaben), abgesehen von hässlichen (neudeutsch: unschönen) Sonderbehandlungen der Länderkürzel.

Zum versprochenen Getrickse: *321 mod 3 = (3 × 10 + 2) × 10 + 1) mod 3 = ((((3 mod 3) × 10 + 2) mod 3) × 10 + 1) mod 3*. Wir können also "ziffern- bzw. buchstabenweise" operieren, wie wir es eigentlich von der händischen Division gewohnt sind; die "Nummer" kann infolgedessen ohne Weiteres eine sehr lange Zeichenkette sein...

```csharp
public class IbanAttribute : ValidationAttribute
{
    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        /* create number */

        var check = 0;

        foreach (var c in number)
        {
            if ('0' <= c && c <= '9')
            {
                var v = c - '0';
                check = (check * 10 + v) % 97;
            }
            if ('A' <= c && c <= 'Z')
            {
                var v = c - 'A' + 10;
                check = (check * 100 + v) % 97;
            }
        }

        return check == 1
            ? ValidationResult.Success
            : new ValidationResult(String.Format(
                "'{0}' beinhaltet keine gültige IBAN-Prüfsumme.", value));
    }
}
```

Kontrolle gefällig?

```csharp
public class IbanTest
{
    private readonly IbanAttribute iban = new IbanAttribute();

    [Theory]
    [InlineData("Deutschland", "DE12500105170648489890")]
    [InlineData("Frankreich", "FR7630066100410001057380116")]
    [InlineData("Großbritannien", "GB96MIDL40271522859882")]
    [InlineData("Österreich", "AT131490022010010999")]
    /* more test data */
    public void IbanShouldBeValid(string country, string value)
    {
        var result = iban.IsValid(value);

        Assert.True(result);
    }
}
```

Ein Negativ-Test mit ungültigen IBANs sei als Übung überlassen.


[0]: https://de.wikipedia.org/wiki/IBAN
[1]: https://www.iban-bic.com/sample_accounts.html
[2]: https://de.wikipedia.org/wiki/Distributivgesetz
