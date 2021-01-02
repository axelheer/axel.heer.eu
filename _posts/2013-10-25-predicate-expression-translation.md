---
layout: post
post_class: text-post
title: Predicate Expression Translation
tags:
  - Development
  - EntityFramework
  - LINQ
  - CSharp
redirect_from:
  - /post/65051804321/predicate-expression-translation/
  - /post/65051804321/
---
Zeit wirds, die Ansätze des letzten [Posts][0] weiter zu spinnen!

Angenommen man hat eine relationale Datenbank (soll ja mal vorkommen), in der gewisse Datensätze mittels Suchkriterien gefunden werden wollen, die sich jedoch auf andere (natürlich in Relation stehende) Datensätze beziehen. Für übergeordnete Daten betreffende Kriterien hilft uns die bereits besprochene Substitution, schließlich muss nur der entsprechende *Foreign key* eingesetzt werden. Untergeordnetes verlangt noch nach einer speziellen Behandlung.

Um es wieder in "mathematischem Pseudocode" zu formulieren: *P(a) ∧ Q(b) ∧ R(c)* wird zu *P(a) ∧ Q(C(a)) ∧ C(a,R)*.

Na gut, bleiben wir bei einem [Entity Framework][1] tauglichen C#-Beispiel:

```csharp
public class Academy {
    public int Id { get; private set; }
    public string Name { get; set; }
    public string Location { get; set; }
    public virtual ICollection<Course> Courses { get; set; }
}

public class Course {
    public int Id { get; private set; }
    public string Name { get; set; }
    public string Lector { get; set; }
    public virtual Academy Academy { get; set; }
    public virtual ICollection<Lecture> Lectures { get; set; }
}

public class Lecture {
    public int Id { get; private set; }
    public string Term { get; set; }
    public string Weekday { get; set; }
    public Course Course { get; set; }
}
```

Für jede Entität wird es Suchkriterien geben, wobei alle betroffenen Kurse (Course) ausgegeben werden sollen.

*Achtung:* einfache Verkettungen von LINQ Klauseln genügen übrigens hierfür grundsätzlich nicht, da zwei Prädikate zu einer Vorlesung (Lecture) Kurse finden würden, wo zwar die einzelnen Prädikate Treffer erziehlt haben, jedoch nicht unbedingt zu jeweils ein und derselben Vorlesung. Konkret würde eine Suche nach [Weekday: "Montag"] sowie [Term: "WS2000"] Kurse finden, die zwar zumindest eine Vorlesung zu erstem Wunsch sowie eine Vorlesung zum zweiten bieten können, aber eine alle Wünsche erfüllende Vorlesung muss deswegen nicht existieren...

Bei der Erstellung der Prädikate in Form von Expressions kann C# syntaktisch so richtig schön ausgenutzt werden:

```csharp
IEnumerable<Expression<Func<Academy, bool>>> buildAcademyPredicates(Query query) {
    if (!string.IsNullOrEmpty(query.Academy)) {
        yield return a => a.Name == query.Academy;
    }
    if (!string.IsNullOrEmpty(query.Location)) {
        yield return a => a.Location == query.Location;
    }
}

IEnumerable<Expression<Func<Course, bool>>> buildCoursePredicates(Query query) {
    if (!string.IsNullOrEmpty(query.Course)) {
        yield return c => c.Name == query.Course;
    }
    if (!string.IsNullOrEmpty(query.Lector)) {
        yield return c => c.Lector == query.Lector;
    }
}

IEnumerable<Expression<Func<Lecture, bool>>> buildLecturePredicates(Query query) {
    if (!string.IsNullOrEmpty(query.Term)) {
        yield return l => l.Term == query.Term;
    }
    if (!string.IsNullOrEmpty(query.Weekday)) {
        yield return l => l.Weekday == query.Weekday;
    }
}
```

Mit den passenden *Extension Methods* ist bei der "Übersetzung" auch keine *Expressions* betreffende Handarbeit notwendig (und das war das Ziel!):

```csharp
IEnumerable<Expression<Func<Course, bool>>> translateForCourse(Query query) {
    var aPredicates = buildAcademyPredicates(query);
    if (aPredicates.Any()) {
        yield return aPredicates.Aggregate((p, q) => p.And(q))
                                .Translate()
                                .To<Course>(c => c.Academy);
    }
    var cPredicates = buildCoursePredicates(query);
    if (cPredicates.Any()) {
        yield return cPredicates.Aggregate((p, q) => p.And(q));
    }
    var lPredicates = buildLecturePredicates(query);
    if (lPredicates.Any()) {
        yield return lPredicates.Aggregate((p, q) => p.And(q))
                                .Translate()
                                .To<Course>((c, p) => c.Lectures.Any(l => p(l)));
    }
}
```

Die erste Übersetzung macht sich die Substitution zu Nutze, indem für einen Kurs die jeweilige Lehranstalt (Academy) direkt eingesetzt wird. Bei der dritten wird es jedoch tricky: ein neues Prädikat für Kurs, welches das ursprüngliche Prädikat für Vorlesung einfach übernimmt (näheres dazu später). Und die zweite in der Mitte ist trivial.

In Summe können schlussendlich alle Prädikate leicht zusammengefasst werden, da sie sich nun auf ein und dieselbe Entität beziehen:

```csharp
IQueryable<Course> courses = model.Courses;
var predicates = translateForCourse(query);
if (predicates.Any()) {
    var finalPredicate = predicates.Aggregate((p, q) => p.And(q));
    courses = courses.Where(finalPredicate);
}
```

Tata!

Ja, der Teil mit dem "tricky" ist noch offen. Dabei ist der nur mehr halb so wild: analog zum `PredicateBinder` aus dem letzten Post wird ein *Expression Visitor* benötigt, der ganze Lambda-Ausdrücke ersetzen kann.

```csharp
private class PredicateBinder<T> : ExpressionVisitor {
    private readonly ParameterExpression parameter;
    private readonly Expression<Func<T, bool>> replacement;

    internal PredicateBinder(ParameterExpression parameter, Expression<Func<T, bool>> replacement) {
        this.parameter = parameter;
        this.replacement = replacement;
    }

    protected override Expression VisitParameter(ParameterExpression node) {
        if (node == parameter) {
            return replacement;
        }
        return node;
    }

    protected override Expression VisitInvocation(InvocationExpression node) {
        if (node.Expression == parameter) {
            var t = replacement.Parameters[0];
            var u = node.Arguments[0];

            var binder = new ParameterBinder(t, u);

            return binder.Visit(replacement.Body);
        }
        return node;
    }
}
```

Der Ausdruck kann entweder direkt vorkommen (in der Form "... => p"), siehe `VisitParameter`, oder eben als Teil eines anderen Ausdrucks (in der Form "... => ... p(t) ..."), siehe `VisitInvocation`.

Die eigentliche Übersetzung nimmt also das neue Prädikat und ersetzt den entsprechenden "Platzhalter" durch den ursprünglichen Ausdruck:

```csharp
public Expression<Func<U, bool>> To<U>(Expression<Func<U, Func<T, bool>, bool>> predicate) {
    var u = predicate.Parameters[0];
    var p = predicate.Parameters[1];

    var binder = new PredicateBinder<T>(p, expression);

    return Expression.Lambda<Func<U, bool>>(
        binder.Visit(predicate.Body), u);
}
```

Uff.

**Update**

[Full sample on GitHub][3]

[0]: /2013/09/21/parameter-expression-substitution/
[1]: https://www.nuget.org/packages/EntityFramework
[3]: https://github.com/axelheer/nein-linq
