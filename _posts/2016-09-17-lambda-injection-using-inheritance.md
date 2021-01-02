---
layout: post
post_class: text-post
title: Lambda Injection using Inheritance
tags:
  - Development
  - LINQ
  - EntityFramework
  - CSharp
---

Das Thema *Lambda Injection* mag zwar bereits [ein langer Bart][0] zieren, jedoch hat sich mittlerweile [einiges bewegt][1]: letztens ist sogar explizite [Unterstützung für Vererbung][2] hinzugekommen. Vererbung? Ja, in der ursprünglichen Fassung wurden ausschließlich statische Methoden durch passende *Lambda Expressions* ersetzt. Das ist, subjektiv betrachtet, unheimlich praktisch -- manchmal dennoch zu wenig. Soll der entsprechende Ausdruck vielleicht in einem anderen Assembly / einer anderen Schicht der Architektur untergebracht werden oder sogar aufgrund gegebener Umstände unterschiedlich ausfallen, so sind natürlich bewährte Konzepte anzuwenden -- Stichwort *Inheritance*. Und diese sollen im Rahmen einer *Lambda Injection* genauso greifen.

Kommen wir gleich zu einem konkreten Beispiel: wir wollen innerhalb von *Queries* das Alter berechnen können, um danach zu filtern, zu gruppieren oder einfach nur den Klimawandel zu stoppen. Abgesehen von letzterem könnte der Ansatz einer adäquaten Lösung folgendermaßen aussehen.

```csharp
public interface IDateGuru
{
    int AgeInYears(DateTime birthday, DateTime today);
}
```

Ein *Interface* ist vielleicht ein wenig übertrieben, dafür sollte es im Rahmen dieser Demonstration die Konzepte klarer verdeutlichen. Eine Basisklasse mit der einen oder anderen Ableitung könnte genauso verwendet werden. Jedenfalls benötigen wir zumindest zwei Varianten, um dem ganzen seinen Sinn zu verleihen.

```csharp
public class NativeDateGuru : IDateGuru
{
    public int AgeInYears(DateTime birthday, DateTime today)
    {
        var deadline = new DateTime(today.Year, birthday.Month, birthday.Day);
        if (deadline > today.Date)
            return today.Year - birthday.Year - 1;
        return today.Year - birthday.Year;
    }
}
```

Neben der trivialen Variante greifen wir noch auf gutes und / oder altes SQL zurück, welches wir mit den bekannt `SqlFunctions` umsetzen.

```csharp
public class SqlQueryDateGuru : IDateGuru
{
    [InjectLambda]
    public int AgeInYears(DateTime birthday, DateTime today)
    {
        throw new NotSupportedException();
    }

    public Expression<Func<DateTime, DateTime, int>> AgeInYears()
    {
        return (birthday, today) =>
            (SqlFunctions.DateAdd("yyyy", SqlFunctions.DateDiff("yyyy", birthday, today), birthday) > today
                ? SqlFunctions.DateDiff("yyyy", birthday, today) - 1 : SqlFunctions.DateDiff("yyyy", birthday, today)) ?? -1;
    }
}
```

Der Code setzt übrigens das *Entity Framework* in der Version `6` voraus! Das neuere und schlankere *Entity Framework Core* ist hier leider ungeeignet, da weder `SqlFunctions` verfügbar sind, noch die Grenzen zwischen client- und serverseitigem "Query Code" so optimal gezogen werden können.

Um unseren "DateGuru" in Aktion zu sehen, ist schließlich ein einfaches Setup notwendig. Beginnen wir mit *Model* sowie *Context* in einer möglichst minimalen Variante.

```csharp
public class Jedi
{
    public int Id { get; set; }

    public string Name { get; set; }

    public DateTime Birthday { get; set; }
}

public class JediContext : DbContext
{
    public DbSet<Jedi> Jedi { get; set; }
}
```

Damit kann auf bekannte Art und Weise eine Datenbank initialisiert und im Anschluss mit Testdaten befüllt werden, schließlich ist für [Jedi-Nachwuchs][3] zu sorgen! Dazu kümmern wir uns einmal um eine Liste der Kandidaten, die je nach Datenquelle (*native* oder eben SQL) funktionieren sollte.

```csharp
public class TrainingComponent
{
    public IQueryable<Jedi> JediData { get; }

    public IDateGuru DateGuru { get; }

    public TrainingComponent(IQueryable<Jedi> jediData, IDateGuru dateGuru)
    {
        JediData = jediData;
        DateGuru = dateGuru;
    }

    public IReadOnlyList<string> LoadYounglingNames()
    {
        var query = from jedi in JediData
                    let ageInYears = DateGuru.AgeInYears(jedi.Birthday, DateTime.Today)
                    where 4 <= ageInYears && ageInYears <= 8
                    select jedi.Name;

        return query.ToList();
    } 
}
```

Konkret können hiermit sogar drei Varianten ausprobiert werden, wovon nur zwei ein Ergebnis liefern und eigentlich nur eine als praktikabel bezeichnet werden kann.

**Variante 1:** *native* auf Datenbank -- kann nicht funktionieren.

```csharp
using (var context = new JediContext())
{
    var training = new TrainingComponent(context.Jedi, new NativeDateGuru());

    Assert.Throws<NotSupportedException>(() => training.LoadYounglingNames());
}
```

**Variante 2:** *native* "in-memory" -- verursacht Schmerzen; zumindest der Hardware.

```csharp
using (var context = new JediContext())
{
    var training = new TrainingComponent(context.Jedi.ToList().AsQueryable(), new NativeDateGuru());

    var result = training.LoadYounglingNames();

    Assert.Equal(?, result.Count);
}
```

**Variante 3:** *injected* auf Datenbank -- funktioniert; finally.

```csharp
using (var context = new JediContext())
{
    var training = new TrainingComponent(context.Jedi.ToInjectable(typeof(IDateGuru)), new SqlQueryDateGuru());

    var result = training.LoadYounglingNames();

    Assert.Equal(?, result.Count);
}
```

**Fazit:** im Gegensatz zur ursprünglichen Version kann der "Query Code" ausgelagert, ausgetauscht oder was-auch-immer werden.


[0]: /2014/07/11/lambda-expression-injection/
[1]: https://github.com/axelheer/nein-linq
[2]: https://github.com/axelheer/nein-linq/releases/tag/v1.6.0
[3]: https://starwars.wikia.com/wiki/Jedi_youngling
