---
layout: post
post_class: text-post
title: Handy-Signatur with ASP.NET Core using OpenID Connect
tags:
  - Development
  - MVC
  - CSharp
  - Security
---

Steht man vor der Herausforderung, ein eher proprietäres Mittel zur Authentifikation -- nämlich die [österreichische Handy-Signatur][0] -- für eine Anwendung einzubinden, die mit einem relativ jungen und somit vermeintlich modernen Framework wie [ASP.NET Core][1] geschrieben wird, so halten sich die Aussichten auf Erfolg einmal in Grenzen. Stichwort: Erfolgssteigerung durch Erwartungsreduktion. Zwischen diesen beiden Welten wird es wohl kaum eine gemeinsame Schnittmenge geben, oder? Und es gibt sie doch: [OpenID Connect][2]. :tada:

Während mittlerweile in Bezug auf Authentifizierung sowie Autorisierung "eh fast alles" auf OAuth aufzubauen scheint -- sogar OpenID mit ihrer "Connect" Variante -- dürften derartig standardisierte Mechanismen auch vom [E-Government Innovation Center][3] implementiert und [demonstriert][4] werden. Das trifft sich natürlich ausgezeichnet, schließlich bietet *ASP.NET Core* zahlreiche [Möglichkeiten][5] externe Dienste einzubinden, die in der Regel auf genau diese Techniken setzen. Neben sehr spezifischen Implementierungen für z.B. Twitter stellt ASP.NET eine allgemeine [OpenID Connect Middleware][6] zur Verfügung, die im Folgenden für eine Anbindung der Handy-Signatur verwendet werden soll.

Die schlechte Nachricht zuerst: ein *OpenID Connect Discovery* wird nicht unterstützt. Damit wären gerade einmal zwei oder drei Parameter -- *Authority* sowie *ClientID* und ev. ein *Secret* -- notwendig und es würde einfach so funktionieren. Um diese "Experience" auszuprobieren, kann beispielsweise ein *Azure AD* herangezogen werden...

Und die gute Nachricht: wir können die *Middleware* händisch nach [Dokumentation][7] konfigurieren -- die *Discovery* ist "nur" ein optionaler Teil der Spezifikation. Wieso also Aufwand in ein Service stecken, wenn man diesen den Clients aufbürden kann?

1. Das Zertifikat für die Validierung der ausgestellten Tokens ist zwingend (!) notwendig

    ```csharp
    var issuerSigningCert = new X509Certificate2("...");
    ```

2. Die obligatorischen Parameter ID + Secret (wären auch bei einer *Discovery* anzugeben)

    ```csharp
    var options = new OpenIdConnectOptions
    {
        ClientId = "...",
        ClientSecret = "...",

        /* ... */
    }
    ```

3. Endpunkte für *AuthCode*- sowie *AccessToken*-Requests

    ```csharp
    {
        /* ... */

        Configuration = new OpenIdConnectConfiguration
        {
            AuthorizationEndpoint = "...",
            TokenEndpoint = "..."
        },

        /* ... */
    }
    ```

4. *Mode* sowie *Type* weicht von den .NET Core Defaults ab

    ```csharp
    {
        /* ... */

        ResponseMode = OpenIdConnectResponseMode.Query,
        ResponseType = OpenIdConnectResponseType.Code,

        /* ... */
    }
    ```

5. *Nonce* Artifakte werden (noch?) nicht unterstützt (siehe Doku)

    ```csharp
    {
        /* ... */

        ProtocolValidator = new OpenIdConnectProtocolValidator
        {
            RequireNonce = false,
            RequireStateValidation = false
        },

        /* ... */
    }
    ```

6. Die ausgestellten Tokens wollen unbedingt validiert werden

    ```csharp
    {
        /* ... */

        TokenValidationParameters = new TokenValidationParameters
        {
            IssuerSigningKey = new X509SecurityKey(issuerSigningCert)
            {
                KeyId = "..."
            },
            ValidIssuer = "..."
        },

        /* ... */
    }
    ```

7. Zu guter Letzt können Fehler abgefangen werden (optional)

    ```csharp
    {
        /* ... */

        Events = new OpenIdConnectEvents
        {
            OnMessageReceived = context =>
            {
                if (!string.IsNullOrWhiteSpace(context.ProtocolMessage.Error))
                {
                    var remoteError = WebUtility.UrlEncode(context.ProtocolMessage.ErrorDescription);
                    context.Response.Redirect("/error?remoteError=" + remoteError);
                    context.HandleResponse();
                }

                return Task.CompletedTask;
            }
        }
    }
    ```

Unter der Annahme alles richtig konfiguriert zu haben, kann schlussendlich die *OpenID Connect Middleware* analog zu allen anderen registriert werden; jedenfalls vor *MVC* oder ähnlichem. Ansonsten würde die Authentifizierung nach dem Aufruf der eigentlichen Anwendung stattfinden, was nicht funktionieren kann...

```csharp
public void Configure(IApplicationBuilder app)
{
    /* ... */

    app.UseOpenIdConnectAuthentication(options);

    app.UseMvc();
}
```

Und die beste Nachricht: das harmoniert mit *ASP.NET Identity* & Co.


[0]: https://www.handy-signatur.at/
[1]: https://docs.microsoft.com/aspnet/core/
[2]: https://openid.net/connect/
[3]: https://www.egiz.gv.at/
[4]: https://demo.egiz.gv.at/demoportal-openID_demo/
[5]: https://docs.microsoft.com/aspnet/core/security/authentication/social/
[6]: https://www.nuget.org/packages/Microsoft.AspNetCore.Authentication.OpenIdConnect
[7]: https://joinup.ec.europa.eu/site/moa-idspss/moa-id-3.x/doc/handbook/protocol/protocol.html#openid
