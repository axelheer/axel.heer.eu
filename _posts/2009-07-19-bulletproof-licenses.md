---
layout: post
post_class: text-post
title: Bulletproof Licenses
tags:
  - Development
  - Security
  - Math
  - CSharp
redirect_from:
  - /post/44798208316/bulletproof-licenses/
  - /post/44798208316/
---
es gibt fix fertige tools, die einem das lizenzieren und schützen seiner software abnehmen wollen, doch keines davon konnte mich wirklich begeistern. also habe ich nach guten methoden gesucht, so etwas selbst zu entwickeln -- bewährtes also, um nicht das rad neu zu erfinden. doch diese haben mir nur gezeigt, warum die meisten lizenzsysteme in kürzester zeit geknackt werden. spannend, was da in diversen artikeln von sogenannten experten alles erklärt wird... ^^

abgesehen von der ganzen lizenzierungsgeschichte gibt es jedoch ein gebiet, in dem wirklich geniale methoden erfunden wurden, um daten zu schützen: die kryptographie. wieso also sich nicht einfach dort bedienen? und, wieso bin ich eigentlich nicht gleich auf diese idee gekommen?! auf jeden fall möchte ich in diesem post eine einfache, auf dem [rsa-kryptosystem] basierende, methode vorstellen, um lizenzen auszustellen und zu prüfen.

zu allererst muss eine lizenz natürlich angefordert werden. im "großen" szenario gibt der user einen kleinen schlüssel ein, den er entweder auf seiner cd hülle findet oder per mail von einem online shop erhalten hat. mit diesem kleinen schlüssel wird dann von einem aktivierungsserver ein großer schlüssel angefordert, der schlussendlich die richtige lizenz enthält. jetzt, in meinem "kleinen" szenario, werden ein paar firmenkunden betreut, welche direkt den großen schlüssel ausgestellt bekommen sollen. bei dem vorgeplänkel mit aktivierungsserver wären die genauen abläufe sowieso nicht so spannend, um darüber zu bloggen (varianten ohne aktivierung kann man sich meiner meinung nach sowieso sparen. der kleine schlüssel auf der cd hülle ist schnell abgeschrieben und eine mail ist noch schneller weitergeleitet...).

der große aktivierungsschlüssel soll also alle wichtigen informationen zur lizenz enthalten, wie zum beispiel welche features freigeschalten sind oder sogar ein eventuelles ablaufdatum einer testversion. darüber hinaus ist noch eine id ganz wichtig, mit welcher der verwendete pc/server oder user eindeutig festgenagelt werden kann. schließlich soll die aktivierung nur genau einmal verwendet werden können! hier gibt es wieder einmal je nach zielgruppe bessere und weniger gute möglichkeiten: bei einem gewöhnlichen pc bieten sich hardwarekomponenten wie beispielsweise die cpu an, aus denen unveränderbare seriennummern ausgelesen werden können. bei serverseitiger software in firmennetzwerken tuts auch der servername inkl. domain, während die cpu zu komplikationen führen könnte -- stichwort virtualisierung.

wo waren wir stehen geblieben? der große aktivierungsschlüssel, der die lizenz enthält... flexibilität! die lizenz darf eine beliebige .net klasse sein, wobei in der regel ein struktur ausreichen sollte. diese wird gespeichert, also serialisiert, um anschließend einen hash wert daraus zu berechnen. kommen wir endlich zum punkt: dieser hash wert wird mit dem im .net framework praktischerweise bereits enthaltenen [rsa crypto service provider][1] verschlüsselt. der dabei verwendete private schlüssel darf natürlich niemals das haus verlassen! der öffentliche schlüssel kann direkt mit der software ausgeliefert werden, welche dann einfach überprüfen kann, ob die lizenz auch wirklich passt. der user bzw. admin kann also, wenn er sich die arbeit macht, die lizenz aus dem aktivierungsschlüssel auslesen; verändert er sie jedoch, wird das sofort erkannt -- böse.

