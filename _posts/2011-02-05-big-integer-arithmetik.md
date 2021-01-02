---
layout: post
post_class: text-post
title: Big-Integer-Arithmetik in C#
tags:
  - Math
  - Security
redirect_from:
  - /2011/02/05/big-integer-arithmetik-in-c/
  - /post/44791090795/big-integer-arithmetik-in-c/
  - /post/44791090795/
---
Finally, meine Diplomarbeit mit dem vollständigen Titel

> **Big-Integer-Arithmetik in C#**
>
> **und ihre Anwendung auf digitale Signaturen**

ist fertig, benotet und [abgegeben][0]. Hervorheben möchte ich an dieser Stelle einen Performancevergleich mit der im .NET-Framework seit der Version 4.0 enthaltenen Big-Integer-Arithmetik [BigInteger][1] von Microsoft. (Sieg! :))

![Sieg](/assets/biginteger-win.png)

**Inhalt**

> Integrität und Ursprung von elektronischen Dokumenten wollen genauso sichergestellt werden können, wie die Authentizität physischer Schriftstücke. Bei letzteren ist die händische Unterschrift das übliche Mittel zum Zweck, während immaterielle Bits & Bytes aufgrund der Leistungsfähigkeit zeitgemäßer Computersysteme mit einem deutlich höheren Aufwand geschützt werden müssen. Für eine sogenannte digitale Signatur hinreichende mathematische Methoden sind Gegenstand der vorliegenden Arbeit, wobei sowohl auf eine ausführliche Behandlung der dafür notwendigen theoretischen Grundlagen als auch auf eine nahezu praxistaugliche Implementierung Wert gelegt wurde.
>
> Die in den vorgestellten Algorithmen implizit oder explizit verwendeten mathematischen Sätze werden inklusive (hoffentlich leicht) verständlichem Beweis angeführt, sollte es sich nicht gerade um Grundlagen aus Vorlesungen der ersten Semester für einen Studenten der technischen Mathematik handeln. Als Programmiersprache wurde C# .NET in der aktuellen Version 4.0 gewählt, da es sich dabei um eine moderne, gut lesbare, aber auch relativ leistungsstarke Technologie handelt -- maschinennahe Optimierungen wie bei C oder sogar Assembler sind hier natürlich nicht möglich, aber im Rahmen dieser Arbeit mit mathematischem Fokus auch nicht angebracht.
>
> Der Hauptteil der nun folgenden Seiten gliedert sich in sechs Kapitel: zu Beginn werden Techniken erarbeitet, die es ermöglichen, mit für aktuelle Computer unüblich großen Zahlen zu rechnen -- an dieser Stelle seien ganz unbescheiden Abschnitt 1.9 sowie Abschnitt 5.8 hervorgehoben: die vorgestellte Big-Integer-Arithmetik ist trotz ihrer kurzen Entwicklungszeit relativ schnell! Danach werden mit Hilfe dieser Techniken Primzahlen zufälliger Natur erzeugt, um dann im dritten Teil der vorliegenden Arbeit als Grundlage für prominente Kryptosysteme verwendet zu werden. Bevor endlich anhand von praktischen Beispielen die Verwendung von digitalen Signaturen demonstriert werden kann, werden noch in einer eigenen Passage drei ausgewählte Hashfunktionen behandelt. Zum Abschluss werden mit Hilfe von weiteren mathematischen Methoden die Algorithmen dieser Arbeit noch einmal beschleunigt, um mittels größerer Schlüsselpaare entsprechend sicherere "Unterschriften" erzeugen zu können.

**Download**

* [Volltext](/assets/biginteger.pdf)
* [Slides](/assets/biginteger-slides.pdf)

**Update**

Eine leicht überarbeitete Version von `IntBig` ist mittlerweile [auf GitHub][2] zu finden.

[0]: https://permalink.obvsg.at/AC07809642
[1]: https://msdn.microsoft.com/library/system.numerics.biginteger
[2]: https://github.com/axelheer/nein-math
