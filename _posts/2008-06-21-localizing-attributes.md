---
layout: post
post_class: text-post
title: Localizing Attributes
tags:
  - Development
  - Localization
  - CSharp
redirect_from:
  - /post/44799691898/localizing-attributes/
  - /post/44799691898/
---
sprachabhängige elemente auszulagern ist seit der 2005er version von visual studio sehr komfortabel geworden. diese dann bei custom attributes einzubinden, ist auf den ersten blick allerdings nicht so easy, schließlich muss der text konstant sein. einfach die property einer resource file designer klasse bzw. den entsprechenden getstring aufruf des resource managers zu verwenden schlägt fehl:

> An attribute argument must be a constant expression, typeof expression or array creation expression of an attribute parameter type.

klar, eigentlich. leider bietet das .net framework keine out of the box lösung, um solche meta daten ausserhalb des eigentlichen codes zu halten. zumindest ist es mir nicht gelungen eine zu finden. nach einer längeren suche bin ich allerdings über ein pattern gestolpert um attribute doch zu lokalisieren, auch wenn das erstellen eigener aus den standard attributes abgeleiteter klassen notwendig ist. ein beispiel für das description attribute:

```csharp
[AttributeUsageAttribute(AttributeTargets.All)]
public sealed class LocalizedDescriptionAttribute : DescriptionAttribute
{
    private Type _resourceType;

    public Type ResourceType
    {
        get { return _resourceType; }
    }

    public LocalizedDescriptionAttribute(string description, Type resourceType)
        : base(description)
    {
        _resourceType = resourceType;
    }

    private bool _localized;

    public override string Description
    {
        get
        {
            if (!_localized)
            {
                ResourceManager manager = new ResourceManager(_resourceType);
                DescriptionValue = manager.GetString(base.Description);
                _localized = true;
            }

            return base.Description;
        }
    }
}
```

soweit ich mich schlau gemacht habe ist das der .net standard bei attributen. und das schöne an standards ist ja, dass es so viele von ihnen gibt! ein weiterer fall:

```csharp
[AttributeUsageAttribute(AttributeTargets.All)]
public sealed class LocalizedCategoryAttribute : CategoryAttribute
{
    private Type _resourceType;

    public Type ResourceType
    {
        get { return _resourceType; }
    }

    public LocalizedCategoryAttribute(string category, Type resourceType)
        : base(category)
    {
        _resourceType = resourceType;
    }

    protected override string GetLocalizedString(string value)
    {
        ResourceManager manager = new ResourceManager(_resourceType);
        return manager.GetString(value);
    }
}
```

sobald dann die gewünschten attribute lokalisierbar gemacht wurden, ist folgendes endlich möglich:

```csharp
[LocalizedCategory("SomeCategory", typeof(Strings))]
[LocalizedDescription("SomeDescription", typeof(Strings))]
```

an dieser stelle darf man sich freuen, dass microsoft seine [eigene rule][0], attributes zu sealen, nicht befolgt. ^o)

[0]: https://msdn.microsoft.com/library/ms182267.aspx
