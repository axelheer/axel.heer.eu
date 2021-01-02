---
layout: post
post_class: text-post
title: Setting Webpart Target Audiences programmatically
tags:
  - Development
  - SharePoint
  - CSharp
redirect_from:
  - /post/44798459325/setting-webpart-target-audiences-programmatically/
  - /post/44798459325/
---
wirft man einen blick auf die target audiences eines sharepoint webparts, und zwar nicht durch die gui-brille sondern via api, so wird man mit einem seltsamen string, der aus guids, doppelten semikolons, zeilenumbrüchen, distinguished names und (!) namen von sharepoint gruppen besteht (oke, die namen sind halb so wild), konfrontiert.

laut [doku][0] handelt es sich dabei um eine property, die genutzt werden kann um eine logik zu implementieren, die auf basis dieser unstrukturierten textzeichen und natürlich auf basis der autorisierung des aktuellen benutzers im entsprechenden event des webpartmanagers eben den webpart ein- oder ausblendet. so was wie die target audiences von sharepoint halt...

wie <s>immer</s> so oft findet man hilfsmittel, die einem zumindest in diesem fall das generieren einer solchen zeichenkette erleichtern. auch das interpretieren davon muss man übrigens nicht per hand machen, die werkzeuge dafür gibt's analog. stehen also bereits arrays vom typ string mit guids der global audiences, distinguished names der active directory gruppen und namen der sharepoint gruppen zur verfügung, so genügt folgender code:

```csharp
var filter = AudienceManager.GetAudienceIDsAsText(globalGroupIds, distinguishedNames, localGroupNames);

targetWebPart.AuthorizationFilter = filter;
```

gut, der kann noch nicht allzu viel. das auflösen der ad gruppen übernimmt zuvor dieselbe klasse:

```csharp
private string[] ResolveLogOnNames(string[] logOnNames)
{
    var distinguishedNames = new List();

    foreach (var currentName in logOnNames)
    {
        var result = AudienceManager.GetADsPath(currentName);

        if (result == null || result.Count == 0)
        {
            throw ...
        }

        distinguishedNames.Add(result[0].ToString().Replace("LDAP://", ""));
    }

    return distinguishedNames.ToArray();
}
```

fehlen nur noch die guids der global audiences:

```csharp
private string[] ResolveGlobalGroupNames(string[] globalGroupNames)
{
    var globalGroupIds = new List();

    var context = ServerContext.GetContext(...);

    var manager = new AudienceManager(context);

    foreach (var currentName in globalGroupNames)
    {
        globalGroupIds.Add(manager.Audiences[currentName].AudienceID.ToString());
    }

    return globalGroupIds.ToArray();
}
```

geht doch.

[0]: https://msdn.microsoft.com/library/system.web.ui.webcontrols.webparts.webpart.authorizationfilter
