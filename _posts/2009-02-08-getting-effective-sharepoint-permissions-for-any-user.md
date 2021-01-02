---
layout: post
post_class: text-post
title: Getting effective SharePoint Permissions for any User
tags:
  - Development
  - SharePoint
  - Security
  - CSharp
redirect_from:
  - /post/44798566863/getting-effective-sharepoint-permissions-for-any-user/
  - /post/44798566863/
---
sich durch den objektdschungel der ganzen role assignments / definitions eines [secureable objects][0] -- also einer site / list / etc. -- durchzukämpfen kann ein wenig ausarten. schließlich hat hier teilweise noch das alte gruppenkonzept überlebt, welches wiederum mit als sharepoint user getarnten domain gruppen gemischt wird...

will man jedoch einfach nur die rechte bzw. rollen eines bestimmten users herausfinden, so kann man die api für sich arbeiten lassen:

```csharp
var user = Site.SiteUsers[LoginName];

using (var userSiteCollection = new SPSite(SiteCollection.ID, user.UserToken))
{
    using (var userSite = userSiteCollection.OpenWeb(Site.ID))
    {
        var effectivePerms = userSite.EffectiveBasePermissions;
        var effectiveRoles = userSite.AllRolesForCurrentUser;

        // ...
    }
}
```

ein tipp noch am rande: um domain gruppen aufzulösen, greift man auch am besten in die api trickkiste:

```csharp
bool reachedMaxCount;
var principals = SPUtility.GetPrincipalsInGroup(Site, LoginName, 9999, out reachedMaxCount);
```

allein die rekursion um verschachtelungen aufzulösen bleibt einem selbst überlassen. eine fingerübung. ;)

[0]: https://msdn.microsoft.com/library/microsoft.sharepoint.isecurableobject
