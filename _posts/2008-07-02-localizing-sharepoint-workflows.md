---
layout: post
post_class: text-post
title: Localizing SharePoint Workflows
tags:
  - Development
  - SharePoint
  - Localization
  - CSharp
redirect_from:
  - /post/44799520540/localizing-sharepoint-workflows/
  - /post/44799520540/
---
immer diese sprachunabhängigkeit.

innerhalb eines workflows auf den aktuellen thread zuzugreifen ist nicht erlaubt, da die windows workflow foundation aufgrund ihrer architektur nicht garantiert, dass activities sklaven eines bestimmten threads sind. nicht einmal auf den aktuellen prozess kann man sich verlassen, da der zustand des workflows jederzeit weggespeichert, übersiedelt oder so werden kann.

das ist ja unheimlich cool! nur wenn in mehrsprachigen umgebungen ein nicht vorhersehbarer sprachmix beim output eines workflows entsteht, je nachdem wo welche activity gerade abgearbeitet wurde, ist das furchtbar uncool...

nach erfolgloser recherche (google ist schuld!), hab' ich mich mit mir selbst auf folgende lösung für in sharepoint gehostete workflows geeinigt: der workflow soll eine property für eine ihm zugewiesene culture haben, welche wie folgt befüllt wird.

```csharp
private void OnWorkflowActivated_Invoked(object sender, ExternalDataEventArgs e)
{
    WorkflowCulture = new CultureInfo((int)WorkflowProperties.Web.Language);
}
```

ist nicht viel arbeit. mühsam wirds dann beim zugreifen auf ressourcen, da statt

```csharp
SomeTextForSomething = Strings.SomeText;
```

nun so die neue property berücksichtigt werden muss:

```csharp
SomeTextForSomething = Strings.ResourceManager.GetString("SomeText", WorkflowCulture);
```

das gelbe vom ei ist diese lösung leider nicht. aber es funktioniert. und ein böser hack ists auch nicht.
