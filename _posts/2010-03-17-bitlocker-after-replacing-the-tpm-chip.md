---
layout: post
post_class: text-post
title: BitLocker - after replacing the TPM chip...
tags:
  - Windows
  - BitLocker
  - Security
redirect_from:
  - /post/44796138220/bitlocker-after-replacing-the-tpm-chip/
  - /post/44796138220/
---
Normalerweise, zumindest wenn man seine Daten mittels BitLocker verschlüsselt, wird die Festplatte bzw. deren Key durch einen TPM Chip freigeschalten, sofern dieser der Meinung ist, dass das System ordnungsgemäß gebootet wird. Geht jetzt aber beispielsweise das Mainboard ein, auf dem sich in der Regel eben dieser TPM Chip befindet, so muss beim nächsten Start -- natürlich auf erneuerter Hardware -- ein vielstelliger Recovery Key eingegeben werden.

Leider wird weder die neue Hardware von BitLocker automatisch konfiguriert, noch ist in der dazugehörigen Benutzeroberfläche das Fehlen einer "TPM-BitLocker-Verbindung" ersichtlich. Hier ist etwas Handarbeit notwendig, wenn man nicht bei jedem Systemstart den Key (ab)tippen möchte:

**Schritt #1:**

Zuerst muss man einmal den neuen TPM Chip initialisieren, also dessen Owner werden. Immerhin wird in der Systemsteuerung, wenn man sich bei den BitLocker Einstellungen befindet, auf die TPM Management Konsole verwiesen:

![Bitlocker](/assets/bitlocker.png)

Dort wird einem mittels Wizard geholfen, die Herrschafft über seine neue Hardware an sich zu reißen.

**Schritt #2:**

Im Normalfall sollte der alte Chip für BitLocker jetzt noch registriert sein:

```
manage-bde -protectors -get c:
```

Das "Numerical Password" ist einfach der Recovery Key. Wichtig an dieser Stelle ist die ID des TPM Key Protectors, also die Verbindung zur alten / kaputten Hardware. Weg damit:

```
manage-bde -protectors -delete c: -id {...}
```

Jetzt ist die Platte auch offiziell nur noch durch den Recovery Key geschützt.

**Schritt #3:**

```
manage-bde -protectors -add c: -tpm
```

Voila.
