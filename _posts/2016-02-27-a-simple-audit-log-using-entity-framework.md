---
layout: post
post_class: text-post
title: A simple audit log using Entity Framework
tags:
  - Development
  - EntityFramework
  - CSharp
---
Um in *Entity Framework* basierten Projekten eine Art Audit-Log umzusetzen, existiert bereits die [eine][0] oder [andere][1] durchaus mächtige Lösung. Im Hintergrund wird dabei in der Regel auf den *ChangeTracker* zurückgegriffen, der natürlich für eine einfache, an die Anforderungen zugeschnittene Variante genauso genutzt werden kann. Wird beispielsweise lediglich die Geschichte eines "Feldes" verlangt, so kann dies ungefähr wie folgt umgesetzt werden.

Zuerst benötigen wir natürlich eine Entität, um eben jene Historie persistieren zu können,

```csharp
public class AuditEntry
{
    public long Id { get; set; }
    public DateTime Date { get; set; }
    public string User { get; set; }
    public string Target { get; set; }
    public string TargetId { get; set; }
    public string Property { get; set; }
    public string PropertyValue { get; set; }
}
```

wobei zumindest ein Index über `Target`, `TargetId` sowie `Property` gelegt werden sollte, schließlich wird die entsprechende Tabelle mit der Zeit einiges an "Gewicht" zulegen.

Weiters wäre ein Mechanismus angebracht, der die entsprechende Audit Komponente im Zuge des *SaveChanges* mit einbezieht. Der Einfachheit halber setzen wir folgendes Interface voraus, das via mehr oder weniger aufwendigem *Dependency Injection* registriert oder genauso direkt instanziert und natürlich auch aufgerufen werden kann.

```csharp
interface IDbTrigger
{
    void OnSavingChanges();
    int OnSavedChanges();
}
```

Für die konkreten Log-Einträgen benötigen wir jedenfalls ein paar Zutaten.

```csharp
public class CreateAuditEntries : IDbTrigger
{
    readonly DateTime date = DateTime.UtcNow;
    readonly string user = ClaimsPrincipal.Current.Identity.Name;
    readonly DbContext db;

    readonly List<Lazy<AuditEntry>> entries = new List<Lazy<AuditEntry>>();

    public CreateAuditEntries(DbContext db)
    {
        this.db = db;
    }
}
```

Je nach konkreter Umsetzung können / müssen Benutzer und Zeitstempel natürlich auf eine andere Art und Weise bezogen werden. Die Einträge selbst sind ein wenig *lazy*, um mit serverseitig generierten *Primary keys* umgehen zu können -- diese erfahren wir naturgemäß erst nach dem *Commit*. Abgesehen davon kann ein Commit auch schiefgehen, weswegen eine Trennung grundsätzlich keine schlechte Idee ist.

```csharp
public void OnSavingChanges()
{
    foreach (var entry in db.ChangeTracker.Entries())
    {
        switch (entry.State)
        {
            case EntityState.Added:
            case EntityState.Modified:
                LogSaved(entry);
                break;

            case EntityState.Deleted:
                LogRemoved(entry);
                break;
        }
    }
}
```

Soweit so unspektakulär, ein Remove fällt nicht viel aufwendiger aus.

```csharp
void LogRemoved(DbEntityEntry entry)
{
    var targetName = entry.Entity
                          .GetType()
                          .Flatten(t => t.BaseType, typeof(object))
                          .Last()
                          .Name;

    entries.Add(new Lazy<AuditEntry>(() => new AuditEntry
    {
        Date = date,
        User = user,
        Target = targetName,
        TargetId = FormatKey(entry.Entity)
    }));
}
```

Nachdem Entity Framework mit Vererbung umgehen kann und darüber hinaus dynamische Proxy-Klassen generiert, lösen wir den Typ über die Vererbungshierarchie auf, wobei `Flatten` nur ein [kleiner Helfer][2] zur Vermeidung von lächerlichen Schleifen sein soll.

```csharp
void LogSaved(DbEntityEntry entry)
{
    foreach (var propertyName in entry.CurrentValues.PropertyNames)
    {
        LogSaved(entry.Property(propertyName));
    }
}
```

Beim Speichern müssen wir nun auf *Properties* hinunterbrechen.

```csharp
void LogSaved(DbPropertyEntry property)
{
    var complexProperty = property as DbComplexPropertyEntry;
    if (complexProperty != null && complexProperty.CurrentValue != null)
    {
        foreach (var childProperty in complexProperty.CurrentValue.GetType().GetProperties())
        {
            LogSaved(complexProperty.Property(childProperty.Name));
        }
    }
    else
    {
        LogSaved(property.EntityEntry, property);
    }
}
```

Moment. Bei einer *Property* kann es sich auch um eine *Complex Property* handeln und die möchte extra behandelt werden. Weil sie es kann.

```csharp
void LogSaved(DbEntityEntry entry, DbPropertyEntry property)
{
    var isAdded = entry.State == EntityState.Added
        && property.CurrentValue != null;
    var isDeleted = entry.State == EntityState.Modified
        && property.OriginalValue != null
        && property.CurrentValue == null;
    var isModified = entry.State == EntityState.Modified
        && property.CurrentValue != null
        && !property.CurrentValue.Equals(property.OriginalValue);

    if (isAdded || isDeleted || isModified)
    {
        var propertyChain = property.Flatten(p => p.ParentProperty);
        var rootProperty = propertyChain.Last();

        var targetName = entry.Entity.GetType().GetProperty(rootProperty.Name).DeclaringType.Name;
        var propertyName = string.Join(".", propertyChain.Reverse().Select(p => p.Name));

        audit.Add(new Lazy<AuditEntry>(() => new AuditEntry
        {
            Date = date,
            User = user,
            Target = targetName,
            TargetId = FormatKey(entry.Entity),
            Property = propertyName,
            PropertyValue = FormatValue(property.CurrentValue)
        }));
    }
}
```

Au weier. Die Informationen des *Change Trackers* über *Properties* sind wertlos, da nicht auf Werte-Ebene überprüft wird, sondern irgendwie irgendwas gemacht wird. Wenn also die Entität neu und der Wert vorhanden ist, dann ist auch dieser neu; wenn der ursprüngliche Wert vorhanden ist, aber der neue Wert nicht, dann wurde dieser gelöscht und so weiter. Als kleine Draufgabe werden *Complex Properties* über ihre *Parent Properties* aufgelöst, was sowohl den `TargetName` als auch den `PropertyName` beeinflussen kann -- und wird.

```csharp
public int OnSavedChanges()
{
    db.Set<AuditEntry>().AddRange(entries.Select(a => a.Value));
    return context.SaveChanges();
}
```

Geschafft. Nach dem eigentlichen `SaveChanges` sind noch über einen weiteren Aufruf die Log-Einträge in der Datenbank gelandet, was natürlich mit einer zusätzlichen Transaktion gekoppelt werden kann, damit diese auch wirklich immer und überhaupt vorhanden sind.

Naja, so einfach ist das wohl doch nicht. Nur ein bisschen.


[0]: https://github.com/bilal-fazlani/tracker-enabled-dbcontext
[1]: https://github.com/loresoft/EntityFramework.Extended
[2]: /2014/02/12/use-the-linq-luke/
