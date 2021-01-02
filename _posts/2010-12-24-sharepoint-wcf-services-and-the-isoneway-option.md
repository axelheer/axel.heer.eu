---
layout: post
post_class: text-post
title: SharePoint WCF Services and the IsOneWay option
tags:
  - Development
  - SharePoint
  - WCF
  - CSharp
redirect_from:
  - /post/44793756427/sharepoint-wcf-services-and-the-isoneway-option/
  - /post/44793756427/
---
Seit der 2010er Version lassen sich endlich auch [WCF Services in SharePoint integrieren][0], was sich deutlich einfacher anstellen lässt als das [Einarbeiten von ASP.NET Webservices][1], da bei den ganzen Metadaten keine Handarbeit mehr notwendig ist...

Verwendet man jedoch die eine oder andere Optionsmöglichkeit bei der Deklaration des [Operation Contracts][2], so verhält sich SharePoint 2010 -- wieder einmal -- ein wenig seltsam: konkret wird beim Enablen der Option [IsOneWay][3] der [SPContext][4] nicht mehr richtig gesetzt! Was auch immer da im Hintergrund passiert, der Kontext bezieht sich dann meistens auf die Root Website der Root Site Collection; manchmal stimmt er aber auch.

Beispiel:

```csharp
public interface ISomeService
{
    [OperationContract]
    void Fire();

    [OperationContract(IsOneWay = true)]
    void FireAndForget();
}
```

Die erste Operation / Methode / Funktion arbeitet so wie es im Standard vorgesehen ist, während bei der zweiten das Resultat aus Performancegründen oder einfach mangels Interesse ignoriert werden soll. So praktisch das auch sein mag, irgendwie hat SharePoint so seine Probleme damit -- der Kontext muss erst über Umwege wiederhergestellt werden.

```csharp
[BasicHttpBindingServiceMetadataExchangeEndpoint]
[AspNetCompatibilityRequirements(RequirementsMode = AspNetCompatibilityRequirementsMode.Required)]
public class SomeService : ISomeService
{
    public void Fire()
    {
        // Use SPContext.Current...
    }

    public void FireAndForget()
    {
        var request = HttpContext.Current.Request;
        var fixedUrl = new Uri(request.Url, request.RawUrl).ToString();
        fixedUrl = fixedUrl.Remove(fixedUrl.IndexOf("/_vti_bin"));

        using (var site = new SPSite(fixedUrl))
        {
            using (var web = site.OpenWeb())
            {
                // Use site / web...
            }
        }
    }
}
```

Bessere Idee?

[0]: https://msdn.microsoft.com/en-us/library/ff521581.aspx
[1]: https://msdn.microsoft.com/en-us/library/ms464040.aspx
[2]: https://msdn.microsoft.com/library/system.servicemodel.operationcontractattribute
[3]: https://msdn.microsoft.com/library/system.servicemodel.operationcontractattribute.isoneway
[4]: https://msdn.microsoft.com/library/microsoft.sharepoint.spcontext
