---
layout: post
post_class: text-post
title: How-to modify the Query String
tags:
  - Development
  - CSharp
redirect_from:
  - /post/44797257558/how-to-modify-the-query-string/
  - /post/44797257558/
---
Ok, das klingt jetzt eigentlich sehr basic, jedoch lässt sich diese Aufgabe mit Hilfe der üblichen Verdächtigen -- [System.Uri][0] sowie [System.UriBuilder][1] -- nicht wirklich sauber lösen. Eine kurze "Suche" (um es einmal neutral auszudrücken) liefert Lösungsvorschläge, welche meistens entweder umständliche und vor allem fehleranfällige String-Operationen beinhalten oder sogar einen Schritt weiter gehen, indem mittels [Reflector][2] interne .NET Klassen zerlegt werden, um diese dann wiederum via Reflection bearbeiten zu können...

Wie jetzt? Ich will doch nur einen Parameter im Query String verändern.

Nicht sehr intuitiv, aber mit [HttpUtility.ParseQueryString][3] schließt sich der Kreis:

```csharp
static void Main(string[] args)
{
    var url = new Uri("http://test.local/Default.aspx?par1=val1&par2=val2");

    url = ModifyQueryString(url);

    Console.WriteLine(url);

    // http://test.local/Default.aspx?par1=new&par3=val3
}

static Uri ModifyQueryString(Uri url)
{
    var query = HttpUtility.ParseQueryString(url.Query);

    query["par1"] = "new";
    query.Remove("par2");
    query["par3"] = "val3";

    var builder = new UriBuilder(url);

    builder.Query = query.ToString();

    return builder.Uri;
}
```

Kleinvieh macht auch Mist. ;-)

[0]: https://msdn.microsoft.com/library/system.uri
[1]: https://msdn.microsoft.com/library/system.uribuilder
[2]: https://de.wikipedia.org/wiki/.NET_Reflector
[3]: https://msdn.microsoft.com/library/system.web.httputility.parsequerystring
