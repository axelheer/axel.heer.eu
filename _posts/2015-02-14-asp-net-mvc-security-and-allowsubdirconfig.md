---
layout: post
post_class: text-post
title: ASP.NET MVC Security and allowSubDirConfig
tags:
  - Development
  - Security
  - IIS
  - MVC
  - XML
---
Die mittlerweile vor vielen Jahren eingeführte *MVC* Variante von *ASP.NET* verwendet im Standard zwei *Web.config* Files: eines, wie gewohnt, für die Applikation selbst, sowie ein zweites, um die *Views* der Anwendung nicht nur zu konfigurieren, sondern auch abzusichern. Schließlich soll hier nur indirekt via dazugehörige *Controller* zugegriffen werden können, die eigentlichen Code Files haben den User -- den bösen Hacker -- nicht zu interessieren, wie in einem [Post von Phil Haack][3] nachgelesen werden kann.

Wie sich im Zuge eines *IIS Health Checks* herausgestellt hat, sollte nach einer [allgemeinen Empfehlung][1] seitens Microsoft die Konfiguration der *Virtual Directories* eben **nicht** jener während der Installation "Entstandenen" entsprechen (warum eine Software mit Einstellungen -- von denen wiederum abgeraten wird, da sie nicht den Empfehlungen genügen -- ausgeliefert und dann natürlich auch installiert wird, ist eine andere Geschichte...): der Wert des Attributes *allowSubDirConfig* der [*Virtual Directory Defaults*][2] lautet zwar **per default** `true`, aus performancetechnischen Gründen wird jedoch zu `false` geraten, um nur mehr im *Root Directory* einer Webanwendung nach der (hoffentlich) einzigen *Web.config* suchen zu müssen.

Moment... da hat's was... funktioniert dann eine "normale" *ASP.NET MVC* Anwendung?

Ja. Interessanterweise arbeitet mit dieser Einstellung der Webserver *IIS* vermeidlich besser (schneller), dem .NET Framework ist diese Optimierung aber herzlich egal, was in [Sroun's Blog][4] erläutert wird. Die gute Nachricht lautet also, mittels *ASP.NET MVC* Erstelltes funktioniert genauso, es ist offensichtlich kein Unterschied bemerkbar. Hurra.

Kein einziger? Nein, die naturgemäß folgende schlechte Nachricht enthüllt ein sicherheitstechnisches "Manko": die Eingangs erwähnte Absicherung der *Views* erfolgt nicht über eine (noch arbeitende) Konfiguration des .NET Frameworks, sondern durch eine (wegoptimierte) Steuerung der *HTTP Handler* des *IIS*. Der entsprechende Bereich des XML Files betrifft nämlich `system.webServer` und ist somit ein *IIS* Spezifikum:

```xml
<system.webServer>
    <handlers>
        <remove name="BlockViewHandler" />
        <add name="BlockViewHandler"
             path="*"
             verb="*"
             preCondition="integratedMode"
             type="System.Web.HttpNotFoundHandler" />
    </handlers>
</system.webServer>
```

Um die geschilderte Situation nachzustellen, kann einfach ein Bild im *Views Directory* abgelegt werden. Ein "normaler" *IIS* sollte auf einen passenden Request mit "404" antworten, in der "optimierten" Variante jedoch nicht. Wie auf [Stack Overflow][0] in Erfahrung gebracht werden konnte, lässt sich dieses Problem leicht beheben: der `BlockViewHandler` kann genauso gut in der *Web.config* des *Root Directories* registriert werden, es muss lediglich das Attribut `path` von `*` auf `Views/*` geändert werden.

Eine leicht zu lösende, ***aber*** leider noch viel leichter zu übersehende Sicherheitslücke. Verdammt.


[0]: https://stackoverflow.com/questions/28019590
[1]: https://msdn.microsoft.com/library/windows/hardware/dn529134
[2]: https://www.iis.net/configreference/system.applicationhost/sites/virtualdirectorydefaults
[3]: https://haacked.com/archive/2008/06/25/aspnetmvc-block-view-access.aspx
[4]: https://blogs.msdn.com/b/sroun/archive/2014/11/14/allowsubdirconfig-clarification.aspx
