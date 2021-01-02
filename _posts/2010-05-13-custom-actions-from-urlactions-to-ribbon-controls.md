---
layout: post
post_class: text-post
title: Custom Actions - from UrlActions to Ribbon Controls
tags:
  - Development
  - SharePoint
  - XML
redirect_from:
  - /post/44795531638/custom-actions-from-urlactions-to-ribbon-controls/
  - /post/44795531638/
---
Custom Actions waren in SharePoint schon immer eine ausgezeichnete Möglichkeit, um bereits vorhandene menüartige Strukturen mit eigenen Erweiterungen zu verknüpfen. Beispielsweise können Schaltflächen in die Standardmenüs einer Listenansicht integriert werden, welche ganz einfach eine Application Page oder ähnliches parametrisiert aufrufen, wenn der User diese Zusatzoptionen entsprechend benutzt.

Menüs sind jedoch tot! Ribbons sind angesagt, mittlerweile auch in SharePoint.

Will man jetzt einfach seine alte Custom Action "auf Ribbon" umbauen, so können die einen oder anderen "substitution tokens", also Platzhalter wie zum Beispiel "{ListId}", leider Probleme machen. Das Ribbon Element muss nämlich explizit auf einen bestimmten Listentyp bzw. Inhaltstyp registriert sein, damit gewissen Platzhaltern auch etwas zugewiesen wird.

Beginnen wir einmal mit folgender angedeuteten Ausgangssituation:

```xml
<CustomAction Id="[yourId]" usw="usw.">
  <UrlAction Url="_layouts/[yourPage].aspx?List={ListId}" />
</CustomAction>
```

Nach diversen Anleitungen schaut die Ribbonversion dann ungefähr so aus:

```xml
<CustomAction Id="[yourId]" usw="usw.">
  <CommandUIExtension>
    <CommandUIDefinitions>
      <CommandUIDefinition
        Location="Ribbon.Library.Groups._children">
        <Group
          Id="[groupId]"
          Command="[groupCmd]"
          usw="usw.">
          <Controls Id="Ribbon.Library.[groupId].Controls">
            <Button
              Id="Ribbon.Library.[groupId].[buttonId]"
              Command="[buttonCmd]"
              usw="usw." />
          </Controls>
        </Group>
      </CommandUIDefinition>
      <CommandUIDefinition
        Location="Ribbon.Library.Scaling._children">
        <MaxSize
          Id="Ribbon.Library.Scaling.[groupId].MaxSize"
          GroupId="Ribbon.Library.[groupId]"
          usw="usw." />
      </CommandUIDefinition>
    </CommandUIDefinitions>
    <CommandUIHandlers>
      <CommandUIHandler
        Command="[groupCmd]"
        CommandAction="" />
        <CommandUIHandler
        Command="[buttonCmd]"
        CommandAction="javascript:window.location=
          '{SiteUrl}/_layouts/[yourPage].aspx?List={ListId};" />
    </CommandUIHandlers>
  </CommandUIExtension>
</CustomAction>
```

Und das ist nur die gekürzte Fassung...

Kommen wir zum Haken an der Sache: der gewünschte Button wird zwar auf jeden Fall -- wenn man grundsätzlich keinen Fehler gemacht hat -- in jeder Library auftauchen; damit auch der Link richtig funktioniert, müssen jedoch *RegistrationType* sowie *RegistrationId* gesetzt sein, auch wenn die Steuerelemente eigentlich schon innerhalb des Ribbons an der richtigen Stelle hängen.

```xml
<CustomAction
  Id="[someId]"
  Location="CommandUI.Ribbon"
  RegistrationType="List"
  RegistrationId="101">
  <CommandUIExtension>
    usw.
  </CommandUIExtension>
</CustomAction>
```

Werden die beiden Attribute nicht gesetzt, greifen die "substitution tokens" teilweise einfach nicht. :(
