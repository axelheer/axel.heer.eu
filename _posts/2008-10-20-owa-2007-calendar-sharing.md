---
layout: post
post_class: text-post
title: OWA 2007 Calendar Sharing
tags:
  - Trick
  - Exchange
redirect_from:
  - /post/44799293681/owa-2007-calendar-sharing/
  - /post/44799293681/
---
auch in der 07er version des microsoft outlook web access gibt es keine für den user offensichtliche möglichkeit auf fremde kalender zuzugreifen. zwar findet man rechts oben eine option um eine andere mailbox zu öffnen, nur ist diese in den seltensten fällen auch komplett freigegeben -- wer will das schon.

analog zur 03er version gibt es einen weniger intuitiven umweg:

```
http{s}://{server}/owa/{address}/?cmd=contents&f={calendar}

{address} ::= you@company.com|...
{calendar} ::= calendar|kalender|...
```

wie immer gilt: mit der nächsten version wird alles besser. ^o)