zuerst benötigen wir einen key generator. dieser erstellt die gewünschte lizenz, wie bereits gesagt ein beliebiges .net objekt mit allen benötigten informationen, welche anschließend zu einem aktivierungsschlüssel verarbeitet wird:

```csharp
using System;
using System.IO;
using System.Security.Cryptography;
using System.Runtime.Serialization.Formatters.Binary;

public sealed class MasterLicenseManager<T>
{
    private const string PrivateKey = "...";

    public byte[] SaveLicense(T value)
    {
        if (value == null)
            throw new ArgumentNullException("value");

        var binary = ConvertToBinary(value);

        using (var provider = new RSACryptoServiceProvider())
        {
            provider.FromXmlString(PrivateKey);

            var sign = provider.SignData(
                binary, new SHA1CryptoServiceProvider());

            var key = new byte[binary.Length + sign.Length];

            Array.Copy(binary, key, binary.Length);
            Array.Copy(sign, 0, key, binary.Length, sign.Length);

            return key;
        }
    }

    private static byte[] ConvertToBinary(T value)
    {
        if (value == null)
            throw new ArgumentNullException("value");

        var formatter = new BinaryFormatter();

        using (var stream = new MemoryStream())
        {
            formatter.Serialize(stream, value);

            return stream.ToArray();
        }
    }
}
```

während die masterklasse natürlich nur im key generator enhalten ist, bekommt die software eine client version mit dem öffentlichen schlüssel:

```csharp
using System;
using System.IO;
using System.Security.Cryptography;
using System.Runtime.Serialization.Formatters.Binary;

public sealed class ClientLicenseManager<T>
{
    private const string PublicKey = "...";

    public T LoadLicense(byte[] key)
    {
        if (key == null)
            throw new ArgumentNullException("key");

        using (var provider = new RSACryptoServiceProvider())
        {
            provider.FromXmlString(PublicKey);

            if (key.Length <= provider.KeySize / 8)
                throw new InvalidKeyException("Bad length.");

            var sign = new byte[provider.KeySize / 8];
            var binary = new byte[key.Length - sign.Length];

            Array.Copy(key, binary, binary.Length);
            Array.Copy(key, binary.Length, sign, 0, sign.Length);

            var isValid = provider.VerifyData(
                binary, new SHA1CryptoServiceProvider(), sign);

            if (!isValid)
                throw new InvalidKeyException("Bad signature.");

            return ConvertFromBinary(binary);
        }
    }

    private static T ConvertFromBinary(byte[] value)
    {
        if (value == null)
            throw new ArgumentNullException("value");

        var formatter = new BinaryFormatter();

        using (var stream = new MemoryStream(value, false))
        {
            try
            {
                var key = formatter.Deserialize(stream);

                return (T)key;
            }
            catch
            {
                throw new InvalidKeyException("Bad license.");
            }
        }
    }
}
```

hat die software erfolgreich die lizenz aus dem aktivierungsschlüssel ausgelesen, so muss sie nur noch überprüfen, ob die lizenz im aktuellen kontext auch verwendet werden darf -- stichwort: cpu/servername/ablaufdatum, wobei diesen job eigentlich die lizenz durch eine validate-methode übernehmen kann.

ein paar kleinigkeiten sind noch erwähnenswert...

so werden neue schlüsselpaare erstellt:

```csharp
var provider = new RSACryptoServiceProvider();

var publicKey = provider.ToXmlString(false);
var privateKey = provider.ToXmlString(true);
```

so schaut das erstellen des aktivierungsschlüssels aus:

```csharp
var master = new MasterLicenseManager<MyLicense>();
key = master.SaveLicense(license);
```

und so das auslesen der lizenz:

```csharp
var client = new ClientLicenseManager<MyLicense>();
license = client.LoadLicense(key);
```

einfach, aber sicher. :)

[0]: https://de.wikipedia.org/wiki/RSA-Kryptosystem
[1]: https://msdn.microsoft.com/library/system.security.cryptography.rsacryptoserviceprovider
