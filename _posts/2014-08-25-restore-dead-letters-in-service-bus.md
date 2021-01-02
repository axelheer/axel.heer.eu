---
layout: post
post_class: text-post
title: Restore dead letters in Service Bus
tags:
  - Development
  - ServiceBus
  - CSharp
---
Landen einmal aufgrund unglücklicher Umstände viele oder nur wenige Nachrichten in der sogenannten "Dead Letter Queue", so werden diese nicht mehr zugestellt. Schließlich schmecken sie einem System nicht, es kommt zu Abstürzen oder auch weniger apokalyptischen Szenarien. Wurde schlussendlich die Ursache für dieses lästige Verhalten gefunden (und sogar behoben), so könnte es im Interesse eines gewissen Personenkreises liegen, eben jene Nachrichten noch einmal auf ihre Reise zu schicken.

Leider sind im Standardsortiment von *Windows Azure Service Bus* bzw. *Service Bus for Windows Server* (kürzere Produktnamen, bitte!) keine Mittel vorhanden, um auf direktem Wege alle totgeglaubten Botschaften wiederzubeleben. Nun handelt es sich bei der "Dead Letter Queue" -- wie der Name bereits vermuten lässt -- um eine gewöhnliche *Queue*, welche auch als ebensolche angesprochen werden darf. Trägt die ursprüngliche Warteschlange den Namen `narf`, so ist deren Friedhof unter `narf/$DeadLetterQueue` erreichbar.

Somit:

```csharp
private static void Revive(string queuename)
{
    var queueClient = QueueClient.Create(queuename, ReceiveMode.PeekLock);
    var deathClient = QueueClient.Create(QueueClient.FormatDeadLetterPath(queuename), ReceiveMode.PeekLock);

    var message = deathClient.Receive(TimeSpan.Zero);
    while (message != null)
    {
        var body = message.GetBody<Stream>();
        queueClient.Send(new BrokeredMessage(body, false));
        message.Complete();

        message = deathClient.Receive(TimeSpan.Zero);
    }
}
```

Metadaten der Nachrichten gehen zwar verloren, aber das lässt sich natürlich je nach Anforderung modifizieren. Bleibt nur noch zu klären, was hier im Fehlerfall passiert. Was tot ist, kann niemals sterben... oder doch?
