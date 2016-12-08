RMTR
======

Addon pour le visualiseur [geOrchestra](http://www.georchestra.org/) permettant la visualisation et l'extraction des données du Référentiel Métropolitain Topographie et Réseaux de Rennes Métropole.

Authors: @fvanderbiest

Compatibility: geOrchestra >= 16.12 (due to a dependency on the [/ldapadmin/emailProxy service](https://github.com/georchestra/georchestra/pull/1572))

Example addon config:

```js
[{
    "id": "rmtr_0",
    "name": "RMTR",
    "options": {
        "target": "tbar_12",
        "subject": "[RMTR] nouvelle demande",
        "to": ["oneguy@sig.rennesmetropole.fr"],
        "cc": ["anotherguy@rennesmetropole.fr"],
        "bcc": ["somebcc@rennesmetropole.fr"],
        "template": "Bonjour,\n\n{first_name} {last_name} ({email} - {tel} - {service} - {company}) a effectué une demande d'extraction du RMTR.\nSous-sol: {underground}\nSurface: {aboveground}\n\nMotivations: {comment}\n\nLes tuiles concernées sont les suivantes: {tiles}",
        "layer": {
            "service": "https://portail-test.sig.rennesmetropole.fr/geoserver/ref_topo/wms",
            "name": "toposurf_rctr_carroyage",
            "format": "image/png",
            "fields": [{
                "name": "cases_200",
                "type": "string",
                "header": "Identifiant",
                "width": 180
            }, {
                "name": "date_der_maj",
                "type": "date",
                "header": "Date de mise à jour"
            }]
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
