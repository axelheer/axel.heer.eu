---
layout: post
post_class: text-post
title: Building DNX code using PCL dependencies
tags:
  - Development
  - DNX
  - CSharp
---
Mit der [neuen Version][0] wird alles besser. [Angeblich][1]. Auf jeden Fall wird Gewohntes anders, mit der Zeit gewählte Arbeitsweisen funktionieren nicht mehr, die eine oder andere Umstellung muss gemeistert werden und manchmal funktioniert eigentlich Funktionierendes überhaupt nicht mehr. Das Erstellen von *DNX libraries* basierend auf *Portable class libraries* aka *PCL* fällt -- bis jetzt zumindest -- in die allerletzte Kategorie.

**Einfaches Beispiel mit [xunit][2] als "Abhängigkeit"**

Wir beginnen mit einem eigenen Attribut

```csharp
[AttributeUsage(AttributeTargets.Method)]
public sealed class MyDataAttribute : Attribute
{
}
```

und wollen natürlich beides unterstützen, das alte *.NET Framework* sowie das neue *.NET Core*.

```json
{
  "frameworks": {
    "dnx46": { },
    "dnxcore50": {
      "dependencies": {
        "System.Collections": "4.0.0",
        "System.Reflection": "4.0.0",
        "System.Reflection.Extensions": "4.0.0",
        "System.Runtime": "4.0.0",
        "System.Runtime.Extensions": "4.0.0"
      }
    }
  }
}
```

Kompiliert.

Unser `MyDataAttribute` soll ein *Data attribute* werden, um [Theories][3] komfortable mit Daten zu versorgen. Also erweitern wir sowohl

```csharp
[AttributeUsage(AttributeTargets.Method)]
public sealed class MyDataAttribute : DataAttribute
{
    public override IEnumerable<object[]> GetData(MethodInfo testMethod)
    {
        throw new NotImplementedException();
    }
}
```

als auch.

```json
{
  "dependencies": {
    "xunit.extensibility.core": "2.0.0"
  },

  "frameworks": {
    "dnx46": { },
    "dnxcore50": {
      "dependencies": {
        "System.Collections": "4.0.0",
        "System.Reflection": "4.0.0",
        "System.Reflection.Extensions": "4.0.0",
        "System.Runtime": "4.0.0",
        "System.Runtime.Extensions": "4.0.0"
      }
    }
  }
}
```

Kompiliert nicht mehr.

> * The type 'Attribute' is defined in an assembly that is not referenced. You must add a reference to assembly 'System.Runtime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
> * Attribute 'AttributeUsage' is only valid on classes derived from System.Attribute
> * 'MyDataAttribute' does not implement inherited abstract member 'DataAttribute.GetData(MethodInfo)'
> * 'MyDataAttribute.GetData(MethodInfo)': no suitable method found to override

Wie jetzt? Der entscheidende Hinweis steckt jedenfalls in der Referenz *System.Runtime*, die innerhalb des *.NET Frameworks* naturgemäß nicht aufgelöst werden kann. Sie existiert ganz einfach nicht, wird jedoch von *xunit* referenziert. Die anderen Fehlermeldungen sind lediglich ordinäre Folgefehler und können getrost ignoriert werden. Vorerst.

Wie das? Eine *PCL* verweist auf allgemeine *Contract assemblies*, die auf der jeweiligen Plattform (in unserem Fall das *.NET Framework*) nicht unbedingt vorhanden sein müssen. Es genügen sogenannte *Facades*, welche ausschließlich *Type forwards* beinhalten (in unserem Fall von *System.Runtime* auf *mscorlib* für *Attribute*) und somit zur Laufzeit für das Laden der korrekten Assemblies sorgen.

Das heißt? Beim Kompilieren wird eine Referenz geladen, die wiederum "fiktive" Referenzen beinhaltet, die jedoch nicht aufgelöst werden können. Normalerweise sorgt ein Mechanismus namens [ImplicitlyExpandDesignTimeFacades][4] für Wohlgefallen, aufgrunddessen diese Situation in der *DNX* Welt letztlich blankes Unverständnis erzeugt.

Und nun? Wir fügen eben jene *Facades* explizit hinzu!

```json
{
  "dependencies": {
    "xunit.extensibility.core": "2.0.0"
  },

  "frameworks": {
    "dnx46": {
      "frameworkAssemblies": {
        "System.Reflection": {
          "type": "build",
          "version": ""
        },
        "System.Runtime": {
          "type": "build",
          "version": ""
        }
      }
    },
    "dnxcore50": {
      "dependencies": {
        "System.Collections": "4.0.0",
        "System.Reflection": "4.0.0",
        "System.Reflection.Extensions": "4.0.0",
        "System.Runtime": "4.0.0",
        "System.Runtime.Extensions": "4.0.0"
      }
    }
  }
}
```

Das Assembly *System.Runtime* folgt dabei direkt aus der Fehlermeldung, während *System.Reflection* mittels trial-and-error ermittelt werden kann. Oder man kopiert einfach alles von *dnxcore50* nach *dnx46* und markiert es zusätzlich als *build*, um nicht künstliche *Dependencies* zu deklarieren. Schließlich soll wiederum davon Abhängiges von diesem Spaß verschont bleiben, oder?

Übrigens: mit der neuen Version wird wirklich vieles besser.


[0]: https://github.com/aspnet/Home
[1]: https://github.com/aspnet/Home/wiki/Roadmap
[2]: https://xunit.github.io/
[3]: https://xunit.github.io/docs/getting-started-dnx.html
[4]: https://referencesource.microsoft.com/#MSBuildTarget=ImplicitlyExpandDesignTimeFacades
