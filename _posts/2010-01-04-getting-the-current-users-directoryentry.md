---
layout: post
post_class: text-post
title: Getting the current user's DirectoryEntry
tags:
  - Development
  - SharePoint
  - Identity
  - CSharp
redirect_from:
  - /post/44796895755/getting-the-current-users-directoryentry/
  - /post/44796895755/
---
Bei sogenannten "internen" Webapplikationen, zumindest in Umgebungen auf Basis von Windows Server, kommt es ja immer wieder vor, dass aufgrund von eigenartigen Anforderungen ein direkter Zugriff auf das gute alte ActiveDirectory notwendig wird. Meistens muss dann aus dem aktuellen Kontext heraus der Benutzer via LDAP ([System.DirectoryServices][0]) nachgeschlagen werden, um anschließend mit Hilfe der zahlreichen zusätzlichen Informationen aus dem Verzeichnis etwas zu tun.

In der Regel sieht das in etwa so aus:

```csharp
private DirectoryEntry LoadUser()
{
    var id = HttpContext.Current.User.Identity.Name.Split('\\');

    var domainName = id[0];
    var userName = id[1];

    var domainContext = new DirectoryContext(
        DirectoryContextType.Domain, domainName);
    var domainEntry = Domain.GetDomain(domainContext).GetDirectoryEntry();

    var searcher = new DirectorySearcher(domainEntry);
    searcher.Filter = "(sAMAccountName=" + userName + ")";

    return searcher.FindOne().GetDirectoryEntry();
}
```

Befindet man sich jedoch innerhalb eines Moduls für SharePoint, so hat man durch ein Objekt vom Typ [SPUser][1] sogar die SID eines Benutzers in der Hand -- und das natürlich nicht nur für den soeben angemeldeten. Obiges geht somit in SharePoint kürzer / besser / einfacher:

```csharp
private DirectoryEntry LoadUser()
{
    var sid = SPContext.Current.Web.CurrentUser.Sid;

    return new DirectoryEntry("LDAP://<SID=" + sid + ">");
}
```

Moment. Zumindest für den aktuell angemeldeten User sollte ja in einer gewöhnlichen ASP.NET Anwendung auch irgendwo die SID zu finden sein, oder? Ist sie auch:

```csharp
private DirectoryEntry LoadUser()
{
    var sid = HttpContext.Current.Request.LogonUserIdentity.User.Value;

    return new DirectoryEntry("LDAP://<SID=" + sid + ">");
}
```

Um auf diese Idee zu kommen war jetzt SharePoint notwendig.

[0]: https://msdn.microsoft.com/library/System.DirectoryServices
[1]: https://msdn.microsoft.com/library/Microsoft.SharePoint.SPUser
