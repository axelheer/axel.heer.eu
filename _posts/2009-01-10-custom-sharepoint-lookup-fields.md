---
layout: post
post_class: text-post
title: Custom SharePoint Lookup Fields
tags:
  - Development
  - SharePoint
  - CSharp
redirect_from:
  - /post/44798726400/custom-sharepoint-lookup-fields/
  - /post/44798726400/
---
mächtigere lookup fields beschäftigen viele in der sharepoint development community, wenn man prominente blogs, codeplex projekte oder auch kommerzielle cross-site lookup lösungen betrachtet. leitet man aus bereits vorhandenen varianten wie dem lookup field selbst oder auch den beiden choices versionen ab, so fällt man über den einen oder anderen stolperstein. dem einen field lässt sich nicht gut eine ganz andere datenquelle unterjubeln, beim anderen machen die render patterns aufgrund des unter umständen fehlenden choices nodes in der field definition schwierigkeiten.

ist der einzige ausweg die erstellung eines gepimpten text fields? anscheinend. bis auf die variante, in der mehrere elemente ausgewählt werden können (stichwort filter), eigentlich eine durchaus gute lösung. und für multichoice szenarien sind benutzer die eingeschränkten filtermöglichkeiten sowieso schon von ihren excel sheets gewohnt. ;-)

beginnen wir mit den schnittstellen. austauschbar muss die art und weise der auswahl sowie die datenquelle selbst sein:

```csharp
[SharePointPermission(SecurityAction.LinkDemand, ObjectModel = true)]
[SharePointPermission(SecurityAction.InheritanceDemand, ObjectModel = true)]
public interface ILookupSelectionDataSource
{
    LookupSelectionField AttachedField
    {
        get;
        set;
    }

    IEnumerable<String> LoadData();
}

public interface ILookupSelectionControlFactory
{
    bool IsMultiValue
    {
        get;
    }

    bool CanHaveEmpty
    {
        get;
    }

    ListControl CreateListControl();
}

public class LookupSelectionDropDownFactory : ILookupSelectionControlFactory
{
    public bool IsMultiValue
    {
        get { return false; }
    }

    public bool CanHaveEmpty
    {
        get { return true; }
    }

    public ListControl CreateListControl()
    {
        var control = new DropDownList()
        {
            CssClass = "ms-RadioText"
        };

        return control;
    }
}

public class LookupSelectionRadioButtonFactory : ILookupSelectionControlFactory
{
    public bool IsMultiValue
    {
        get { return false; }
    }

    public bool CanHaveEmpty
    {
        get { return false; }
    }

    public ListControl CreateListControl()
    {
        var control = new RadioButtonList()
        {
            CssClass = "ms-RadioText"
        };

        return control;
    }
}

public class LookupSelectionCheckBoxFactory : ILookupSelectionControlFactory
{
    public bool IsMultiValue
    {
        get { return true; }
    }

    public bool CanHaveEmpty
    {
        get { return false; }
    }

    public ListControl CreateListControl()
    {
        var control = new CheckBoxList()
        {
            CssClass = "ms-RadioText"
        };

        return control;
    }
}
```

für lösungen mit lustigeren steuerelementen ist das natürlich entsprechend zu erweitern. in diesem beispiel sind wir jedoch mit dropdown, radiobutton und checkbox controls glücklich. zusätzlich zur instanzierung ist für das lookup field bzw. dessen control wichtig, ob multi-value möglich sein soll und ob ein null wert hinzugefügt werden kann. ist das field schließlich nicht required, so soll eine drop down box über einen leeren eintrag verfügen, was bei radio buttons oder check boxen eher unüblich ist.

für die werte selbst ist auch eine eigene klasse angebracht, vor allem um multiple auswahlen zu ermöglichen:

```csharp
[Serializable]
public class LookupSelectionFieldValue
{
    private const string Delimiter = "; ";

    private List<String> _selection = new List<String>();

    public List<String> Selection
    {
        get { return _selection; }
    }

    public LookupSelectionFieldValue() { }

    public LookupSelectionFieldValue(string value)
    {
        if (String.IsNullOrEmpty(value))
        {
            return;
        }

        var values = value.Split(new[] { Delimiter }, StringSplitOptions.None);

        _selection.AddRange(values);
    }

    public override string ToString()
    {
        if (_selection.Count > 0 && !(_selection.Count == 1 && String.IsNullOrEmpty(_selection[0])))
        {
            return String.Join(Delimiter, _selection.ToArray());
        }

        return null;
    }
}
```

abgesehen von dem fall, dass ein wert wirklich den delimiter "; " enthält...

mit diesen werkzeugen lässt sich jetzt das lookup field selbst erstellen:

```csharp
[SharePointPermission(SecurityAction.LinkDemand, ObjectModel = true)]
[SharePointPermission(SecurityAction.InheritanceDemand, ObjectModel = true)]
public class LookupSelectionField : SPFieldText
{
    public virtual string DataSourceSetting
    {
        get { return (String)GetCustomProperty("DataSource"); }
        set { SetCustomProperty("DataSource", value); }
    }

    protected virtual ILookupSelectionDataSource DataSource
    {
        get
        {
            if (!String.IsNullOrEmpty(DataSourceSetting))
            {
                var dataSourceType = System.Type.GetType(DataSourceSetting);

                var dataSource = (ILookupSelectionDataSource)
                    Activator.CreateInstance(dataSourceType);
                dataSource.AttachedField = this;

                return dataSource;
            }

            return null;
        }
    }

    public virtual string ControlModeSetting
    {
        get { return (String)GetCustomProperty("ControlMode"); }
        set { SetCustomProperty("ControlMode", value); }
    }

    protected virtual ILookupSelectionControlFactory ControlFactory
    {
        get
        {
            switch (ControlModeSetting)
            {
                case "CheckBox":
                    return new LookupSelectionCheckBoxFactory();
                case "RadioButton":
                    return new LookupSelectionRadioButtonFactory();
                default:
                    return new LookupSelectionDropDownFactory();
            }
        }
    }

    public LookupSelectionField(SPFieldCollection fields, string fieldName)
        : base(fields, fieldName)
    {
    }

    public LookupSelectionField(SPFieldCollection fields, string typeName,
        string displayName)
        : base(fields, typeName, displayName)
    {
    }

    public override BaseFieldControl FieldRenderingControl
    {
        get
        {
            var control = new LookupSelectionFieldControl()
            {
                FieldName = InternalName,
                ControlFactory = ControlFactory,
                DataSource = DataSource
            };

            return control;
        }
    }

    public override Type FieldValueType
    {
        get { return typeof(LookupSelectionFieldValue); }
    }

    public override object GetFieldValue(string value)
    {
        if (!String.IsNullOrEmpty(value))
        {
            return new LookupSelectionFieldValue(value);
        }

        return null;
    }
}
```

die datenquelle ist also konfigurierbar, vor allem kann diese ein beliebiges .net objekt mit der entsprechenden schnittstelle sein, welche nur einen string iterator und eine verknüpfungsmöglichkeit mit dem lookup field verlangt. darüber hinaus gibt es auch drei verschiedene möglichkeiten, die daten dem benutzer zur verfügung zu stellen, wobei die checkbox variante für mehrfachauswahl felder gedacht ist.

last but not least ist noch das field control übrig, aber das ist eine andere geschichte... ;-)
