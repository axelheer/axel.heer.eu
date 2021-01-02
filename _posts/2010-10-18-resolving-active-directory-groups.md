---
layout: post
post_class: text-post
title: Resolving Active Directory Groups
tags:
  - Development
  - SharePoint
  - Identity
  - CSharp
redirect_from:
  - /post/44794041952/resolving-active-directory-groups/
  - /post/44794041952/
---
In einem Post über die [GetPrincipalsInGroup][0] Methode der Klasse [SPUtility][1] habe ich erwähnt, dass das direkte Ansprechen von Active Directory Gruppen, um alle Mitglieder so einer Gruppe auszulesen, grundsätzlich relativ einfach ist -- auch wenn die besprochene Methode damit diverse Schwierigkeiten hat.

Eine (auch relativ einfach zu lösende *räusper*) Kleinigkeit habe ich allerdings nicht erwähnt: liest man via LDAP alle Elemente der Eigenschaft `member` einer Gruppe ein, so fehlen jene Mitglieder, welche über das Attribut `PrimaryGroupToken` mit dieser Gruppe verknüpft sind. Schaut man zum Beispiel mittels *ADSI Edit* in die `member` Eigenschaft der Gruppe *Domain Users*, so wird man nicht viele Active Directory Benutzer finden -- hier wird aus historischen Gründen (früher durften Gruppen nicht allzu groß werden) über den *Primary group token* gearbeitet.

Um nun die letzten Klarheiten zu beseitigen:

```csharp
void ResolveGroup(SecurityIdentifier groupSid, HashSet groups, HashSet result)
{
    if (groups.Contains(groupSid) || result.Contains(groupSid))
        return;

    var netbios = groupSid.Translate(typeof(NTAccount)).Value;
    netbios = netbios.Remove(netbios.IndexOf('\\'));

    using (var entry = new DirectoryEntry("LDAP://" + netbios + "/<SID=" + groupSid.Value + ">"))
    {
        if ("group".Equals(entry.SchemaClassName, StringComparison.OrdinalIgnoreCase))
        {
            groups.Add(groupSid);

            ResolveGroupByMember(entry, groups, result);
            ResolveGroupByToken(entry, groups, result);
        }
        else
        {
            result.Add(groupSid);
        }
    }
}
```

Bei `result` und `groups` handelt es sich um *Hash sets*, welche ein mehrfaches oder sogar endloses Bearbeiten von Active Directory Objekten verhindern sollen. Die Methode `ResolveGroup` arbeitet rekursiv, wobei Gruppen auf zwei verschiedene Arten untersucht werden müssen.

Zuerst wird das Attribut `member` gelesen:

```csharp
void ResolveGroupByMember(DirectoryEntry groupEntry, HashSet groups, HashSet result)
{
    foreach (object memberDn in groupEntry.Properties["member"])
    {
        using (var memberEntry = new DirectoryEntry("LDAP://" + memberDn))
        {
            var memberRawSid = (byte[])memberEntry.Properties["objectSid"].Value;
            var memberSid = new SecurityIdentifier(memberRawSid, 0);

            ResolveGroup(memberSid, groups, result);
        }
    }
}
```

Anschließend wird noch mittels Token nach weiteren Mitgliedern gefahndet:

```csharp
void ResolveGroupByToken(DirectoryEntry groupEntry, HashSet groups, HashSet result)
{
    groupEntry.RefreshCache(new[] { "primaryGroupToken" });
    var token = groupEntry.Properties["primaryGroupToken"].Value;

    var domainDn = (string)groupEntry.Properties["distinguishedName"].Value;
    domainDn = domainDn.Substring(domainDn.IndexOf(",DC=") + 1);

    using (var domainEntry = new DirectoryEntry("LDAP://" + domainDn))
    {
        using (var memberSearcher = new DirectorySearcher(domainEntry, "(primaryGroupID=" + token + ")", new[] { "objectSid" }, SearchScope.Subtree))
        {
            foreach (SearchResult match in memberSearcher.FindAll())
            {
                var matchRawSid = (byte[])match.Properties["objectSid"][0];
                var matchSid = new SecurityIdentifier(matchRawSid, 0);

                ResolveGroup(matchSid, groups, result);
            }
        }
    }
}
```

Relativ einfach -- oder?

[0]: https://msdn.microsoft.com/library/microsoft.sharepoint.utilities.sputility.getprincipalsingroup
[1]: https://msdn.microsoft.com/library/microsoft.sharepoint.utilities.sputility
