---
layout: post
post_class: text-post
title: How-to edit InfoPath forms manually
tags:
  - Trick
  - Office
  - InfoPath
redirect_from:
  - /post/44792120016/how-to-edit-infopath-forms-manually/
  - /post/44792120016/
---
Dass ein .xsn-File nichts anderes als ein CAB-Container ist, findet man leicht heraus. Allerdings wird in der Regel vorgeschlagen, mittels Änderung der Dateiendung das Formular im Windows Explorer zu zerlegen, um es anschließend (nach einer manuellen Anpassung) mittels MAKECAB wieder zusammen zu fügen.

Wieso so kompliziert, wenn es auch einfacher geht?

Das direkte Editieren der .xslt- bzw. .xml-Dateien eines Formulars ist grundsätzlich von InfoPath vorgesehen und wird auch halbwegs einfach ermöglicht: zuerst muss man den Menüpunkt *Export* finden. In der aktuellen Version versteckt sich dieser im Abschnitt *Publish* -- eh klar. ^^

![InfoPath export](/assets/infopath-export.png)

Gut -- das händische Zerlegen des Formulars ist auch ohne diese Funktionalität nicht so mühsam. Das danach notwendige Zusammensetzen mittels MAKECAB jedoch schon. Dabei genügt ein Rechtsklick. Und ein Linksklick. Wie bei einer gewöhnlichen .xsn-Datei. :)

![InfoPath design](/assets/infopath-design.png)

Ein [Schutz des eigenen XSLTs][0] ist auch noch möglich...

[0]: https://msdn.microsoft.com/library/ee526342.aspx
