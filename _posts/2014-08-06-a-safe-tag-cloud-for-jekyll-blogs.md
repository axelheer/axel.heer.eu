---
layout: post
post_class: text-post
title: A safe tag cloud for Jekyll Blogs
tags:
  - Development
  - Jekyll
  - XML
---
Back to the Basics. So lautet anscheinend die Devise von [Jekyll][0], einem erfrischend einfachen Site-Generator, der unter anderem besonders für Blogs verwendet wird. Man benötigt weder eine Datenbank noch einen besonderen Host, es wird mittels [Markdown][1] sowie [Liquid][2], einer populären Template-Engine, "Plain-Old-HTML" generiert. Einzig eine nette Tag-Cloud fehlt und die soll ohne speziell programmiertes Modul erstellt werden können, um mit dem sogenannten *Safe-Mode* kompatibel zu sein (wichtig für [GitHub Pages][3] & Co).

Seit der Version 2 gibt es in *Jekyll* [Collections][4], welche grundsätzlich geeignet sein sollten, um alle anzuzeigenden Tags nicht nur "sammeln" zu können, sondern auch passende Übersichtsseiten zu generieren. Im *_config.yml* unseres Blogs sind somit folgende Einträge zu machen (`tags` ist bereits vergeben, deswegen `hashtags`):

```
collections:
  hashtags:
    output: true
    permalink: /tags/:path/
```

Das für dieses Post notwendige Tag *Jekyll* benötigt demnach ein *jekyll.md* im oben implizit definierten *_hashtags* Verzeichnis, was wiederum ungefähr so aussehen könnte:

```
---
layout: hashtag
title: Jekyll
---
```

Der dazugehörige Content wird natürlich automatisch via *Liquid*-Layout generiert:

```html
{% raw  %}
<h3 class="post-title">{{ page.title | xml_escape }}</h3>
<ul>
    {% for post in site.tags[page.title] %}
    <li>
        <a href="{{ post.url }}">{{ post.title | xml_escape }}</a>
    </li>
    {% endfor %}
</ul>
{% endraw %}
```

Zugegeben, andere Systeme bieten hier mehr als eine einfache Liste aller Posts einer Kategorie / eines Tags, aber wer braucht das schon... "Du benötigst dieses Feature nicht, eine Liste ist toll!" *\*waveshand\**

Kommen wir also zum Kern der Sache, der Wolke selbst:

```html
{% raw  %}
<ul id="tags" data-weight="{{ site.posts | size }}">
    {% for tag in site.hashtags %}
    <li class="tag" data-weight="{{ site.tags[tag.title] | size }}">
        <a href="{{ tag.url }}">{{ tag.title | xml_escape }}</a>
    </li>
    {% endfor %}
</ul>
{% endraw %}
```

Man beachte das Attribut `data-weight` sowohl für die Gesamtanzahl aller Posts als auch für die Anzahl der jeweiligen zu einem Tag gehörigen Posts. Damit sind wir *HTML5*-konform und können via *JavaScript* eine passende logarithmische Skala finden und (wie zu erwarten war) auch anwenden. 

```html
<script>
    $(function () {
        var cloud = $("#tags"),
            ordered = cloud.find(".tag").get(),
            total = parseInt(cloud.data("weight"), 10);
        $(ordered).each(function () {
            var tag = $(this),
                part = parseInt(tag.data("weight"), 10),
                ratio = Math.log(part) / Math.log(total);
            tag.css("font-size", (100 + 150 * ratio) + "%");
        });
    });
</script>
```

Wem das noch zu langweilig ist, der könnte beispielsweise anstatt `ordered` ein für sich selbst sprechendes `shuffled` einbauen, sich mit Farben spielen oder den Dunst dezent animieren...

[0]: https://jekyllrb.com/
[1]: https://daringfireball.net/projects/markdown/
[2]: https://docs.shopify.com/themes/liquid-documentation/
[3]: https://pages.github.com/
[4]: https://jekyllrb.com/docs/collections/
