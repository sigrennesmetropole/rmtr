RMTR
======

Addon pour le visualiseur [geOrchestra](http://www.georchestra.org/). Il permet de formuler des demandes d'extraction de données par la sélection de carreaux. Un courriel est envoyé à un opérateur qui se charge de l'extraction dans un deuxième temps.

Authors: @fvanderbiest

Compatibility: geOrchestra >= 16.12 (due to a dependency on the [/ldapadmin/emailProxy service](https://github.com/georchestra/georchestra/pull/1572))

Example addon config:

```js
[{
    "id": "rmtr_0",
    "name": "RMTR",
    "options": {
        "target": "tbar_12",
        "subject": "[RMTR] nouvelle demande concernant {count} tuiles",
        "to": ["operator@mycompany.fr"],
        "cc": ["chief@mycompany.fr"],
        "bcc": ["somebcc@mycompany.fr"],
        "template": "Bonjour,\n\n{first_name} {last_name} ({email} - {tel} - {service} - {company}) a effectué une demande d'extraction du RMTR.\nSous-sol: {underground}\nSurface: {aboveground}\n\nMotivations: {comment}\n\nLes tuiles concernées sont les suivantes: {tiles}",
        "layer": {
            "service": "https://public.sig.rennesmetropole.fr/geoserver/ref_topo/wms",
            "name": "rmtr_surf_carroyage",
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
        "en": "This addon allows to formulate requests for data extraction.",
        "fr": "Cet addon permet permet de formuler des demandes d'extraction de données.",
        "es": "Esta herramienta permite hacer solicitudes de recuperación de datos.",
        "de": "Dieses Add-on ermöglicht es ermöglicht Anfragen für den Datenabruf zu machen."
    }
}]
```
