---
layout: post
post_class: text-post
title: 407 Proxy authentication required
tags:
  - Windows
  - Security
---

Darf man hinter einem ~~guten~~ alten Proxy Server seines Arbeitgebers den täglichen Entwicklertätigkeiten mit handelsüblichen Microsoft Produkten nachgehen, so hat man wahrscheinlich das eine oder andere Mal mit Verbindungsproblemen zu kämpfen. Je nach Konfiguration des Proxys gestaltet sich ein erfolgreicher Verbindungsaufbau mehr oder weniger umständlich, wofür nicht jedes Programm gerüstet ist. Ein beliebter [Workaround][0] probiert immerhin elf verschiedene "Profile" durch, bis die "richtige" Art und Weise der Authentifizierung feststeht.

Die Tatsache, dass in jüngster Zeit immer mehr Tools nicht mehr aus *der* einen Hand kommen sondern aus dem Open Source Umfeld übernommen werden, erleichtert diese Situation nicht gerade. Ansonsten sind diese Entwicklungen natürlich ausgezeichnet, keine Frage. Wenn hingegen neben [Node][1] nicht einmal mehr [.NET Core][2] mit archaischen Proxy-Verbindungen zurecht kommt, die eine NT/LM basierte Authentifizierung benötigen, dann muss ein wenig tiefer in die Trickkiste gegriffen werden.

Der bereits erwähnte Workaround namens [Cntlm][0] wurde zwar für freie Betriebssysteme geschrieben, kann jedoch genauso in der proprietären Microsoft-Welt für freie Tools verwendet werden. Die "normale" Installation registriert allerdings ein systemweites NT-Service, das die Authentifizierung im Namen des leidgeplagten Users übernehmen soll -- für alle User des Systems. Nicht gut!

Wir laden also die zip-Variante herunter, um diese nur in unserem Kontext auszuführen. Da der Pfad zur entsprechenden ini-Datei hardcodiert ist, muss dieser immer explizit angegeben werden. Aber zu allererst werden einmal die wichtigsten Parameter ausgefüllt:

| Name     | Value                          |
|:---------|:-------------------------------|
| Username | your domain/proxy account name |
| Domain   | the actual domain name         |
| Proxy    | parent proxies to use          |

Dann kann der "richtige" Token generiert werden,

```
> cntlm -c cntlm.ini -I -M http://test.com
```

welcher auch in der cntlm.ini landet (Erklärungen bzw. Beispiele sind in der ini-Datei vorhanden), um anschließend den Proxy für den Proxy (sic!) seine Bestimmung erfüllen zu lassen.

```
> cntlm.exe -c cntlm.ini -f
```

Um jetzt nicht jedes Tool extra konfigurieren zu müssen, hat sich eine nette Konvention für Umgebungsvariablen eingebürgert. In der Regel werden `http_proxy` sowie `https_proxy` berücksichtigt, sollte in der eigentlichen Konfiguration keine entsprechende Einstellung vorgenommen worden sein. Die oft erwähnte und leider beliebte Syntax `http://user:password@proxy:port` würde übrigens einen *Cntlm* überflüssig machen -- wer will schon sein Passwort im Klartext in einer Umgebungsvariable wissen? Eben.

Nehmen wir folglich unsere lokale Variante:

| Name        | Value                 |
|:------------|:----------------------|
| http_proxy  | http://127.0.0.1:3128 |
| https_proxy | http://127.0.0.1:3128 |

Wer nun glaubt damit alle Probleme gelöst zu haben, der darf sich über Fehlermeldungen wie das brüllende *UNABLE_TO_VERIFY_LEAF_SIGNATURE* oder das dezentere *unable to verify the first certificate* freuen; zumindest, wenn der HTTPS-Verkehr aufgebrochen werden sollte, um seine Mitarbeiter besser ~~überwachen~~ vor dem bösen Sven beschützen zu können. Beim Root-Zertifikat des nicht zustande kommenden SSL-Tunnels wird es sich wohl um ein firmeneigenes handeln, welches naturgemäß nicht vertrauenswürdig ist. Dabei könnte es sich ja um eine Man-in-the-middle-Attacke handeln -- genau genommen ist es das auch. Der zum Abbruch führende Fehler ist also sowohl nachvollziehbar als auch korrekt.

Im Optimalfall ist es möglich, für gewisse Domains eine Ausnahme von diesem Irrsinn zu beantragen, was auf jeden Fall zu bevorzugen ist. Die oft empfohlene Variante, einfach die SSL-Validierung über mehr oder weniger üble Hacks zu deaktivieren, ist hingegen grundsätzlich zu vermeiden. Das sollte sich auch gut argumentieren lassen: möchte der Arbeitgeber wirklich, dass Code in internen Anwendungen zum Einsatz kommt, der über eine "unsichere Verbindung" bezogen wird? I hope not.

Sollten alle Stricke reißen, so muss man sich natürlich nicht aufhängen. Allerdings sind alle Root-Zertifikate -- in der Regel im PEM-Format -- zu sammeln und beispielsweise bei *npm* via *cafile* zu [konfigurieren][3], wobei hier leider keine allgemein übliche Konvention existiert. Es muss also jedes Tool extra versorgt werden. Deepest sympathy.


[0]: https://cntlm.sourceforge.net/
[1]: https://github.com/npm/npm/issues/2866
[2]: https://github.com/dotnet/cli/issues/3065
[3]: https://docs.npmjs.com/misc/config
