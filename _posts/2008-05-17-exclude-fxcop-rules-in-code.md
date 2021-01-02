---
layout: post
post_class: text-post
title: Exclude FxCop Rules in Code
tags:
  - Development
  - CSharp
redirect_from:
  - /post/44799825880/exclude-fxcop-rules-in-code/
  - /post/44799825880/
---
[fxcop][0] weiß vieles, alles kann jedoch auch er nicht verstehen.

um messages gezielt zu unterdrücken, falls es aus irgendeinem grund angebracht sein sollte, kann ein eigenes attribute verwendet werden, dessen genaue parametrisierung sogar automatisch von fxcop erledigt werden kann. rechter mausklick auf den eintrag, copy as, supressmessage -- dann die navigation einfach über rechter mausklick, jump to source.

```csharp
[SuppressMessage("Microsoft.Design", "CA1062:ValidateArgumentsOfPublicMethods")]
[SuppressMessage("Microsoft.Globalization", "CA1303:DoNotPassLiteralsAsLocalizedParameters")]
[SharePointPermission(SecurityAction.LinkDemand, ObjectModel = true)]
public override void FeatureActivated(SPFeatureReceiverProperties properties)
{
    Constraint.Check(properties != null, "properties != null");
    Constraint.Check(properties.Feature != null, "properties.Feature != null");
    Constraint.Check(properties.Feature.Parent != null, "properties.Feature.Parent != null");
    Constraint.Check(properties.Feature.Parent is SPSite, "properties.Feature.Parent is SPSite");

    SPSite siteCollection = (SPSite)properties.Feature.Parent;

    Constraint.Check(siteCollection.RootWeb != null, "siteCollection.RootWeb != null");

    ApplySomething(siteCollection.RootWeb);
}
```

(es wird validiert, nur auf eine für fxcop unverständliche art und weise. und die strings werden garantiert nicht lokalisiert...)

entspricht zwar keiner richtigen integration in visual studio, aber im vergleich zu dem spärlichen output der code analysis tools, die aus welchem grund auch immer nur in der team edition verfügbar sind, gewinnt für mich das externe tool.

wichtig: um das [supress attribute][1] auch wirklich zu übersetzen, muss CODE_ANALYSIS defined werden.

[0]: https://en.wikipedia.org/wiki/FxCop
[1]: https://msdn.microsoft.com/library/system.diagnostics.codeanalysis.suppressmessageattribute
