---
layout: post
post_class: text-post
title: int today, SPItemKey tomorrow
tags:
  - Development
  - SharePoint
  - CSharp
redirect_from:
  - /post/44796717375/int-today-spitemkey-tomorrow/
  - /post/44796717375/
---
...zumindest bei SharePoint Designer Workflow Actions.

Listen bzw. deren Elemente werden von SharePoint in SQL Server Tabellen gespeichert, wobei jedes Element eindeutig durch eine Reihe von GUIDs (Liste, Website, eh-scho-wissen) sowie einer ID vom Typ Integer identifiziert wird. Mit SharePoint 2007 kam die mehr oder weniger (wohl eher weniger) schöne Möglichkeit hinzu -- der Business Data Catalog aka BDC -- externe Datenquellen einzubinden, um diese dann mit SharePoint Elementen verknüpfen zu können. SharePoint 2010 wird eine deutlich attraktivere Variante bringen -- die Business Connectivity Services aka BCS, in der Externes sauber integriert und auf den ersten Blick gar nicht mehr von Internem unterscheidbar sein wird.

Auf den zweiten Blick müssen natürlich die einen oder anderen Komponenten angepasst werden, schließlich arbeitet nicht jede externe Datenquelle mit Zahlen als Primärschlüssel, auch wenn es wahrscheinlich die verbreitete Methode ist. GUIDs werden immer beliebter und ALFKI oder so gibt es ja auch noch. Kommen wir zum Punkt: es wird möglich sein, SharePoint Workflows auf externen Daten auszuführen, wodurch Activities bzw. Actions mit Bezug auf ein Listenelement nicht mehr davon ausgehen können, für den Primärschlüssel einen Wert vom Typ Integer zu erhalten! Und gleich ein Objekt vom Typ [SPListItem][0] zu übergeben wäre ja zu einfach, oder?

Die neue __ListItem Property einer Workflow Action schaut dann ungefähr so aus:

```csharp
[ValidationOption(ValidationOption.Required)]
public SPItemKey __ListItem
{
    get { return (SPItemKey)GetValue(__ListItemProperty); }
    set { SetValue(__ListItemProperty, value); }
}

public static readonly DependencyProperty __ListItemProperty =
    DependencyProperty.Register("__ListItem", typeof(SPItemKey), typeof(...));
```

Und Zeilen wie

```csharp
var target = targetList.GetItemById(__ListItem);
```

müssen in

```csharp
var target = __ListItem.GetItemByIdFromList(targetList);
```

umgeschrieben werden.

**Update**

```csharp
var target = __Context.GetListItem(targetList, __ListItem);
```

Das hat sich mit SharePoint 2010 RTM wieder geändert.

[0]: https://msdn.microsoft.com/library/Microsoft.SharePoint.SPListItem
