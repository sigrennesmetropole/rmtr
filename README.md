RMTR
======

Addon pour le visualiseur [geOrchestra](http://www.georchestra.org/) permettant la visualisation et l'extraction des données du Référentiel Métropolitain Topographie et Réseaux de Rennes Métropole.

Authors: @fvanderbiest

Compatibility: geOrchestra >= 16.12

Example addon config:

```js
[{
    "id": "rmtr_0",
    "name": "RMTR",
    "options": {
        "target": "tbar_12",
        "layer": {
            "service": "https://portail-test.sig.rennesmetropole.fr/geoserver/ref_topo/wms",
            "name": "toposurf_rctr_carroyage",
            "format": "image/png",
            "fields": {
                "id": "id_case",
                "label": "cases_200"
            }
        },
        "baselayers": [{
            "service": "https://sdi.georchestra.org/geoserver/gwc/service/wms",
            "name": "dem:altitude",
            "format": "image/jpeg"
        },{
            "service": "https://sdi.georchestra.org/geoserver/gwc/service/wms",
            "name": "unearthedoutdoors:truemarble",
            "format": "image/jpeg"
        }]
    },
    "title": {
        "en": "RMTR",
        "fr": "RMTR",
        "es": "RMTR",
        "de": "RMTR"
    },
    "description": {
        "en": "Cet addon permet la visualisation et l'extraction des données du Référentiel Métropolitain Topographie et Réseaux",
        "fr": "Cet addon permet la visualisation et l'extraction des données du Référentiel Métropolitain Topographie et Réseaux",
        "es": "Cet addon permet la visualisation et l'extraction des données du Référentiel Métropolitain Topographie et Réseaux",
        "de": "Cet addon permet la visualisation et l'extraction des données du Référentiel Métropolitain Topographie et Réseaux"
    }
}]
```
