---
layout: post
post_class: text-post
title: Who loads this Assembly?
tags:
  - Development
  - Debugging
redirect_from:
  - /post/45847393229/who-loads-this-assembly/
  - /post/45847393229/
---
Wird ein .NET Assembly von einer Applikation geladen, welches eigentlich nicht geladen werden sollte, helfen auch Tools der Art *Dependency Walker* nicht weiter, sollte dieses Assembly auf irgendeine dynamische Art und Weise geladen werden. In so einer Situation ist *WinDbg* unser Freund und Helfer -- wie in den meisten eher nicht alltäglichen Gegebenheiten auch.

In diesem Fall wird die Anwendung gleich aus *WinDbg* gestartet und wir warten einmal explizit bis die .NET Runtime ins Spiel kommt.

```
(1384.1210): Break instruction exception - code 80000003 (first chance)
0:000> sxe ld clrjit.dll
0:000> g
```

Bald ist es soweit und wir können gleich den Son of Strike mit ins Boot holen. Ein Warten auf `clrjit` ist übrigens praktischer als ein entsprechendes `sxe ld` auf `clr`, da einige sos Befehle zu diesem Zeitpunkt einfach besser -- Stichwort `!bpmd` -- funktionieren.

```
(1384.1210): Unknown exception - code 04242420 (first chance)
0:000> .loadby sos clr
```

Nichts neues bis hierher. Nun lässt sich der "Trick" aus dem ersten Schritt wiederverwenden. Das Kommando `sxe ld` registriert nämlich eine Art Breakpoint auf einen ModLoad "Event", was sich natürlich auch auf unseren Verdächtigen anwenden lässt. Beispielsweise ist das Assembly `Microsoft.SqlServer.Types` ja auch nur ein "Modul".

```
0:000> sxe ld Microsoft.SqlServer.Types.dll
0:000> g
```

Früher oder später ist es dann soweit.

```
ModLoad: 650f0000 6514f000   Microsoft.SqlServer.Types.dll
0:000> !clrstack
OS Thread Id: 0x1210 (0)
Child SP       IP Call Site
001befac 7746fc42 System.Reflection.RuntimeAssembly._nLoad
001bf080 65564153 System.Reflection.RuntimeAssembly.nLoad
001bf0a4 655639a9 System.Reflection.RuntimeAssembly.InternalLoadAssemblyName
001bf0dc 65576da2 System.Reflection.RuntimeAssembly.InternalLoad
001bf100 65576d49 System.Reflection.RuntimeAssembly.InternalLoad
001bf10c 6559779d System.Reflection.Assembly.Load
001bf118 0036007b Program.DoSomeMagic
...
```

Erwischt!
