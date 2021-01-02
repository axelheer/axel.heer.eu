---
layout: post
post_class: text-post
title: Fixing SPView.RenderAsHtml()
tags:
  - Development
  - SharePoint
  - CSharp
redirect_from:
  - /post/44796355177/fixing-spview-renderashtml/
  - /post/44796355177/
---
Ohne jetzt näher darauf einzugehen, dass entgegen aller Regeln und Patterns der ASP.NET Welt hier eine (Hilfs-)Methode einen billigen String generiert, der sowas ähnliches wie HTML enthalten soll, möchte ich an dieser Stelle zeigen, wie sich die einen oder anderen Konflikte, welche beim Verwenden des Outputs eben dieser Funktion in Kombination mit diversen Webparts oder anderen SharePoint Elementen auftreten können, vermeiden lassen. Es passieren nämlich sehr leicht Überschreibungen von JavaScript Variablen sowie Mehrfachverwendungen von Identifiern. Nicht gut.

Grundsätzlich schaut dieses Ding einmal harmlos aus:

```csharp
var html = view.RenderAsHtml();
```

Wenn es das wäre, sind wir fertig. Ist es aber nicht.

**Fix #1:**

Die Scripterei für die ECB Menüelemente hängt von einer ID ab, welche in unserem "HTML" einmal mit 1 festgelegt ist. Blöd nur, wenn 1 bereits in Verwendung ist.

```csharp
html = html.Replace("ctx1", "ctx" + num);
html = html.Replace("ctxId = 1", "ctxId= " + num);
html = html.Replace("CtxNum=\"1\"", "CtxNum=\"" + num + "\"");
```

Als `num` kann man eine Zufallszahl nehmen oder irgendwo sauber mitzählen.

**Fix #2:**

Für die Filtermöglichkeiten verwendet SharePoint einen versteckten IFrame, dessen ID auch nur genau einmal im gesamten Dokument vorkommen sollte.

```csharp
html = html.Replace("FilterIframe1", "FilterIframe" + num);
```

Die Variable `num` sollte auch eher größer sein: SharePoint beginnt bei 1 und wir z.B. bei 1138.

**Fix #3:**

Fehlen noch die Gruppen, die SharePoint ja in ein oder zwei Ebenen auf- und zuklappbar anzeigen kann. Hier gibt es einige Tags und JavaScript Elemente, welche angepasst werden müssen.

```csharp
html = html.Replace("titl1-", "titl" + num + "-");
html = html.Replace("tbod1-", "tbod" + num + "-");
html = html.Replace("foot1-", "foot" + num + "-");
html = html.Replace("up('1-", "up('" + num + "-");
html = html.Replace("img_1-", "img_" + num + "-");
```

Die dazugehörigen Funktionen sind eher nicht lesenswert...

**Fix #4:**

Sind diese Gruppen allerdings von Haus aus nicht geöffnet, also collapsed, so können deren Datensätze nicht mehr nachgeladen werden. Und nach einer kurzen Recherche mittels [Reflector][0] wird man leider feststellen, dass sich eine derartige Funktionalität nicht so recht nachbauen lässt.

```csharp
view.Query = view.Query.Replace(
    "Collapse=\"TRUE\"", "Collapse=\"FALSE\"");
```

Billig, aber eine Lösung.

**Fix #5:**

Zu billig? Sollen die Gruppen unbedingt collapsed angezeigt werden, um den User auch so richtig glücklich zu machen (und das wollen wir doch, oder?), so kann man diese zwar expanded rendern lassen, jedoch dann mittels Script wieder schließen.

```csharp
var allExpCollGroups = new StringDictionary();

foreach (Match match in Regex.Matches(html,
    @"ExpCollGroup\('\d+-[\d+_]+','img_\d+-[\d+_]+'\);"))
{
    allExpCollGroups[match.Value] = match.Value;
}

var script = new string[allExpCollGroups.Count];

allExpCollGroups.Values.CopyTo(script, 0);

Page.ClientScript.RegisterStartupScript(typeof(Whatever),
    "ExpCollGroups" + num, String.Join("", script), true);
```

Die Gruppen werden also expanded geladen, um ein leider nicht wirklich mögliches Nachladen zu verhindern, aber dann am Client gleich wieder geschlossen angezeigt.

Uff.

[0]: https://de.wikipedia.org/wiki/.NET_Reflector
