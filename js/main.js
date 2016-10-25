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
                handler: this._handler,
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
                    "checkchange": this._handler,
                    scope: this
                }
            });
        }
    },

    /**
     * Method: handler
     */
    _handler: function() {
        //GEOR.helper.msg(this.options.title, this.tr("addon_rctr_"));
        
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
