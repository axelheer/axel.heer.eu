---
layout: post
post_class: text-post
title: Allow Windows Backup to wake up your PC
tags:
  - Trick
  - Windows
redirect_from:
  - /post/44795730127/allow-windows-backup-to-wake-up-your-pc/
  - /post/44795730127/
---
Die out-of-the-box Lösung von Windows 7, um seine Daten sowie das komplette System automatisch zu sichern, ist ja grundsätzlich in Ordnung, eigentlich sogar sehr gut für den Normalgebrauch. Nur das Scheduling (in den Standardeinstellungen Sonntags 19:00), nach dem ein "Point to return" erstellt werden soll, ist vielleicht nicht so jedermanns Sache: zu einer Uhrzeit, in der üblicherweise der Computer verwendet wird, stört die Herumkopiererei enorm und zu einem Zeitpunkt, zu dem der PC in der Regel nicht benötigt wird, sollte er auch nicht eingeschalten sein -- schade um den Strom.

Jetzt wird für die Zeitsteuerung des Sicherungsdienstes, so wie es sich unter Windows eben gehört, der Task Scheduler verwendet. Und der hat mittlerweile einiges dazugelernt: unter Anderem können Tasks so konfiguriert werden, dass der PC für deren Exekution gegebenenfalls aus dem Standby aka Ruhemodus geweckt wird. Die Administrationsoberfläche von Windows Backup bietet zwar keine Möglichkeit so etwas einzustellen, jedoch lässt sich das ganz einfach direkt mit der GUI des Task Schedulers, welche unter "Administrative Tools" zu finden ist, erledigen.

> Task Scheduler Library >> Microsoft >> Windows >> WindowsBackup

Bei *AutomaticBackup* kann dann unter *Conditions* das entsprechende Häkchen gesetzt werden:

![Windows backup](/assets/windows-backup.png)

Oder man findet eine andere je nach Situation besser geeignete Variante.
