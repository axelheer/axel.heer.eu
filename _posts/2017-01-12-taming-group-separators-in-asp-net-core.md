---
layout: post
post_class: text-post
title: Taming group separators in ASP.NET Core
tags:
  - Development
  - MVC
  - CSharp
---

Wir schreiben in einem Zeitalter der digitalen Hochtechnologie das Jahr 2017. Eine Epoche geprägt von modernsten Entwicklungen, welche so ihre Schwierigkeiten mit Zeitzonen, der Umrechnung unterschiedlicher Einheiten oder auch einfach Tausendertrennzeichen zu meistern haben. Letzteres scheint selbst in der jüngsten Inkarnation von *ASP.NET MVC* aka *ASP.NET **Core** MVC* eine [ungelöste Sache][0] zu sein: aus Gründen der Abwärtskompatibilität wird auch bei einer Version 1.0 das Verarbeiten von *Trennzeichen* dem Entwickler als Übung überlassen...

Wie schon in den alten Generationen des *MVC* Frameworks lässt sich das sogenannte [Model Binding][1] anpassen. Das Mapping des "rohen" HTTP Requests auf die schlussendlich zu verarbeitenden .NET Objekte kann vielerorts geändert oder sogar erweitert werden; das fällt diesmal Dank der konsequent eingeführten [Dependency Injection][2] Mechanismen ein wenig flexibler aus, nur eben nicht im Rahmen von *Model Binding*, was uns an dieser Stelle jedoch nicht weiter stören wird.

Zu Beginn kann jedenfalls ein *Model Binder Provider* für einen gewissen Kontext den eigentlichen *Model Binder* vorgeben, um diesen Prozess vermutlich nur ein einziges Mal ausführen zu müssen. Nachfolgende Requests können auf die bereits gewonnenen Erkenntnisse zurückgreifen und den bereits instanziierten *Binder* verwenden. Naturgemäß handelt es sich somit um ein Singleton, welches entsprechend stabil sein sollte, schließlich können durchaus mehrere Zeichenketten parallel verarbeitet werden, sollte die Webanwendung auch verwendet werden.

Möchte man beispielsweise Strings sowie Zahlen gesondert behandeln, so könnte ein passender *Provider* ungefähr wie folgt aussehen:

```csharp
public class CustomModelBinderProvider : IModelBinderProvider
{
    public IModelBinder GetBinder(ModelBinderProviderContext context)
    {
        if (context == null)
            throw new ArgumentNullException(nameof(context));

        var modelType = context.Metadata.ModelType;

        if (modelType == typeof(string))
            return new StringModelBinder();

        modelType = Nullable.GetUnderlyingType(modelType) ?? modelType;

        if (modelType == typeof(decimal))
            return new DecimalModelBinder();

        if (modelType == typeof(int))
            return new Int32ModelBinder();

        return null;
    }
}
```

Dieser wird gleich zu Beginn instanziiert sowie registriert:

```csharp
services.AddMvc()
        .AddMvcOptions(options =>
            options.ModelBinderProviders.Insert(0, new CustomModelBinderProvider())
        );
```

Für den *Binder* kann auf Basis des [SimpleTypeModelBinder][3] eine abstrakte Basisklasse entwickelt werden, welche das konkrete Parsen der einen oder anderen Ableitung überlässt. In etwa so:

```csharp
public class DecimalModelBinder : ParseInputModelBinder
{
    protected override object ParseInput(string value, IFormatProvider provider)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentNullException(nameof(value));
        if (provider == null)
            throw new ArgumentNullException(nameof(provider));

        return decimal.Parse(value, NumberStyles.Number, provider);
    }
}
```

Und siehe da, es werden [Tausendertrennzeichen][4] akzeptiert. Alle Trennzeichen? Nein! Ein von unbeugsamen Germanen bevölkertes Land hat aufgehört, den Punkt als eben dieses zu verwenden. Nach [DIN 1333][5] ist dafür das geschützte Leerzeichen zu nutzen, was in neueren Windows Versionen auch der Fall ist. Eine Zahl der Form "12.345,67" kann unter diesen Umständen noch immer nicht als gültige Eingabe erkannt werden.

Lassen die Plattformen des "Betriebs" eine adäquate Konfiguration zu, so lässt sich hier leicht eingreifen. Falls nicht oder wenn schlichtweg mehr Kontrolle darüber erwünscht ist, um beispielsweise ein Gleichschalten mit client-seitigen Technologien sicherzustellen, so kann im Rahmen der [Localization][6] nachgebessert werden.

Sind die Standardeinstellungen nicht hinreichend...

```csharp
var culture = new CultureInfo("de-AT");

culture.NumberFormat.NumberGroupSeparator = ".";
```

...so ist eine Anpassung notwendig.


[0]: https://github.com/aspnet/Mvc/issues/5502
[1]: https://docs.microsoft.com/en-us/aspnet/core/mvc/models/model-binding
[2]: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
[3]: https://github.com/aspnet/Mvc/blob/dev/src/Microsoft.AspNetCore.Mvc.Core/ModelBinding/Binders/SimpleTypeModelBinder.cs
[4]: https://de.wikipedia.org/wiki/Zifferngruppierung#Mit_dem_Tausendertrennzeichen
[5]: https://de.wikipedia.org/wiki/Schreibweise_von_Zahlen#Tausendertrennzeichen
[6]: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/localization
