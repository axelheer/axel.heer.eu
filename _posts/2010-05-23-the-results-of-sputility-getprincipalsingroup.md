---
layout: post
post_class: text-post
title: The results of SPUtility.GetPrincipalsInGroup
tags:
  - Development
  - SharePoint
  - Identity
  - CSharp
redirect_from:
  - /post/44794720998/the-results-of-sputility-getprincipalsingroup/
  - /post/44794720998/
---
Neben seinem eigenen Gruppenmodell kann SharePoint auch mit Gruppen aus dem Active Directory umgehen, was in den meisten Firmen auch genutzt wird, schließlich lassen sich so die verschiedensten Gruppen- bzw. Berechtigungskonzepte viel schöner und vor allem zentral verwalten. Außerdem sind SharePoint Gruppen leider immer auf eine Websitesammlung beschränkt...

Will man jetzt über die API von SharePoint einen "User" auflösen, bei welchem es sich eigentlich um eine *Domain Group* handelt -- Stichwort [SPUser.IsDomainGroup][0], also alle Mitglieder dieser als [SPUser][1] getarnten Domänengruppe herausfinden, so kann man sich bei der [SPUtility][2] Klasse bedienen:

```csharp
SPPrincipalInfo[] principals = null;

try
{
    bool reachedMaxCount;
    principals = SPUtility.GetPrincipalsInGroup(
        currentSite, domainGroup.LoginName, 9999, out reachedMaxCount);

    Constraint.Check(!reachedMaxCount, "!reachedMaxCount");
}
```

Jetzt kann es allerdings passieren, dass auf diese Art und Weise nicht alle Member gefunden werden. Beispielsweise sieht man in der Microsoft Management Console bei einer Gruppe zahlreiche Member, SharePoint findet jedoch nur einen Bruchteil davon.

Wie jetzt? Konkret kann das zumindest in folgenden beiden Fällen auftreten:

* Die Gruppe ist die primäre Gruppe eines Benutzers
* Der Benutzer kommt aus einer ganz anderen Domäne

Grund: es werden nicht einfach die Member der Gruppe aufgelöst! Stattdessen wird eine Suche über die komplette Domain der Gruppe gestartet, welche ein entsprechendes Query auf das `memberOf` Attribut enthält -- ich nehme einmal gutgläubig an, das hat performancetechnische Gründe.

Nachteil: ist die Gruppe die primäre Gruppe eines Benutzers, was in der Regel bei *Domain Users* bzw. *Domain Admins* vorkommen soll, so ist sie eben nicht im `memberOf` Attribut enthalten. Die primäre Gruppe steht im Attribut `PrimaryGroupID`, was von SharePoint wiederum nicht berücksichtigt wird. Und, wenn der User aus einer ganz anderen Domäne kommt, dann kann das naturgemäß auch nicht wirklich funktionieren.

Lösung: tja, Active Directory Entries lassen sich grundsätzlich relativ einfach direkt angreifen. Nur wird diese Hilfsfunktion ja auch von SharePoint selbst benutzt, womit die einen oder anderen Phänomene mit AD Gruppen erklärt wären, die sich mit so einer eigenen Methode aber nicht lösen lassen. Ergo, keine primären Gruppen verwenden! Bei externen Usern ist dann schon etwas mehr Kreativität gefragt, zum Beispiel eine Lösung mit SharePoint Gruppen, die jedoch... äh, lassen wir das.

Dum dum dum, dum dudum, dum dudum...

[0]: https://msdn.microsoft.com/library/Microsoft.SharePoint.SPUser.IsDomainGroup
[1]: https://msdn.microsoft.com/library/Microsoft.SharePoint.SPUser
[2]: https://msdn.microsoft.com/library/Microsoft.SharePoint.Utilities.SPUtility
