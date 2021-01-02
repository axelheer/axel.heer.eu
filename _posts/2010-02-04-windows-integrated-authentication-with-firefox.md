---
layout: post
post_class: text-post
title: Windows Integrated Authentication with Firefox
tags:
  - Windows
  - Firefox
  - Security
redirect_from:
  - /post/44796556539/windows-integrated-authentication-with-firefox/
  - /post/44796556539/
---
Langsam aber doch bemüht sich die Firma Microsoft auch in Intranets mit ihren Softwarelösungen sowas ähnliches wie browserunabhängig zu werden. (Bei ihren Internetauftritten hat sie es zwar noch immer nicht so ganz geschafft, aber das ist eine andere Geschichte...)

Mit modernen Browsern, und da gehört natürlich trotz diverser Macken auch ein Internet Explorer 8 dazu, sowie den dazugehörigen Webtechnologien lässt es sich auch im Intranet viel schöner arbeiten; ActiveX ist alleine aus sicherheitstechnischen Gründen nicht mehr zeitgemäß; das auch mit alternativen Browsern kompatible Silverlight in großen Firmen zu etablieren ist gut für die Statistik; und zu guter Letzt ist das Unterstützen von Webstandards auch noch super fürs Image. Und den Status, welcher das voreilige Implementieren von Entwürfen bzw. das Aussperren von verbreiteten Technologien erlaubt, haben mittlerweile andere Firme und Organisationen übernommen.

Einziger Haken an der Sache ist für viele die angeblich fehlende Windows Integrated Authentication, also die Authentifizierung mittels NTLM oder Kerberos, in anderen Browsern als dem Internet Explorer. Schließlich will niemand bzw. wollen nur wenige bei jedem Aufruf eines Intranet-Systems mit einem Authentifizierungsdialog konfrontiert werden, auch wenn sich dieser Benutzername sowie Passwort merken kann. Zumindest bei Firefox sind jedoch sehr wohl Optionen vorhanden, um Single-Sign-On zu ermöglichen, allerdings werden diese vor dem User versteckt (!?).

Gibt man also in der Adresszeile "about:config" ein, so gelangt man zu dem unter Firefox-Usern bekannten "GodMode"-Panel, welches einem erlaubt so ziemlich alles zu verstellen oder sogar kaputt zu machen. Sucht man jetzt nach den Stichworten "NTLM" oder "Negotiate" (= Kerberos), wird es zumindest für Unternehmensnetzwerke interessant:

![Firefox auth](/assets/firefox-auth.png)

Folgende Einstellungen sind hier in der Regel wichtig:

* network.automatic-ntlm-auth.trusted-uris
* network.negotiate-auth.trusted-uris
* network.negotiate-auth.delegation-uris

Erstere ist -- Überraschung! -- für Uris zuständig, für welche direkt NTLM verwendet werden soll; die anderen beiden tun selbiges für Kerberos, wobei für Kerberos Delegation Szenarien (soll ja mal vorkommen) extra konfiguriert werden muss. Die im Internet Explorer verwendete *-Notation ist hier genauso möglich, nur muss der * weggelassen werden, wie auch immer diese Notation dann auch genannt werden soll.

SharePoint 2010 und Firefox vertragen sich jetzt gleich viel besser. :)
