---
layout: post
post_class: text-post
title: DisplayAttribute & Enums (with Flags!)
tags:
  - Development
  - CSharp
redirect_from:
  - /post/83721070664/displayattribute-enums-with-flags/
  - /post/83721070664/
---
Oft sollten Werte einer *Enum* in einem UI etwas anders dargestellt werden als es im eigentlichen Code vorgesehen ist -- sei es aus syntaktischen, mehrsprachlichen oder welchen Gründen auch immer. Für derartige Zwecke dürfte sich mittlerweile das erst seit .NET 4.0 verfügbare [DisplayAttribute][0] durchgesetzt haben, entsprechend viele Anleitungen zur Verwendung mit *Enums* sind via Websuche zu finden...

Möchte man jedoch ein wenig mit Bitmasken (Stichwort [FlagsAttribute][1]) arbeiten, so scheinen die allgemeinen Ansätze nicht wirklich zu funktionieren. Die Hilfsmethoden der Klasse [Enum][2] erweisen sich als alles andere als hilfreich, einzig ein Aufruf von `ToString` scheint überhaupt im Rahmen einer Ausgabe mit "Flags" umgehen zu können. Ein Mechanismus analog zu [Enum.InternalFlagsFormat][3] ist hier wohl notwendig.

Eine Klasse `EnumHelper` (oder so) müsste die richtigen Namen eines Wertes herausfinden:

```csharp
private static IEnumerable<string> getNames(Type type, Enum value)
{
    var result = new List<string>();

    var bits = Convert.ToUInt64(value);
    var values = Enum.GetValues(type);
    var names = Enum.GetNames(type);

    for (var i = values.Length - 1; i >= 0; i--)
    {
        var mask = Convert.ToUInt64(values.GetValue(i));
        if ((bits & mask) == mask)
        {
            result.Insert(0, names[i]);
            bits = bits ^ mask;
            if (bits == 0)
                break;
        }
    }

    return result;
}
```

Die gesetzten Bits des Wertes werden der Größe nach mit den Elementen einer *Enum* verglichen, wobei getroffene Bits sofort aus dem Wert entfernt werden, um Dubletten zu verhindern. Sollte es sich gar nicht um eine Bitmaske handeln, ist eben nur ein Treffer zu erwarten. Auch gut.

Im Anschluss kann wie gewohnt das `DisplayAttribute` -- sofern vorhanden -- gelesen werden, um den Ansprüchen des Users des UIs gerecht zu werden:

```csharp
private static IEnumerable<string> getDisplayNames(Type type, Enum value)
{
    var result = new List<string>();

    foreach (var name in getNames(type, value))
    {
        var display = type.GetField(name)
            .GetCustomAttribute<DisplayAttribute>();
        if (display != null)
            result.Add(display.GetName());
        else
            result.Add(name);
    }

    return result;
}
```

Die eigentliche Hilfsmethode oder *Extension Method* ist dann trivial:

```csharp
public static string DisplayName(this Enum value)
{
    if (value == null)
        throw new ArgumentNullException("value");

    return string.Join(", ", getDisplayNames(value.GetType(), value));
}
```

Oder so.

[0]: https://msdn.microsoft.com/library/system.componentmodel.dataannotations.displayattribute
[1]: https://msdn.microsoft.com/library/system.flagsattribute
[2]: https://msdn.microsoft.com/library/system.enum
[3]: https://referencesource.microsoft.com/mscorlib/R/93a0c65b8141e010.html
