---
layout: post
post_class: text-post
title: Central Certificates with Kestrel
tags:
  - Development
  - MVC
  - IIS
  - CSharp
  - Security
---

Um nicht bei jeder Website bzw. bei jeder Instanz eines Webservers der Website ein Server-Zertifikat für *https* einspielen zu müssen, bietet der *IIS* bereits seit längerer Zeit (Version 8.0) den sogenannten [Central Certificate Store][0] (kurz *CCS*). Man legt einfach alle Zertifikate auf einem File-Share ab und der *IIS* schnappt sich automatisch das Richtige, das Einhalten einer gewissen Namenskonvention vorausgesetzt. Einzige Einschränkung: alle Zertifikate müssen mit demselben Passwort geschützt werden, was bei Verwendung eines gewöhnlichen Zertifikat-Stores unter Windows im Prinzip nicht anders ist.

Wird nun bei einer .NET Core Anwendung auf den *IIS* verzichtet, um [Kestrel][1] mehr oder weniger direkt zu verwenden (Stichwort: Container), so musste bis zur aktuellen Version 2.1. die Konfiguration des *https* Endpunkts komplett im Code mittels `UseHttps` erfolgen. Bis vor Kurzem wurde auch empfohlen *Kestrel* nur innerhalb eines "richtigen" Webservers zu betreiben, weswegen das sowieso kein sonderlich spannendes Thema war. Wie auch immer, in der Version 2.1. ist eine *https* Konfiguration über die bereits sehr flexiblen .NET Core Mechanismen wie z.B. `appsettings.json` möglich, und diese wollen wir analog *CCS* nutzen!

Nachteil: für jede Anwendung muss entweder explizit auf einen Zertifikat-Store verwiesen werden, was den "pre-CCS" Zeiten entspricht, oder der Pfad zu einem .pfx-File inkl. Passwort im Klartext angegeben werden, was auch zu einer sehr verstreuten Geschichte führt. Das muss besser gehen.

Überlegung: sollten wir den Hostnamen der Anwendung bereits vorab wissen (ev. aufgrund einer [kanonischen Schreibweise][2]), so können die *CCS* Konventionen direkt beim Start angewendet werden, um das passende Zertifikat zu finden. Das Passwort könnte auch über einen hübscheren Mechanismus (z.B. *Docker Secrets*) geladen werden, was sicher auch keine schlechte Idee sein sollte. Mit den beiden Informationen in der Hand lässt sich *Kestrel* über simple .NET Core Mechanismen konfigurieren und alles wird gut.

```csharp
public static IWebHostBuilder UseCentralCertificateStore(this IWebHostBuilder builder)
{
    if (builder == null)
        throw new ArgumentNullException(nameof(builder));

    return builder.ConfigureServices((context, services) =>
    {
        var certs = context.Configuration["Whatever:CertsPath"];
        var host = context.Configuration["Whatever:CanonicalHost"];

        if (!string.IsNullOrEmpty(certs) && !string.IsNullOrEmpty(host))
        {
            var fileName = SelectFile(certs, host);
            var password = LoadPassword(context.Configuration);

            services.Configure<KestrelServerOptions>(options =>
            {
                var settings = new Dictionary<string, string>()
                {
                    ["Certificates:Default:Path"] = fileName,
                    ["Certificates:Default:Password"] = password
                };

                var configuration = new ConfigurationBuilder()
                    .AddInMemoryCollection(settings)
                    .Build();

                options.Configure(configuration);
            });
        }
    });
}
```

Die `KestrelServerOptions` haben praktischerweise eine Methode `Configure`, um eine zusätzliche Konfiguration durchzuführen.

Zum Vergleich: der *CCS* sucht zuerst nach einer .pfx-Datei mit dem Hostnamen. Sollte diese nicht existieren, wird damit begonnen den ersten Teil durch ein "\_" zu ersetzen. Also "mein.eigener.host.io.pfx", dann "\_.eigener.host.io.pfx", dann "\_.host.io.pfx", und so weiter. Sollte er nicht fündig werden, passieren schlimme Dinge. Das können wir auch.

```csharp
private static string SelectFile(string certs, string host)
{
    foreach (var fileName in FileNames(host))
    {
        var path = Path.Combine(certs, fileName + ".pfx");

        if (File.Exists(path))
        {
            return path;
        }
    }

    throw new InvalidOperationException($"No certificate for '{host}' found at '{certs}'.");
}

private static IEnumerable<string> FileNames(string host)
{
    yield return host;

    var index = host.IndexOf('.');

    while (index > 0)
    {
        yield return "_" + host.Substring(index);

        index = host.IndexOf('.', index + 1);
    }
}
```

Fehlt nur noch das Passwort: dieses wurde im *CCS* hinterlegt und von diesem vermutlich irgendwie sicher abgelegt, was wir von einem Passwort in einem .json-File nicht wirklich behaupten können. Docker beispielsweise hängt dazu ein eigenes File in den laufenden Container, aber wir können uns natürlich alle Optionen offen halten. Zumindest zwei weitere.

```csharp
private static string LoadPassword(IConfiguration configuration)
{
    var password = configuration["CERTS_PASSWORD"];

    if (!string.IsNullOrEmpty(password))
    {
        return password;
    }

    var path = configuration["CERTS_PASSWORD_PATH"]
        ?? Environment.ExpandEnvironmentVariables(@"%ProgramData%\Docker\secrets\certs_password");

    if (File.Exists(path))
    {
        return File.ReadLines(path).First();
    }

    throw new InvalidOperationException($"No certificate secret found at '{path}'.");
}
```

Sollte sogar mehr als ein Hostname pro Anwendung notwendig sein, so lässt sich das mittels `ServerCertificateSelector` (auch seit Version 2.1) weiter spinnen.


[0]: https://docs.microsoft.com/en-us/iis/web-hosting/scenario-build-a-web-farm-with-iis-servers/configuring-step-4-configure-ssl-central-certificate-store
[1]: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel
[2]: /2017/06/25/canonical-host-names-with-asp-net-core/
