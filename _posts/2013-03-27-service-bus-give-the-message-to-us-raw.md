---
layout: post
post_class: text-post
title: Service Bus - give the message to us raw and w-r-r-riggling
tags:
  - Development
  - ServiceBus
  - CSharp
redirect_from:
  - /post/46440249070/service-bus-give-the-message-to-us-raw-and/
  - /post/46440249070/
---
So praktisch die automatische Serialisierung und Deserialisierung von Nachrichten in der [Service Bus][0] API ist, irgendwann könnte man in die Verlegenheit kommen, einfach den rohen Inhalt einer Nachricht wofür-auch-immer zu benötigen. Ein Blick in die Doku der Klasse [BrokeredMessage][1] erweckt leider den Eindruck, dass diese Bytes gar nicht zugänglich sind.

Sieht man sich jedoch einfach den "Code" an -- Stichwort [ILSpy][2] --, so sieht die Lage (vereinfacht) gleich viel besser aus.

```csharp
// Microsoft.ServiceBus.Messaging.BrokeredMessage
public T GetBody<T>()
{
    if (typeof(T) == typeof(Stream))
    {
        return this.BodyStream;
    }
    else
    {
        return this.GetBody<T>(new DataContractBinarySerializer(typeof(T)));
    }
}
```

Auch wenn diese Möglichkeit, an den `BodyStream` heranzukommen, nicht allzu offiziell zu sein scheint, lässt sich die Lösung wie folgt zusammenfassen.

```csharp
var message = new BrokeredMessage("Das ist ein Bingo!",
    new DataContractSerializer(typeof(string)));
using (var reader = new StreamReader(message.GetBody<Stream>())) {
    var body = reader.ReadToEnd();
    // <string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">
    //   Das ist ein Bingo!
    // </string>
}
```

Gollum!

[0]: https://msdn.microsoft.com/library/jj193022.aspx
[1]: https://msdn.microsoft.com/library/microsoft.servicebus.messaging.brokeredmessage.brokeredmessage
[2]: https://ilspy.net/
