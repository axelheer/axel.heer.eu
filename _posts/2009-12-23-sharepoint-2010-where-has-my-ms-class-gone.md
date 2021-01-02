---
layout: post
post_class: text-post
title: SharePoint 2010 - where has my ms-* class gone?
tags:
  - Development
  - SharePoint
  - CSharp
redirect_from:
  - /post/44797036205/sharepoint-2010-where-has-my-ms-class-gone/
  - /post/44797036205/
---
Um in SharePoint Modulen und Applikationen soweit wie möglich mit den unterschiedlichsten Themes und StyleSheet-Anpassungen konform zu sein, hat es sich ja immer geradezu angeboten, eine der (verdammt) vielen ms-* CSS-Klassen bei seinem eigenen HTML-Output einfach wiederzuverwenden. Bei tabellarischen Darstellungen von Daten haben beispielsweise `ms-formtable`, `ms-formlabel` sowie `ms-formbody` ganz gute Dienste geleistet, die resultierende Tabelle (auch wenn wahren WebDesignern bei diesem Wort jetzt übel wird) sah somit so gut wie immer passend aus.

Unter der nächsten Version, zumindest ist es in der aktuellen Beta so, funktioniert das leider (?) nicht immer. Bei gewöhnlichen Wiki-Seiten fehlen die oben exemplarisch genannten Klassen, während sie an anderen Stellen wieder auftauchen. Das liegt einfach daran, dass nicht mehr eine große -- eigentlich gewaltige -- Datei mit allen StyleSheets geladen wird, stattdessen werden zusammengehörige CSS-Elemente in sehr viel kleineren Häppchen, aber nur falls notwendig (!), an den Client geschickt. Kurz: es wurde aufgeräumt.

Will man also an einer Stelle Ungewöhnliches aus dem CSS-Sortiment von SharePoint verwenden, so muss man das jetzt auch rechtzeitig bekannt geben:

```csharp
protected override void OnLoad(EventArgs e)
{
    base.OnLoad(e);

    CssRegistration.Register("forms.css");
}
```

Deklarativ geht das natürlich genauso, siehe [Doku][0].

[0]: https://msdn.microsoft.com/library/microsoft.sharepoint.webcontrols.cssregistration
