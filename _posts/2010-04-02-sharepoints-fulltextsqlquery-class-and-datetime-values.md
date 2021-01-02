---
layout: post
post_class: text-post
title: SharePoint's FullTextSqlQuery class and DateTime values
tags:
  - Development
  - SharePoint
  - SQL
  - CSharp
redirect_from:
  - /post/44795931328/sharepoints-fulltextsqlquery-class-and-datetime-values/
  - /post/44795931328/
---
Will man in seiner Abfrage Datumswerte vergleichen bzw. filtern, so wird man leider schmerzlich daran erinnert, dass die Silbe *Sql* aus [FullTextSqlQuery][0] rein gar nichts mit dem *SQL Server* aus den Codeschmieden ein und der selben Firma zu tun hat. Im Gegensatz zu dem guten alten Serverprodukt ist der Parser aus der SharePoint-Familie extrem pingelig, was die Formatierung eines Datums betrifft, welche natürlich in keinster Weise dokumentiert ist.

Dokumentiert ist zugegebenermaßen schon ein bisschen etwas:

```sql
LastModifiedTime <= DATEADD (DAY, -2, DATEADD (HOUR, -4, GETGMTDATE()))
```

Komfortabel. ^^

Der reinste Luxus hingegen ist dann folgende -- nicht dokumentierte -- Variante:

```sql
LastModifiedTime <= '2010-03-30 12:00:00'
```

Mit einem Haken (so viel zum Thema Luxus): die Suchergebnisse werden zwar Zeitzonengerecht aufbereitet, bei dem Query davor wird das jedoch gar nicht berücksichtigt, was bei einem ersten Vergleich der Abfrage mit dem dazu gehörigen Resultat etwas verwirrt.

Übrigens: mit einem T zwischen Datum und Uhrzeit, wie es ja in der Regel bei solchen Systemen üblich ist, wird die Uhrzeit einfach ignoriert. Und genauso verbreitete Kurzschreibweisen wie "20100330" führen zu lustigen -- passender Humor vorausgesetzt -- Fehlermeldungen.

Will man jetzt einfach Datum sowie Uhrzeit wie gewohnt eingeben (lassen) können, so kann man sich mit folgender Hilfsfunktion helfen, welche einfach den gewünschten Wert des Users einliest, um diesen anschließend zu konvertieren (Stichwort: Zeitzonen) und zu formatieren (Stichwort: Syntax):

```csharp
private static string FormatDateValue(string value)
{
    return DateTime.Parse(value, CultureInfo.CurrentCulture)
        .ToUniversalTime().ToString("u", CultureInfo.InvariantCulture);
}
```

Früher noch, wie der *Full Text Catalogue* des SQL Servers verwendet wurde ... das waren Zeiten.

[0]: https://msdn.microsoft.com/library/microsoft.office.server.search.query.fulltextsqlquery
