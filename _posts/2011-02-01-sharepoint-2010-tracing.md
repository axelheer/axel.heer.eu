---
layout: post
post_class: text-post
title: SharePoint 2010 Tracing
tags:
  - Development
  - SharePoint
  - Tracing
  - CSharp
redirect_from:
  - /post/44791610459/sharepoint-2010-tracing/
  - /post/44791610459/
---
In älteren Versionen von SharePoint war es notwendig mit umständlichen Interop Geschichten zu arbeiten, um in die Trace Logs von SharePoint hineinschreiben zu können, während bei der 2010er Generation immer öfters von der Komponente [PortalLog][0] die Rede ist -- diese bietet praktische Hilfsmethoden für's eigene Logging. Nachteil: es ist die teure Server Edition notwendig, der SharePoint Foundation fehlt das dazugehörige Assembly.

Dabei ist im "Basis"-Assembly Microsoft.SharePoint auch ein entsprechendes Werkzeug enthalten: das [SPDiagnosticsService][1]. Dessen Handhabung ist annähernd genauso trivial.

```csharp
var logService = SPDiagnosticsService.Local;
var logTarget = logService.Areas["SharePoint Foundation"].Categories["Unknown"];

logService.WriteTrace(0815, logTarget, TraceSeverity.Unexpected, "Test.");
```

Das gehört natürlich noch verpackt, um analog zu [PortalLog][2] mit Einzeilern tracen zu können.

[0]: https://msdn.microsoft.com/library/microsoft.office.server.diagnostics.portallog
[1]: https://msdn.microsoft.com/library/microsoft.sharepoint.administration.spdiagnosticsservice
[2]: https://msdn.microsoft.com/library/microsoft.office.server.diagnostics.portallog
