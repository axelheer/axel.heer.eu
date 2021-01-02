---
layout: post
post_class: text-post
title: User.IsInRole and SharePoint claims
tags:
  - Development
  - SharePoint
  - Security
  - CSharp
redirect_from:
  - /post/44794445573/user-isinrole-and-sharepoint-claims/
  - /post/44794445573/user-isinrole/
  - /post/44794445573/
---
Claims sind super -- aber das weiß eh schon jeder.

Claims abzufragen ist nicht so super -- die Klasse [ClaimsPrincipal][0] der Windows Identity Foundation implementiert zwar das Interface [IPrincipal][1], wodurch so ein Token mit seinen Claims theoretisch zumindest mit den guten alten rollenbasierenden Konzepten kompatibel sein sollte, jedoch kann `ClaimsPrincipal.IsInRole` nur mit Strings umgehen, welche den Namespace und nur den Namespace eines Claims enthalten, was meistens alles andere als hinreichend ist, schließlich kommt es in der Regel auch auf den dazugehörigen Value an.

Zur Erinnerung: ein Claim, den ein User in seinem Token mit sich spazieren tragen kann, enthält im Wesentlichen zwei Werte, den Claim type bzw. Namespace sowie den Claim value. Werden Gruppen aus dem Active Directory in Claims verpackt, so schaut das üblicherweise so aus, dass je Gruppe ein Claim generiert wird, wobei als Namespace

```
http://schemas.microsoft.com/ws/2008/06/identity/claims/groupsid
```

und als Value die SID der Gruppe eingetragen wird. Da in SharePoint eine Gruppe und somit aus Kompatibilitätsgründen (bäh!) ein Claim nur aus einem einzigen String bestehen kann, werden mit Hilfe von eigenen Kodierungsmethoden diese Paare von Werten komprimiert -- im Falle einer Active Directory Gruppe schaut das dann ungefähr so aus: `c:0+.w|{SID}`.

Um hier also mit den neuen Technologien richtig autorisieren zu können, und das auch noch im SharePoint Kontext, sind zwei Methoden notwendig: eine analog zu `IsInRole`, welche Claim type *und* Claim value überprüft, sowie eine SharePoint spezifische, welche je nach dem, ob es sich gerade um einen Benutzer mit Claims oder einen "klassischen" User handelt, mit der alten oder eben der neuen Variante die gefragte Autorität überprüft.

Anstatt von `IsInRole` ist nun eine Art `HasClaim` interessant:

```csharp
public static bool HasClaim(this IClaimsPrincipal user, string claimType, string value)
{
    if (user == null)
        throw new ArgumentNullException("user");

    if (string.IsNullOrEmpty(claimType))
        throw new ArgumentNullException("claimType");

    foreach (var identity in user.Identities)
    {
        foreach (var claim in identity.Claims)
        {
            if (String.Compare(claim.ClaimType, claimType, StringComparison.Ordinal) == 0)
            {
                if (string.IsNullOrEmpty(value))
                    return true;
                if (String.Compare(claim.Value, value, StringComparison.OrdinalIgnoreCase) == 0)
                    return true;
            }
        }
    }

    return false;
}
```

Fehlt nur noch die besprochene Fallunterscheidung:

```csharp
public static bool IsInRoleOrHasClaim(this IPrincipal user, string role)
{
    if (user == null)
        throw new ArgumentNullException("user");

    if (string.IsNullOrEmpty(role))
        return true;

    var claimUser = user as IClaimsPrincipal;

    if (claimUser != null)
    {
        var manager = SPClaimProviderManager.Local;

        var claim = manager.DecodeClaim(role);

        return claimUser.HasClaim(claim.ClaimType, claim.Value);
    }

    return user.IsInRole(role);
}
```

Zwischen Neu und Alt kann also ganz einfach getrennt werden, indem überprüft wird, ob zusätzlich die Schnittstelle [ClaimsPrincipal][2] implementiert wurde. In der neuen Variante ist zwar die Möglichkeit multipler Identitäten vorgesehen, auf ein entsprechend aktualisiertes Autorisieren wurde, aus welchen Gründen auch immer, verzichtet.

Diese Vorgehensweise funktioniert natürlich nicht nur mit Active Directory Gruppen. ^^

[0]: https://msdn.microsoft.com/library/microsoft.identitymodel.claims.claimsprincipal
[1]: https://msdn.microsoft.com/library/system.security.principal.iprincipal
[2]: https://msdn.microsoft.com/library/microsoft.identitymodel.claims.claimsprincipal
