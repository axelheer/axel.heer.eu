---
layout: post
post_class: text-post
title: MEF for WCF!
tags:
  - Development
  - MEF
  - WCF
  - CSharp
redirect_from:
  - /post/55008944216/mef-for-wcf/
  - /post/55008944216/
---
Das seit .NET 4.0 eingeführte *Managed Extensibility Framework* (kurz MEF) hat leider noch nicht seinen Weg in die *Windows Communication Foundation* (kurz WCF) gefunden (falls doch, kann das Weiterlesen ab sofort unterlassen werden). Darüber hinaus ist leider nur wenig zu diesem Thema zu finden -- eine ordentliche Lösung, in der MEF-Exports auch wieder sauber "released" werden, irgendwie schwer bis gar nicht.

Grundsätzlich bietet sich die Implementierung einer [IServiceBehavior][0] an, um den [IInstanceProvider][1] für Services auszutauschen, welche nicht direkt von WCF, sondern eben von MEF initialisiert werden sollen. Dafür gibt es verschiedene Möglichkeiten, wobei sich die Variante als Attribut geradezu aufdrängt, da MEF bereits "Attribut-gesteuert" arbeitet.

Gesagt, getan:

```csharp
public class ComposedServiceAttribute: Attribute, IServiceBehavior {
    public string ContractName { get; set; }

    public void AddBindingParameters(ServiceDescription serviceDescription, ServiceHostBase serviceHostBase, Collection<ServiceEndpoint> endpoints, BindingParameterCollection bindingParameters) {
    }

    public void ApplyDispatchBehavior(ServiceDescription serviceDescription, ServiceHostBase serviceHostBase) {
        var endpoints = serviceHostBase.ChannelDispatchers
                                       .OfType<ChannelDispatcher>()
                                       .SelectMany(d => d.Endpoints)
                                       .Where(e => !e.IsSystemEndpoint);
        foreach (var e in endpoints) {
            e.DispatchRuntime.InstanceProvider = new ComposedInstanceProvider(
                serviceDescription.ServiceType, ContractName ?? AttributedModelServices.GetContractName(serviceDescription.ServiceType));
        }
    }

    public void Validate(ServiceDescription serviceDescription, ServiceHostBase serviceHostBase) {
    }
}
```

Somit wird für alle Endpoints eines entsprechend dekorierten Services der `InstanceProvider` getauscht, was für ein MEF basiertes WCF Service ungefähr so aussehen könnte:

```csharp
[Export]
[ComposedService]
public class MyService : IMyService {
    private readonly Whatever whatever;

    [ImportingConstructor]
    public MyService(Whatever whatever) {
        if (whatever == null) {
            throw new ArgumentNullException("whatever");
        }
        this.whatever = whatever;
    }

    public void DoWork() {
        whatever.Call();
    }
}
```

Gut, so ungefähr arbeiten wohl die meisten IoC Ansätze für WCF... Wirklich interessant wird erst der `InstanceProvider`.

```csharp
public class ComposedInstanceProvider : IInstanceProvider {
    private readonly Type serviceType;
    private readonly string contractName;

    public ComposedInstanceProvider(Type serviceType, string contractName) {
        if (serviceType == null) {
            throw new ArgumentNullException("serviceType");
        }
        if (string.IsNullOrEmpty(contractName)) {
            throw new ArgumentNullException("contractName");
        }
        this.serviceType = serviceType;
        this.contractName = contractName;
    }

    public object GetInstance(InstanceContext instanceContext, Message message) {
        return GetInstance(instanceContext);
    }

    public object GetInstance(InstanceContext instanceContext) {
        instanceContext.Extensions.Add(new ComposedContainerExtension());

        var container = instanceContext.Extensions.Find<ComposedContainerExtension>().Container;
        var export = container.GetExports(serviceType, null, contractName).Single();

        return export.Value;
    }

    public void ReleaseInstance(InstanceContext instanceContext, object instance) {
        var extension = instanceContext.Extensions.Find<ComposedContainerExtension>();
        instanceContext.Extensions.Remove(extension);
    }
}
```

Der Clou an dieser Variante ist die Verwendung einer [IExtension][2], um die Lifetime eines Containers bzw. eines Exports zu steuern. Wird nämlich in der Methode `ReleaseInstance` analog zur eigentlichen WCF Implementierung einfach nur die Instanz "disposed", so kann es von MEF initialisierte Abhängigkeiten geben, welche nicht sofort freigegeben werden -- bei nicht allzu winzigen Systemen wird das auch der Fall sein.

In diesem Beispiel ist das Erstellen eines MEF-Containers also die Aufgabe der Extension, wofür sich die Methode [Attach][3] anbieten würde. Das Aufräumen wäre dann der Job von [Detach][4]. Unter Umständen kann es auch mehr Sinn machen, den Container auf eine andere Art und Weise zu bauen, um der Extension nur mehr das Abholen sowie Freigeben von Exports zu überlassen.

Wie auch immer, die Extension sei dem Leser als Übung überlassen.

[0]: https://msdn.microsoft.com/library/System.ServiceModel.Description.IServiceBehavior
[1]: https://msdn.microsoft.com/library/System.ServiceModel.Dispatcher.IInstanceProvider
[2]: https://msdn.microsoft.com/library/ms586703
[3]: https://msdn.microsoft.com/library/ms575341
[4]: https://msdn.microsoft.com/library/ms575342
