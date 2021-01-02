---
layout: post
post_class: text-post
title: Posting Code on Tumblr
tags:
  - Development
  - Tumblr
  - XML
redirect_from:
  - /post/51796685174/posting-code-on-tumblr/
  - /post/51796685174/
---
Bei technischen Blogs scheinen -- zumindest bei dem Bruchteil, über den meine Wenigkeit so stolpert -- die guten alten Plattformen a la [Wordpress][0] & Co in Führung zu sein. Trotz deren Mächtigkeit in Sachen Features gefällt mir der Minimalismus von [Tumblr][1] immer besser. Einziger Haken: Code-Snippets zu posten wird nicht gerade "gefördert".

Dabei bietet Tumblr die Möglichkeit [Markdown][2] für seine Texte zu nutzen, welches das Einbinden von [Code-Blöcken][3] sehr fein gelöst hat. Plattformen wie [Github][4] oder [Stackoverflow][5] setzen mittlerweile auch auf diese "Markup language", allerdings in einer unter anderem speziell für Code erweiterten Fassung.

Was bei Tumblr also noch fehlt ist ein nettes Syntax-Highlighting, was dank der flexiblen [Template-Engine][6] sehr leicht mit ein wenig JavaScript nachgerüstet werden kann. Neben den wohl prominentesten Lösungen wie [SyntaxHighlighter][7] (verwendet z.B. Wordpress) oder [Prettify][8] (verwendet u.a. Stackoverflow) bietet sich -- dank seiner Optimierung auf `<pre><code>`-Blöcke, welche wiederum von Markdown generiert werden -- [Highlight.js][9] geradezu an.

In der einfachsten Version:

```html
<link rel="stylesheet" href="http://yandex.st/highlightjs/7.3/styles/default.min.css">
<script src="http://yandex.st/highlightjs/7.3/highlight.min.js"></script>
<script>hljs.initHighlightingOnLoad();</script>
```

Die Heuristik zum Erkennen der jeweiligen Sprache (es werden im Hintergrund einfach alle ausprobiert: die mit den meisten "Highlights" gewinnt) hat vor allem bei kurzen Code-Blöcken ihre Schwierigkeiten. Was nachvollziehbar ist. Um dem Highlighter ein wenig unter die Arme zu greifen, sollte also noch irgendeine Art von Hinweis gegeben werden, um die Sprache des Codes leichter festzustellen. Wie wäre es mit Tags?

```html
<link rel="stylesheet" href="http://yandex.st/highlightjs/7.3/styles/default.min.css">
<script src="http://yandex.st/highlightjs/7.3/highlight.min.js"></script>
<script>
    $(document).ready(function () {
        $("#posts .text-post").each(function () {
            var lang = "";
            $(this).find(".tags a").each(function () {
                var tag = $(this).text().toLowerCase();
                for (var l in hljs.LANGUAGES) {
                    if (tag == ("#" + l) || tag == l) {
                        lang = l;
                        break;
                    }
                }
            });
            if (lang) {
                $(this).find("pre code").each(function () {
                    $(this).addClass(lang);
                    hljs.highlightBlock(this);
                });
            }
        });
    });
</script>
```

Man matched einfach die Tags des Posts mit den Sprachen von Highlight.js. Fertig.

[0]: https://wordpress.com/
[1]: https://www.tumblr.com/
[2]: https://daringfireball.net/projects/markdown/
[3]: https://daringfireball.net/projects/markdown/syntax#precode
[4]: https://github.com/
[5]: https://stackoverflow.com/
[6]: https://www.tumblr.com/docs/en/custom_themes
[7]: https://alexgorbatchev.com/SyntaxHighlighter/
[8]: https://code.google.com/p/google-code-prettify/
[9]: https://highlightjs.org/
