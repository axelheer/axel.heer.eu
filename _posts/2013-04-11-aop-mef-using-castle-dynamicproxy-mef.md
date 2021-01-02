---
layout: post
post_class: text-post
title: AOP & MEF using Castle.DynamicProxy & MEF
tags:
  - Development
  - MEF
  - AOP
  - CSharp
redirect_from:
  - /post/47715394154/aop-mef-using-castle-dynamicproxy-mef/
  - /post/47715394154/
---
Nachdem mit dem Namespace [System.ComponentenModel.Composition][0] unter anderem ein wenig Dependency Injection ins .NET Framework integriert wurde, stellt sich die Frage, ob Aspektorientiertes Programmieren auch noch untergebracht werden kann. Die unter dem Namen *Managed Extensibility Framework* (MEF) bekannten Komponenten könnten sich ja ein wenig verbiegen / erweitern lassen.

Ein guter [Artikel][1] zu diesem Thema von Sacha Barbe existiert schon seit längerem, allerdings lässt dieser noch die einen oder anderen Wünsche offen. Konkret stand Folgendes auf der Extrawunschliste:

* pro Aspect sollen weniger als drei Klassen zu implementieren sein, im Idealfall analog zu Attributen genau eine
* kein eigener Factory Mechanismus, Aspects sollen via MEF initialisiert werden
* die durch Aspects dekorierten Klassen sollen weiterhin MEF Imports nutzen können
* die Kompatibilität mit der .NET Code Access Security soll erhalten bleiben

Starten wir mit dem Endergebnis, um alle Klarheiten zu beseitigen: so ungefähr sollte eine Klasse mit MEF Export, Import sowie Aspect aussehen.

```csharp
[Export]
public class FancyService {
    [Import]
    public virtual IWhatever Something { get; set; }

    [AspectImport(typeof(LogAspect))]
    public virtual void DoNothing() {
        // do nothing
    }

    [AspectImport(typeof(LogAspect))]
    [PrincipalPermission(SecurityAction.Demand, Role = "Wizard")]
    public virtual void DoSomeMagic() {
        // lets do some magic
    }
}
```

Sie wird / kann via MEF exportiert werden, bekommt zusätzlich ihre Dependencies über MEF Import injected und wird darüber hinaus mit Aspects ausgestattet. Das Keyword `virtual` ist leider notwendig, damit wir im Hintergrund mit Hilfe von [Castle.DynamicProxy][2] einen Proxy für die Aspects generieren können. Zum Schluss wird die Methode `DoSomeMagic` durch CAS geschützt, was natürlich nicht verloren gehen darf.

Die Implementierung des Aspects:

```csharp
[Export]
public class LogAspect : Aspect {
    private readonly ILogger log;

    [ImportingConstructor]
    public LogAspect(ILogger log) {
        this.log = log;
    }

    protected override void Execute(IInvocation invocation) {
        log.Enter(/* ... */);
        try {
            invocation.Proceed();
        } catch (Exception ex) {
            log.Fail(/* ... */);
            throw;
        }
        log.Exit(/* ... */);
    }
}
```

Wie versprochen muss für einen Aspect nur eine einzige Klasse erstellt werden. Das Interface `IInvocation` ist Teil das Castle Projects und könnte noch ein wenig abstrahiert werden, aber für Overengineering haben wir hier keinen Platz.

Und wie funktioniert das Ganze nun? Wir benötigen ein Attribut, um die Aspects in Position zu bringen, eine Basisklasse für die Aspects selbst, sowie eine entsprechende Erweiterung von MEF. Hier lässt sich ein [ExportProvider][3] schreiben oder einfach der [CompositionContainer][4] erweitern. Da mir die API von ersterem nicht gefällt, werde ich nur auf die zweite Möglichkeit eingehen.

Das Leichte zuerst:

```csharp
[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public class AspectImportAttribute : Attribute {
    public string ContractName { get; private set; }

    public Type ContractType { get; private set; }

    public AspectImportAttribute(string contractName, Type contractType) {
        if (contractType == null) {
            throw new ArgumentNullException("contractType");
        }
        if (string.IsNullOrEmpty(contractName)) {
            contractName = AttributedModelServices.GetContractName(contractType);
        }
        ContractName = contractName;
        ContractType = contractType;
    }

    public AspectImportAttribute(Type contractType)
        : this(null, contractType) {
    }
}
```

