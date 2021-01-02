---
layout: post
post_class: text-post
title: Custom SharePoint Fields with Custom Properties
tags:
  - Development
  - SharePoint
  - CSharp
redirect_from:
  - /post/44799002421/custom-sharepoint-fields-with-custom-properties/
  - /post/44799002421/
---
während simple properties ohne eigenem editor noch relativ einfach in der [field definition][0] realisierbar sind, gerät man bei der entwicklung eines editor controls, welches das implementieren von ein wenig extra logik ermöglichen sollte, leider in teufels küche. die innerhalb eines sogenannten [field type editor][1] controls vollzogenen änderungen werden nämlich von der field edit page wieder überschrieben. klingt doof, ist es auch, und wie...

unglaubwürdig? verständlich. nachzulesen in den msdn foren: [custom field type properties][2].

abgesehen davon generieren custom properties beim erstellen einer spalte ganz furchtbare xml fragmente, was vor allem bei der verwendung von site columns in features nicht sooo lustig ist. bei über die benutzeroberfläche erstellten feldern ist das leicht mit einem tool wie zum beispiel dem [sharepoint manager][3] nachzuvollziehen. wieso nicht zusätzliche eigenschaften in den attributen des field nodes speichern, genauso wie es sharepoint selbst tut? die zugriffe darauf sind wiedermal nicht über die api zugängliche interna.

folgende punkte sind also zu beachten:

* custom attributes statt custom properties wären schöner
* der zugriff auf diese ist nur direkt übers schema xml möglich
* das update des schema xmls löst wiederum ein update aus (stichwort stack overflow)
* als draufgabe wird das update von der field edit page gleich wieder überschrieben

abstrahieren wir in einem ersten schritt die notwendige logik für unsere custom property:

```csharp
[SharePointPermission(SecurityAction.LinkDemand, ObjectModel = true)]
public sealed class FieldProperty
{
    private string _attributeName;
    public string AttributeName
    {
        get { return _attributeName; }
    }

    public FieldProperty(string attributeName)
    {
        _attributeName = attributeName;
    }

    private string _propertyValue;
    private bool _propertyValueSet;

    public void SetValue(SPField field, string value)
    {
        _propertyValue = value;
        _propertyValueSet = true;
    }

    public string GetValue(SPField field)
    {
        if (!_propertyValueSet)
        {
            return GetAttribute(ParseSchema(field));
        }

        return _propertyValue;
    }

    public void Save(SPField field)
    {
        if (_propertyValueSet)
        {
            var schema = SetAttribute(ParseSchema(field));
            _propertyValueSet = false;

            field.SchemaXml = schema.OuterXml;
            field.Update();
        }
    }

    private string GetAttribute(XmlDocument schema)
    {
        var attribute = schema.DocumentElement.Attributes[_attributeName];

        if (attribute == null)
        {
            return null;
        }

        return attribute.Value;
    }

    private XmlDocument SetAttribute(XmlDocument schema)
    {
        var attribute = schema.DocumentElement.Attributes[_attributeName];

        if (attribute == null)
        {
            attribute = schema.CreateAttribute(_attributeName);
            schema.DocumentElement.Attributes.Append(attribute);
        }

        attribute.Value = _propertyValue;
        return schema;
    }

    private XmlDocument ParseSchema(SPField field)
    {
        var schema = new XmlDocument();

        try
        {
            schema.LoadXml(field.SchemaXml);
        }
        catch (Exception)
        {
            schema.LoadXml(SPStringUtility.RemoveControlChars(field.SchemaXml));
        }

        return schema;
    }
}
```

wir packen unsere property logik also in eine eigene klasse, die üperprüft ob der aktuelle wert geändert wurde, um so das schema nur dann zu überspielen, wenn es auch notwendig ist. schließlich soll das nicht für jede property in jedem field wiederholt werden müssen. darüber hinaus wird die erforderliche handarbeit erledigt, um das entsprechende attribute zu bearbeiten.

jetzt gilt es noch den letzten punkt zu berücksichtigen, schließlich hilft uns obiges noch nicht sonderlich viel, wenn die field edit page alles wieder zunichte macht. wir speichern einfach den wert nicht im scope der field instance, sondern in dem des aktuellen threads:

```csharp
[SharePointPermission(SecurityAction.LinkDemand, ObjectModel = true)]
[SharePointPermission(SecurityAction.InheritanceDemand, ObjectModel = true)]
public class UltimateField : SPFieldText
{
    [ThreadStatic]
    private static FieldProperty _someSetting;
    public string SomeSetting
    {
        get { return _someSetting.GetValue(this); }
        set { _someSetting.SetValue(this, value); }
    }

    [ThreadStatic]
    private static FieldProperty _anotherSetting;
    public string AnotherSetting
    {
        get { return _anotherSetting.GetValue(this); }
        set { _anotherSetting.SetValue(this, value); }
    }

    public UltimateField(SPFieldCollection fields, string fieldName)
        : base(fields, fieldName)
    {
        InitializeAttributes();
    }

    public UltimateField(SPFieldCollection fields, string typeName, string displayName)
        : base(fields, typeName, displayName)
    {
        InitializeAttributes();
    }

    public override void OnAdded(SPAddFieldOptions op)
    {
        base.OnAdded(op);
        UpdateAttributes();
    }

    public override void OnUpdated()
    {
        base.OnUpdated();
        UpdateAttributes();
    }

    private void InitializeAttributes()
    {
        if (_someSetting == null)
        {
            _someSetting = new FieldProperty("SomeSetting");
        }

        if (_anotherSetting == null)
        {
            _anotherSetting = new FieldProperty("AnotherSetting");
        }
    }

    private void UpdateAttributes()
    {
        _someSetting.Save(this);
        _anotherSetting.Save(this);
    }
}
```

was im custom field selbst noch hinzukommt, sind die beiden methoden im obigen code ganz zum schluss, um die properties gegebenenfalls zu initialisieren (achtung: das ist inline aufgrund des [threadstatic attributes][4] nicht möglich!) und dann natürlich auch zu speichern.

jetzt, endlich, funktioniert auch ein field editor:

```csharp
[SharePointPermission(SecurityAction.LinkDemand, ObjectModel = true)]
[SharePointPermission(SecurityAction.InheritanceDemand, ObjectModel = true)]
public class UltimateFieldEditor : UserControl, IFieldEditor
{
    public bool DisplayAsNewSection
    {
        get { return false; }
    }

    public void InitializeWithField(SPField field)
    {
        if (!Page.IsPostBack && field != null)
        {
            var typedField = (UltimateField)field;

            ... = typedField.SomeSetting;
            ... = typedField.AnotherSetting;
        }
    }

    public void OnSaveChange(SPField field, bool isNewField)
    {
        var typedField = (UltimateField)field;

        typedField.SomeSetting = ...;
        typedField.AnotherSetting = ...;
    }
}
```

voila.

[0]: https://msdn.microsoft.com/library/aa543558.aspx
[1]: https://msdn.microsoft.com/library/bb802857.aspx
[2]: https://social.msdn.microsoft.com/forums/en-US/sharepointdevelopment/thread/fb1cb936-3abb-48c2-8d19-49007688dc34/
[3]: https://www.codeplex.com/spm
[4]: https://msdn.microsoft.com/library/system.threadstaticattribute
