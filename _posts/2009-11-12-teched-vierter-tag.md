---
layout: post
post_class: text-post
title: TechEd, vierter Tag
tags:
  - Conference
  - TechEd
redirect_from:
  - /post/44797380471/teched-vierter-tag/
  - /post/44797380471/
---
Nach einer recht interessanten Einführung in den Groove Nachfolger SharePoint Workspace, der zwar dank des neuen Sync Frameworks recht mächtig geworden ist, jedoch nach wie vor leider in keinster Weise für Developer interessant ist, wurde die kommende Version von ASP.NET AJAX präsentiert. Wow, hier hat sich wirklich einiges getan: 2-way Data Binding, eigentlich ein Begriff aus Rich Client Technologien wie WPF, in Form einer JavaScript Library und das auch noch ganz ohne Abhängigkeiten von Serverkomponenten -- alle gezeigten Samples waren reine HTML Files. Data Templates dürfen dann natürlich auch nicht fehlen: mit zwei syntaktisch unterschiedlichen Varianten (eine für JavaScript Freaks, eine für Entwickler mit Vorliebe für deklarative Markups) werden Daten dynamisch -- AJAX halt -- geladen und ohne viel Handarbeit -- yeah! -- visualisiert.

Nach dem Mittagessen wurde die ganze Euphorie wieder ein wenig gedämpft. Wir durften in der Form einer high level Architecture Session lernen, dass es sich auszahlen kann allgemeine Funktionalitäten wie zum Beispiel Charting nicht selbst zu entwickeln, sondern von Drittherstellern anzukaufen. Zur Draufgabe gab es dann noch eine kurze Einführung in die Zuständigkeiten von Objekten. No comment; diesmal wirklich.

Abgeschlossen wurde der vorletzte Tag mit einem reinen SharePoint Workflow Vortrag, in dem zuerst Vorteile erfunden wurden, noch bei der alten Workflow Foundation zu bleiben, anschließend aber noch die viel bessere Visual Studio Unterstützung und zwei doch interessante Neuerungen zu sehen waren. Erstens wurden Ereignisse von Workflows in die Event Receiver Infrastruktur aufgenommen, wodurch man jetzt beispielsweise auf das Abschließen eines Workflows reagieren kann. Zweitens gibt es ein neues abstraktes External-Data-Exchange-Service, um leichter mit Daten aus anderen System interagieren zu können, was durchaus nützlich sein kann. Man ist nicht mehr auf SharePoint Tasks angewiesen, es ist dann auch möglich auf Ereignisse in ganz anderen Daten zu reagieren -- eine entsprechende Implementierungen eines Proxys vorausgesetzt.