Analog zum Import Attribut von MEF wird der Contract über den Typ sowie einen optionalen Namen gesteuert.

Die Basisklasse:

```csharp
public abstract class Aspect : IInterceptor {
    void IInterceptor.Intercept(IInvocation invocation) {
        var shouldExecute = invocation.Method
            .GetCustomAttributes(typeof(AspectImportAttribute), true)
            .Cast<AspectImportAttribute>()
            .Where(a => a.ContractType.IsAssignableFrom(GetType()))
            .Any();
        if (shouldExecute) {
            Execute(invocation);
        } else {
            invocation.Proceed();
        }
    }

    protected abstract void Execute(IInvocation invocation);
}
```

Da ein Aspect in Form eines Castle Interceptors pro Object (nicht pro Member!) existiert und für *jeden* Member des Objekts aufgerufen wird, muss geprüft werden, ob für den aktuellen Member überhaupt der Aspect angewendet werden soll. Der Reflection Teil könnte je nach Anforderung, sollte er sich allzu negativ auf die Performance auswirken, in irgendeiner Form vorberechnet werden.

Die Mutter des ganzen Mechanismus:

```csharp
public class AspectCompositionContainer : CompositionContainer {
    static AspectCompositionContainer() {
        AttributesToAvoidReplicating.Add(typeof(PrincipalPermissionAttribute));
    }

    private readonly ProxyGenerator generator = new ProxyGenerator();

    public AspectCompositionContainer()
        : base() {
    }
    public AspectCompositionContainer(params ExportProvider[] providers)
        : base(providers) {
    }
    public AspectCompositionContainer(ComposablePartCatalog catalog, params ExportProvider[] providers)
        : base(catalog, providers) {
    }

    protected override IEnumerable<Export> GetExportsCore(ImportDefinition definition, AtomicComposition composition) {
        return base.GetExportsCore(definition, composition)
            .Select(e => new Export(e.Definition, () => getValue(e, composition)));
    }

    private object getValue(Export inner, AtomicComposition composition) {
        var value = inner.Value;
        var valueType = value.GetType();
        var aspectTypes = valueType.GetMethods()
            .SelectMany(m => m.GetCustomAttributes(typeof(AspectImportAttribute), true))
            .Cast<AspectImportAttribute>()
            .Select(a => new { a.ContractName, a.ContractType })
            .Distinct();
        if (aspectTypes.Any()) {
            var aspects = aspectTypes
                .Select(a => new ContractBasedImportDefinition(
                    a.ContractName,
                    AttributedModelServices.GetTypeIdentity(a.ContractType),
                    null,
                    ImportCardinality.ExactlyOne,
                    false,
                    true,
                    CreationPolicy.Any))
                .Select(d => GetExports(d, composition).Single().Value)
                .Cast<Aspect>()
                .ToArray();
            value = generator.CreateClassProxyWithTarget(valueType, value, aspects);
        }
        return value;
    }
}
```

Zu Beginn wird das PrincipalPermission Attribut von der Replizierung durch Castle ausgeschlossen -- es ist besser so.

Der wirklich interessante Teil beginnt in der Überladung der Methode `GetExportsCore`: für jeden Export wird eine Art Export-Hülle erstellt, welche in einer Factory Methode `getValue` unter Umständen einen Proxy inkl. Aspects erstellt. Konkret wird via Reflection überprüft, ob Methoden vorhanden sind, die mittels AspectImport Attribut geschmückt wurden. Mit LINQ lässt sich das relativ nett inkl. Selection der entsprechenden MEF Contracts verpacken.

Sind nun Aspects als Teil des MEF Exports gefragt, werden entsprechende MEF Import-Definitionen generiert und als Teil der aktuellen MEF Composition geladen, um schlussendlich mit Hilfe des Castle.DynamicProxy in Form von Interceptor Komponenten eingesetzt zu werden.

Hui.

**Update**

[Download full sample][5]

[0]: https://msdn.microsoft.com/library/system.componentmodel.composition
[1]: https://www.codeproject.com/Articles/223266/Bringing-AOP-to-MEF
[2]: https://www.castleproject.org/projects/dynamicproxy/
[3]: https://msdn.microsoft.com/library/system.componentmodel.composition.exportprovider
[4]: https://msdn.microsoft.com/library/system.componentmodel.composition.compositioncontainer
[5]: /assets/composition-aspects.zip
