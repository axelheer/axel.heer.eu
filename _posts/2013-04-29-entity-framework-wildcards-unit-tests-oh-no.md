---
layout: post
post_class: text-post
title: Entity Framework, Wildcards & Unit Tests. Oh no!
tags:
  - Development
  - EntityFramework
  - LINQ
  - CSharp
redirect_from:
  - /post/49187251098/entity-framework-wildcards-unit-tests-oh-no/
  - /post/49187251098/
---
Sollen via [Entity Framework][0] alle Objekte einer Datenbank geladen werden, die einer gewissen textbasierten Bedingung genügen, so bieten sich bekannterweise neben einem gewöhnlichen Equals die String-Methoden [StartsWith][1], [Contains][2] sowie [EndsWith][3] an. Sind zusätzlich die klassischen Wildcards '*' und '?' erwünscht, so kann man sich noch mit der SQL Server-spezifischen Funktion [PatIndex][4] relativ schnell und einfach helfen -- vorausgesetzt einer totalen Einschränkung auf SQL Server steht nichts im Weg.

Stellt eine direkte Verwendung von PatIndex jedoch eine viel zu heftige Kopplung dar -- die Funktion lässt sich gar nicht erst ausführen, sie dient ausschließlich der Erstellung bzw. der Verarbeitung von *Expression Trees* --, so steht man schon vor einem "Problem". Und da laut diversen "Best Practices" entsprechend verpackte in-memory Datenstrukturen als Ersatz für Entity Framework spezifische [DbSet][5] Objekte für Testzwecke super sind (und das sind sie ja auch), steht man hoffentlich (sic!) vor eben diesem.

Nachdem gelegentlich gewisse Feinheiten speziell im Kontext des Entity Frameworks "anders" gemacht werden müssen, hat sich eine kleine Schnittstelle bewährt, deren Implementierung für jenen Kontext ein wenig im Hintergrund zaubert, während die Variante für "normale" Umstände eher direkt arbeiten kann. Mittels gewählter Dependency Injection Mechanismen oder wie-auch-immer kann so für etwas Komfort und vor allem Unabhängigkeit gesorgt werden.

Beschränken wir uns jedoch auf die besprochene Wildcard Search: in diesem Beispiel haben wir die wohl selbsterklärende Entität `Planet`, der dazugehörige Kontext hat eine Schnittstelle `ISolarSystem`. Und eine Klasse `DeathStar` ist auf der Suche nach ihrem nächsten Ziel...

```csharp
public class DeathStar {
    private ISolarSystem system;
    private ISolarHelper helper;

    public DeathStar(ISolarSystem system, ISolarHelper helper) {
        this.system = system;
        this.helper = helper;
    }

    public IQueryable<Planet> SearchTarget(string name) {
        // return system.Planets.Where(p => SqlFunctions.PatIndex(name, p.Name) > 0);
        return helper.Match(system.Planets, p => p.Name, name);
    }
}
```

Auf den ersten Blick sieht die Lösung über ein austauschbares Hilfsobjekt rein syntaktisch sogar viel besser aus. Der zweite Blick offenbart einem die noch viel interessantere loose Kopplung mit dem Entity Framework. Für den vermeintlich dritten Blick muss man erst die Methode `Match` implementieren -- jetzt ist es auf einmal notwendig, den *Expression Tree* manuell aufzubauen. Immer diese Schattenseiten...

```csharp
public class SolarHelper : ISolarHelper {
    private static readonly MethodInfo patIndex = typeof(SqlFunctions).GetMethod("PatIndex");

    public IQueryable<T> Match<T>(IQueryable<T> query, Expression<Func<T, string>> selector, string pattern) {
        pattern = pattern.Replace('*', '%').Replace('?', '_');

        var predicate = Expression.Lambda(
            Expression.GreaterThan(
                Expression.Call(
                    patIndex,
                    Expression.Constant(pattern),
                    selector.Body),
                Expression.Convert(
                    Expression.Constant(0),
                    typeof(int?))),
            selector.Parameters);

        return query.Where((Expression<Func<T, bool>>)predicate);
    }
}
```

Naja, eigentlich eh trivial. Auf den vierten Blick.

[0]: https://entityframework.codeplex.com/
[1]: https://msdn.microsoft.com/library/system.string.startswith
[2]: https://msdn.microsoft.com/library/system.string.contains
[3]: https://msdn.microsoft.com/library/system.string.endswith
[4]: https://msdn.microsoft.com/library/system.data.objects.sqlclient.sqlfunctions.patindex
[5]: https://msdn.microsoft.com/library/system.data.entity.dbset
