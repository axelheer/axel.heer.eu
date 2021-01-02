---
layout: post
post_class: text-post
title: Let MEF inject your settings
tags:
  - Development
  - MEF
  - CSharp
redirect_from:
  - /post/59689895448/let-mef-inject-your-settings/
  - /post/59689895448/
---
In der Welt von *Inversion of Control* schickt es sich einfach nicht, direkt auf seine *Application settings* zurückzugreifen, man überlässt diese niedere Tätigkeit seinem *Assembler* / *Container* / *Wie-auch-immer*. Während diverse IoC/DI-Frameworks einen entsprechenden Mechanismus bereits vorgesehen haben, muss man beim *Managed Extensibility Framework* ein wenig kreativ werden: immerhin wurden für solche Fälle [ExportProvider][0] eingebaut.

Starten wir jedoch mit einem Wunschkonzert:

```csharp
[Export]
public class Something {
    private readonly int dings;

    [ImportingConstructor]
    public Something(int dings) {
        this.dings = dings;
    }

    [Import]
    public DateTime Zeux { get; set; }

    [Import]
    public double Narf { get; set; }
}
```

Alle mittels `Import` markierten Member sollen via MEF befüllt werden und zwar mit Werten aus der bewährten `appSettings`-Section der aktuellen Web- oder Anwendungskonfiguration.

Der vereinfachte Kern eines *Providers*, der eben jene Funktionalität zur Verfügung stellt, könnte ungefähr so aussehen (quick & dirty):

```csharp
protected override IEnumerable<Export> GetExportsCore(ImportDefinition definition) {
    var key = default(string);
    var type = default(Type);

    if (ReflectionModelServices.IsImportingParameter(definition)) {
        var param = ReflectionModelServices.GetImportingParameter(definition);
        key = getKey(param.Value);
        type = getType(param.Value);
    } else {
        var member = ReflectionModelServices.GetImportingMember(definition);
        var info = member.GetAccessors();
        switch (member.MemberType) {
            case MemberTypes.Property:
                key = getKey(((MethodInfo)info[0]).ToProperty());
                type = getType(((MethodInfo)info[0]).ToProperty());
                break;
            default:
                throw new NotImplementedException();
        }
    }

    return new Export[] {
        new Export(definition.ContractName, ()
            => TypeDescriptor.GetConverter(type).ConvertFromInvariantString(
            ConfigurationManager.AppSettings[key]))
    };
}
```

Ein kurzer Test von diesem Teufelszeug:

```csharp
using (var container = new CompositionContainer(catalog, new SettingsProvider())) {
    //  <appSettings>
    //    <add key="Something..ctor(dings)" value="1138"/>
    //    <add key="Something.Zeux" value="2013-08-29"/>
    //    <add key="Something.Narf" value="3.14"/>
    //  </appSettings>
    var some = container.GetExportedValue<Something>();
}
```

Ausgezeichnet.

Bleibt nur noch zu überlegen, ob die Verwendung von MEF-*Contracts* in einer Form "appSettings:Dings" -- oder so ähnlich -- für Systeme, in denen vielleicht die einen oder anderen Einstellungen an mehreren Stellen importiert werden sollen, geeigneter sind. Auch eine Art Katalog-Klasse, die initial alle verfügbaren *Parts* nach passenden *Imports* durchsucht, um sich ein wenig besser vorbereiten zu können, käme der viel zu oft missachteten Performance zugute.

**Update**

[Download full sample][1]

[0]: https://msdn.microsoft.com/library/system.componentmodel.composition.hosting.exportprovider
[1]: /assets/composition-config.zip
