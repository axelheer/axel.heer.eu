---
layout: post
post_class: text-post
title: Regex and the LIKE-Operator
tags:
  - Development
  - Regex
  - SQL
  - CSharp
---
Immer wieder werden Benutzereingaben in `LIKE`-taugliche Zeichenketten transformiert, um die wesentlich bekanntere `?`-`*`-Notation für die in Datenbanken übliche Schreibweise umzuwandeln. Soll darüber hinaus der Code nicht nur funktionieren, sondern auch automatisiert getestet werden, so erscheint es sinnvoll, den bereits konvertierten String in eine *Regular Expression* zu übersetzen, um im Rahmen der Tests auch ohne eben jene Datenbank auskommen zu können.

Wird weder noch auf spezifisches "Escapen" oder andere Eigenheiten geachtet, so passieren möglicherweise schlimme Dinge. Und den meisten Beispielen nach zu urteilen ist dem auch so.

Na gut, versuchen wir es besser (Yoda is watching...):

```csharp
public static string AsLikePattern(this string value)
{
    if (value == null)
        throw new ArgumentNullException("value");
    if (value == "" || value == "\"")
        return value + "%";

    var pattern = value.Replace("[", "[[]")
                       .Replace("%", "[%]")
                       .Replace("_", "[_]")
                       .Replace("*", "%")
                       .Replace("?", "_");

    if (pattern[0] == '"' && pattern[pattern.Length - 1] == '"')
        return pattern.Substring(1, pattern.Length - 2);

    if (pattern[pattern.Length - 1] != '%')
        return pattern + "%";

    return pattern;
}
```

Ersetzt man stur nach [Doku][0], so sollte -- zumindest in Zusammenhang mit Wildcards -- nichts mehr schiefgehen. Die mittlerweile übliche Mode, automatisch einen `*` anzuhängen, ist auch erfüllt und lässt sich sogar mittels Gänsefüßchen unterbinden. Das weitere "Escapen" überlassen wir lieber dem DAL...

Zum interessanteren Teil: für Tests müsste der Such-Parameter einmal vollständig als *Regular Expression* ganz ohne Wildcards aufbereitet werden (das geht in der Regel Out-of-the-Box), um im Anschluss die gewünschten SQL-Spezifika anzupassen -- also SQL-Wildcards gegen Regex-Wildcards tauschen und doppelte "Escapes" reparieren.

```csharp
public static bool Like(this string value, string likePattern)
{
    if (value == null)
        throw new ArgumentNullException("value");
    if (likePattern == null)
        throw new ArgumentNullException("likePattern");

    var pattern = Regex.Escape(likePattern)
                       .Replace("_", ".")
                       .Replace("\\[.]", "_")
                       .Replace("%", ".*")
                       .Replace("\\[.*]", "%")
                       .Replace("\\[\\[]", "\\[");

    return Regex.IsMatch(value, "(?i)^" + pattern + "$");
}
```

Was wurde vergessen?

[0]: https://msdn.microsoft.com/library/ms179859.aspx
