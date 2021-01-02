---
layout: post
post_class: text-post
title: ...fun with regex?
tags:
  - Development
  - Regex
  - CSharp
---
Die moderne Welt der Softwareentwicklung kann noch so high sophisticated sein, man kommt dennoch immer wieder in die Verlegenheit, einen eigentlich relativ einfachen String zu verarbeiten, wobei der direkte Weg in der Regel eine Kombination aus *Split*/*IndexOf*/*Substring*/*Und-so-weiter* darstellt. Das sieht meistens nicht so toll aus und ist darüber hinaus oft fehleranfällig -- eine Klammer wird fälschlicherweise übersprungen, ein Komma verirrt sich in einen eigentlich numerischen Wert, etc.

Wenn da nicht die guten alten [regulären Ausdrücke][0] wären. Sie sehen zwar auf den ersten Blick furchtbar kompliziert aus, werden jedoch nach einer kurzen bis weniger kurzen Einarbeitungszeit zu einem unglaublich hilfreichen Hilfsmittel (Hilfe!).

Beispiel:

```csharp
"Bearbeiter;Leiter(Gruppe=1,Gruppe=3);Wissender(Thema=3,Thema=6,Thema=8);Verkäufer(Kunde=6)"
```

Eine `;`-separierte Liste von Rollen, welche wiederum eine `,`-separierte Liste an Zusätzen enthalten kann, die schlussendlich eingeklammert werden muss, will verarbeiten werden. Die dazu passende *Regex* kann durchaus länger ausfallen, aber auch das lässt sich ein wenig strukturiert aufbauen.

Wir beginnen von innen nach außen: die Zusätze entsprechen `(?<key>\w+)=(?<val>\w+)`, also zwei [Named capturing groups][1], welche aufgrund ihres Namens leicht referenziert werden können. Eingeklammert entsteht `\(...(?:,...)*)\`, womit ein einmaliges Auftreten inkl. optionalen mit `,` beginnenden Wiederholungen gemeint ist. Eine Gruppe mit `(?:` einzuleiten bedeutet übrigens, diese explizit nicht referenzieren zu wollen (Performance!), auch *Non-capturing group* genannt.

Die Rolle selbst besteht verpflichtend aus einem Namen sowie optionalen Zusätzen, kurzum `(?<role>(?<name>\w+)(?:...)?)`. Für Zusätze wird wieder eine *Non-capturing group* verwendet, um diese ganz einfach ohne allzu viel Overhead als optional markieren zu können. Wir beginnen also bereits jetzt nur mehr mit Wasser zu kochen, die Skalierung auf mehrere Rollen funktioniert nach demselben Schema...

```csharp
static readonly Regex pattern = new Regex(@"^
    (?<role>
        (?<name>\w+)                              # 1. Rolle
        (?:
            \(
                (?<key>\w+)=(?<val>\w+)           # 1. Zusatz
                (?:
                    ,(?<key>\w+)=(?<val>\w+)      # 2. bis n. Zusatz
                )*
            \)
        )?
    )
    (?:
        ;(?<role>
            (?<name>\w+)                          # 2. bis n. Rolle
            (?:
                \(
                    (?<key>\w+)=(?<val>\w+)       # 1. Zusatz
                    (?:
                        ,(?<key>\w+)=(?<val>\w+)  # 2. bis n. Zusatz
                    )*
                \)
            )?
        )
    )*
$", RegexOptions.Compiled | RegexOptions.IgnorePatternWhitespace);
```

Bringt man ein wenig Struktur hinein, so sieht es im Grunde wie ganz normaler Code aus. Und das ist es ja eigentlich auch. Will man dessen ungeachtet seinen lieben Arbeitskollegen wohlverdiente Schmerzen bereiten, kann man diesen "Ausdruck" auch auf den berühmten Einzeiler reduzieren...

Und um das Ganze noch zu einem zeitgemäßen Abschluss zu bringen, verarbeiten wir das Resultat der *Regex* mittels *LINQ*, um im Rahmen dieses Beispiels einfache anonyme Objekte zu generieren:

```csharp
var data = match.Captures("role")
                .Select(r =>
    {
        var name = match.Captures("name")
                        .Within(r)
                        .Single();
        var keys = match.Captures("key")
                        .Within(r)
        var vals = match.Captures("val")
                        .Within(r)
        return new
        {
            Role = name.Value,
            Data = keys.Zip(vals, (k, v) =>
                new { Key = k.Value, Value = v.Value }
            )
        };
    });
```

Da die *Regex* API vor der Ära *LINQ* entstanden ist, muss man sich allerdings mit zwei selbstgestrickten *Extension methods* helfen, um den Code ein wenig lesbarer zu gestalten. `Captures` soll schlichtweg den Umweg über zwei *Collections* abkürzen, während `Within` die notwendigen Indexvergleiche auslagert.

```csharp
public static IEnumerable<Capture> Captures(this Match match, string groupName)
{
    return match.Groups[groupName].Captures.Cast<Capture>();
}
    
public static IEnumerable<Capture> Within(this IEnumerable<Capture> captures, Capture outer)
{
    return captures.Where(c => outer.Index <= c.Index && c.Index <= outer.Index + outer.Length);
}
```

Na gut. Vielleicht werden es das nächste mal doch wieder gewöhnliche String-Operationen.

[0]: https://www.regular-expressions.info/
[1]: https://www.regular-expressions.info/refext.html
