---
layout: post
post_class: text-post
title: Security Exceptions catched by SharePoint
tags:
  - Development
  - SharePoint
  - CSharp
redirect_from:
  - /post/44799099025/security-exceptions-catched-by-sharepoint/
  - /post/44799099025/
---
irgendwie versteht sharepoint unter exception handling ein sagen wir seltsames konzept. greift man auf ein objekt zu, auf das der aktuelle user nicht berechtigt ist, bzw. führt man eine verbotene aktion durch, so wird der aktuelle request sofort abgebrochen. das ist zumindest das default verhalten, welches sich mit hilfe einer helper klasse beeinflussen lässt: [spsecurity][0].

auf diese art und weise wird jedoch das catchen von security exceptions global im scope des aktuellen http requests gesteuert. gut, kein kommentar dazu. auf jeden fall wollte ich in einer halbwegs netten form in meinem code bereiche definieren können, in denen dieses setting entsprechend aus- oder wieder eingeschalten werden kann. verschachtelbar natürlich...

mein vorschlag dazu:

```csharp
[SharePointPermission(SecurityAction.LinkDemand, ObjectModel = true)]
public sealed class CatchAccessDenied : IDisposable
{
    private bool _catchAccessDenied;

    private CatchAccessDenied(bool value)
    {
        _catchAccessDenied = SPSecurity.CatchAccessDeniedException;
        SPSecurity.CatchAccessDeniedException = value;
    }

    public static CatchAccessDenied Yes
    {
        get { return new CatchAccessDenied(true); }
    }

    public static CatchAccessDenied No
    {
        get { return new CatchAccessDenied(false); }
    }

    public void Dispose()
    {
        SPSecurity.CatchAccessDeniedException = _catchAccessDenied;
    }
}
```

wird dann folgendermaßen verwendet:

```csharp
using (CatchAccessDenied.No)
{
    ...
}
```

also ich find's super...

[0]: https://msdn.microsoft.com/library/microsoft.sharepoint.spsecurity
