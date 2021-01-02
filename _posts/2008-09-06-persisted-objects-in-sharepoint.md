---
layout: post
post_class: text-post
title: Persisted Objects in SharePoint
tags:
  - Development
  - SharePoint
  - CSharp
redirect_from:
  - /post/44799425877/persisted-objects-in-sharepoint/
  - /post/44799425877/
---
um settings einer anwendung innerhalb von sharepoint zu speichern, wird meist auf das simple [property bag][0] des site objects verwiesen. wie lange kommt man jedoch schon mit einfachen key-value settings aus? abgesehen davon, so lose gespeicherte einstellungen...

wenn man allerdings zwei stufen in der hierachie hinaufschaut, so entdeckt man einen viel netteren mechanismus: persisted objects, die übrigens auch auf anderen ebenen verfügbar sind. beispielsweise tauchen sie bei der feature definition wieder auf. wie auch immer, auf jeden fall ist so eine klasse leicht zu implementieren (achtung: die attribute usage lautet hier untypischerweise field, nicht property):

```csharp
using System;
using Microsoft.SharePoint.Administration;

namespace AxelHeer.SharePoint.Demo
{
    public class DarkSettings : SPPersistedObject
    {
        [Persisted]
        private string _something;

        public string Something
        {
            get { return _something; }
            set { _something = value; }
        }

        public DarkSettings()
        { }

        public DarkSettings(string name, SPPersistedObject parent, Guid id)
            : base(name, parent, id)
        { }
    }
}
```

diese lassen sich jetzt als child eines anderen persisted objects, wie der web application, speichern

```csharp
var settings = new DarkSettings(name, parent, id)
{
    Something = something
};
settings.Update();
```

und über den innerhalb des scopes vom parent object eindeutigen namen laden.

```csharp
var settings = parent.GetChild(name);
```

zusätzlich besitzt jedes objekt eine global eindeutige guid, welche nur bei [direkten zugriffen][1] auf farm ebene notwendig ist. diese oder der name kann dann in der key-value struktur des property bags gespeichert werden...

[0]: https://msdn.microsoft.com/library/microsoft.sharepoint.spweb.properties
[1]: https://msdn.microsoft.com/library/microsoft.sharepoint.administration.spfarm.getobject
