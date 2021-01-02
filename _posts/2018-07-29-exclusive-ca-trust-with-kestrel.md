---
layout: post
post_class: text-post
title: Exclusive CA trust with Kestrel
tags:
  - Development
  - MVC
  - IIS
  - CSharp
  - Security
---

Möchte man neben [Server-Zertifikaten][2] auch Client-Zertifikate einsetzen, so wird einem bei [Kestrel][1] genauso geholfen. Wie von anderen Webservern gewohnt, können diese akzeptiert oder sogar verlangt werden. *Kestrel* führt dabei gleich eine Validierung mit Bordmitteln durch, um sicher zu stellen, dass sich die Anwendung nicht um jeden Mist kümmern muss bzw. diesen mangels entsprechender Voraussicht sogar akzeptiert.

Jedoch genügt es oft nicht, dass ein Client-Zertifikat grundsätzlich gültig ist. Ein gültiges Zertifikat ist ja nicht so schwer zu bekommen (hier Seitenhieb einbauen), die Anwendung vertraut vielleicht nur einem ganz bestimmten Zertifikat-Issuer, was sich aus dem Root-Zertifikat oder einer Zwischenstelle der Zertifikatskette ableiten lässt. Beispielsweise wird ein zusätzlicher Token übermittelt, der nur gelesen wird, sollte die Verbindung von einem vertrauenswürdigen Client aufgebaut worden sein. Oder es werden Felder aus dem Zertifikat für eine Authentifizierung bzw. Autorisierung herangezogen, welche genauso gut anderswo zu bekommen wären...

Früher noch, zumindest unter Windows, wurden eigene Zertifkat-Stores definiert, die eben jene besonders vertrauenswürdigen Issuer beinhalten sollen. Und das nur, um die [SChannel-Geschichte][0] mit dem passenden *ClientAuthTrustMode* zu konfigurieren, um dann mittels *netsh* die entsprechenden "SSL-Bindings" zu erstellen, welche schlussendlich von z.B. einem *IIS* verwendet werden konnten. Das war natürlich viel einfacher als die *CTLs* davor (hier zweiten Seitenhieb einbauen). Wenn man schließlich alles richtig gemacht hat, wurde nur mehr den "richtigen" Zertifikaten vertraut. Wenn nicht, dann eben auch anderen oder sogar gar keinen.

Zurück zu Kestrel: ist ein Client-Zertifikat gewünscht und sollte in der Zertifikat-Kette ein bestimmter Issuer vorkommen, so lässt sich ein einfacher Mechanismus mittels `ConfigureHttpsDefaults` für alle *https* Verbindungen konfigurieren.

```csharp
public static IWebHostBuilder UseClientAuthIssuer(this IWebHostBuilder builder)
{
    if (builder == null)
        throw new ArgumentNullException(nameof(builder));

    return builder.ConfigureServices((context, services) =>
    {
        var exclusive = BuildExclusiveTrust("ClientAuthIssuer");

        services.Configure<KestrelServerOptions>(options =>
        {
            options.ConfigureHttpsDefaults(defaults =>
            {
                defaults.ClientCertificateMode = ClientCertificateMode.RequireCertificate;
                defaults.ClientCertificateValidation = (client, chain, errors) =>
                    errors == SslPolicyErrors.None && exclusive(chain);
            });
        });
    });
}
```

**Achtung:** im Gegensatz zu anderen Webservern ist eine gewöhnliche *http* Verbindung damit noch nicht untersagt! Darum muss man sich separat kümmern! (weiterleiten, gar nicht erst zulassen, ...)

Wir verlangen lediglich, dass die "Kette" einwandfrei ist und fügen ein zusätzliches "Trust-Kriterium" hinzu.

```csharp
private static Func<X509Chain, bool> BuildExclusiveTrust(string storeName)
{
    X509Certificate2[] trust;

    using (var store = new X509Store(storeName, StoreLocation.LocalMachine))
    {
        store.Open(OpenFlags.ReadOnly);

        trust = store.Certificates.Cast<X509Certificate2>().ToArray();

        store.Close();
    }

    return chain => chain.ChainElements.Cast<X509ChainElement>().Select(e => e.Certificate).Intersect(trust).Any();
}
```

Wie genau dieses Kriterium auszusehen hat, ist hier natürlich flexibler als die fixen *ClientAuthTrustMode* Varianten.


[0]: https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-R2-and-2012/dn786429(v=ws.11)
[1]: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel
[2]: /2018/07/15/central-certificates-with-kestrel/
