/*global
 Ext, GeoExt, OpenLayers, GEOR
 */
Ext.namespace("GEOR.Addons");

/*

TODO:
 * chargement / déchargement contexte avec addon
 * charg / décharge couche dalles extraction
 * fenetre avec grid
 * outil selection ponctuelle
 * formulaire pré-rempli
 * template mail
 * mailto
*/

GEOR.Addons.RCTR = Ext.extend(GEOR.Addons.Base, {

    window: null,
    toggleGroup: '_rctr',

    /**
     * Method: init
     *
     * Parameters:
     * record - {Ext.data.record} a record with the addon parameters
     */
    init: function(record) {
        if (this.target) {
            // create a button to be inserted in toolbar:
            this.components = this.target.insertButton(this.position, {
                xtype: 'button',
                tooltip: this.getTooltip(record),
                iconCls: "addon-rctr",
                handler: this._onCheckchange,
                scope: this
            });
            this.target.doLayout();
        } else {
            // create a menu item for the "tools" menu:
            this.item = new Ext.menu.CheckItem({
                text: this.getText(record),
                qtip: this.getQtip(record),
                iconCls: "addon-rctr",
                checked: false,
                listeners: {
                    "checkchange": this._onCheckchange,
                    scope: this
                }
            });
        }
        this.window = new Ext.Window({
            title: OpenLayers.i18n('rctr.window.title'),
            width: 440,
            height: 500,
            closable: true,
            closeAction: "hide",
            resizable: false,
            border: false,
            layout: 'fit',
            items: {
                layout: 'border',
                border: false,
                items: [{
                    xtype: 'toolbar',
                    region: 'north',
                    border: false,
                    height: 40,
                    items: [
                        new GeoExt.Action({
                            control: new OpenLayers.Control(), // FIXME
                            map: this.map,
                            // button options
                            toggleGroup: this.toggleGroup,
                            allowDepress: false,
                            pressed: false,
                            tooltip: this.tr(""),
                            iconCls: "gx-featureediting-draw-point",
                            text: this.tr("annotation.point"),
                            iconAlign: 'top',
                            // check item options
                            group: this.toggleGroup,
                            checked: false
                        }),'-',
                        new Ext.Action({
                            //handler: this.showForm,
                            scope: this,
                            text: OpenLayers.i18n('rctr.show.form'),
                            //iconCls: "gx-featureediting-export",
                            iconAlign: 'top',
                            tooltip: OpenLayers.i18n('rctr.show.form.tip')
                        })
                    ]
                }, {
                    region: 'center',
                    border: false,
                    xtype: 'panel' // grid
                }]
            }
        });
    },

    /**
     * Method: _onCheckchange
     * Callback on checkbox state changed
     */
    _onCheckchange: function(item, checked) {
        if (checked) {
            this.window.show();
            this._setUp();
            /*
            this.window.alignTo(
                Ext.get(this.map.div),
                "t-t",
                [0, 5],
                true
            );*/
        } else {
            this.window.hide();
        }
    },


    /**
     * Method: _setUp
     * add layers from a given context to the map
     */
    _setUp: function() {
        var failure = function() {
            GEOR.util.errorDialog({
                msg: this.tr("rctr.error.restoring.context")
            });
        };
        OpenLayers.Request.GET({
            url: this.options.wmc,
            success: function(response) {
                try {
                    var s = response.responseXML || response.responseText;
                    // add (not remove) layers to map
                    // without zooming to context bounds:
                    GEOR.wmc.read(s, false, false);
                } catch(err) {
                    failure.call(this);
                }
            },
            failure: failure,
            scope: this
        });
    },

    /**
     * Method: tr
     */
    tr: function(str) {
        return OpenLayers.i18n(str);
    },

    /**
     * Method: destroy
     *
     */
    destroy: function() {
        //Place addon specific destroy here
        GEOR.Addons.Base.prototype.destroy.call(this);
    }
});
