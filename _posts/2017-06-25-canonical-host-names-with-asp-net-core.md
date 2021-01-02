---
layout: post
post_class: text-post
title: Canonical host names with ASP.NET Core
tags:
  - Development
  - MVC
  - CSharp
---

Seit Version 1.1 bietet ASP.NET Core eine [URL Rewriting Middleware][0], um unabhängig vom eingesetzten Webserver -- und vielleicht ein wenig komfortabler -- Regeln zu definieren, die ein Umschreiben eingehender URLs bewirken sollen. Das kann sinnvoll sein, um legacy Adressen weiter zu unterstützen, ein wenig SEO zu betreiben, oder einfach nur HTTPS freundlich aber doch zu erzwingen.

Nachdem es sich um eine gewöhnliche .NET Core Komponente handelt, lassen sich Regeln nicht nur in "spezieller" [IIS][1]- oder [Apache][2]-Syntax formulieren, sondern auch (!) direkt mittels C# implementieren und einbinden; oder einer anderen .NET tauglichen Sprache, versteht sich. Eine oft übliche Regel, nämlich die Normalisierung des *Host Names*, kann so relativ simpel umgesetzt werden: es ist lediglich das Interface `IRule` anzuwenden.

```csharp
public class CanonicalHostRule : IRule
{
    public HostString Host { get; set; }

    public int StatusCode { get; set; }

    public void ApplyRule(RewriteContext context)
    {
        if (context == null)
            throw new ArgumentNullException(nameof(context));

        if (context.HttpContext.Request.Host != Host)
        {
            var request = context.HttpContext.Request;
            var newUrl = new StringBuilder()
                .Append(request.Scheme)
                .Append("://")
                .Append(Host)
                .Append(request.PathBase)
                .Append(request.Path)
                .Append(request.QueryString);

            var response = context.HttpContext.Response;
            response.StatusCode = StatusCode;
            response.Headers[HeaderNames.Location] = newUrl.ToString();

            context.Result = RuleResult.EndResponse;
        }
    }
}
```

Entspricht der *Host* des *Request* nicht der gewünschten "normalisierten" Schreibweise, so wird direkt eine angepasste URL generiert und mit dem konfigurierten *Status Code* an den Client zurückgeschickt. That's it.

Für die Registrierung eben dieser Regel kann man noch mittels *Extension Method* der aktuellen Mode entsprechen:

```csharp
public static class CanonicalHostExtensions
{
    public static RewriteOptions AddCanonicalHost(this RewriteOptions options, string host, int statusCode = StatusCodes.Status302Found)
    {
        if (options == null)
            throw new ArgumentNullException(nameof(options));

        return AddCanonicalHost(options, new HostString(host), statusCode);
    }

    public static RewriteOptions AddCanonicalHost(this RewriteOptions options, HostString host, int statusCode = StatusCodes.Status302Found)
    {
        if (options == null)
            throw new ArgumentNullException(nameof(options));

        options.Rules.Add(new CanonicalHostRule
        {
            Host = host,
            StatusCode = statusCode
        });

        return options;
    }
}
```

Eine praktikable Konfiguration, die beispielsweise HTTPS sowie einen kanonischen Host "erzwingt", kann nun in der globalen `Startup.cs` mittels *Rewrite Middleware* eingebunden werden:

```csharp
var options = new RewriteOptions()
    .AddRedirectToHttps(StatusCodes.Status303SeeOther)
    .AddCanonicalHost("axel.heer.eu", StatusCodes.Status303SeeOther);

app.UseRewriter(options);
```

Ob das jetzt einfacher oder zumindest klarer als eine äquivalente Apache- oder IIS-Konfiguration sein soll, bleibt dem guten Geschmack überlassen. Jedenfalls wird eine ASP.NET Core Anwendung damit eine Spur unabhängiger vom Webserver, welcher auch immer das dann im produktiven Einsatz sein möge.


[0]: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/url-rewriting
[1]: https://docs.microsoft.com/en-us/iis/extensions/url-rewrite-module/url-rewrite-module-20-configuration-reference
[2]: https://httpd.apache.org/docs/current/mod/mod_rewrite.html