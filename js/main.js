/*global
 Ext, GeoExt, OpenLayers, GEOR
 */
Ext.namespace("GEOR.Addons");

/*
TODO:
 * card layout dans la fenetre (accueil / grid / form)
 * CSS
 * formulaire pré-rempli
 * template mail
 * mailto
 * hardening
*/

GEOR.Addons.RCTR = Ext.extend(GEOR.Addons.Base, {

    window: null,
    toggleGroup: "_rctr",
    layerRecord: null,
    records: null,
    _up: false,
    _vectorLayer: null,
    _sfControl: null,
    _store: null,

    /**
     * Method: init
     *
     * Parameters:
     * record - {Ext.data.record} a record with the addon parameters
     */
    init: function(record) {
        this.records = [];

        this._vectorLayer = new OpenLayers.Layer.Vector("__georchestra_"+record.get("id"), {
            displayInLayerSwitcher: false,
            styleMap: GEOR.util.getStyleMap({
                "default": {
                    strokeWidth: 3,
                    fillOpacity: 0
                },
                "select": {
                    fillOpacity: 0
                }
            }),
            rendererOptions: {
                zIndexing: true
            }
        });
        // create select feature control (used by selection model)
        this._sfControl = new OpenLayers.Control.SelectFeature(this._vectorLayer, {
            toggle: true,
            multipleKey: Ext.isMac ? "metaKey" : "ctrlKey"
        });
        // we make sure that we cannot select the same object two times:
        this._sfControl.handlers.feature.stopDown = true;

        this._store = new GeoExt.data.FeatureStore({
            layer: this._vectorLayer,
            fields: [
                this.options.layer.fields.id,
                this.options.layer.fields.label
            ],
            initDir: GeoExt.data.FeatureStore.STORE_TO_LAYER
        });

        if (this.target) {
            // create a button to be inserted in toolbar:
            this.components = this.target.insertButton(this.position, {
                xtype: "button",
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
    },

    /**
     * Method: _onCheckchange
     * Callback on checkbox state changed
     */
    _onCheckchange: function(item, checked) {
        if (checked && !this._up) {
            this._setUp();
        } else {
            this.window.hide();
        }
    },


    /**
     * Method: _setUp
     * add layers from a given context to the map
     */
    _setUp: function() {
        this._up = true;
        // add WMS baselayers (GWC compatible):
        Ext.each(this.options.baselayers, function(layer) {
            this._addLayer(layer, true);
        }, this);
        // add carroyage layer:
        this._addLayer(this.options.layer, false, this._createWindow);
        // add vector layer:
        this.map.addLayer(this._vectorLayer);
        this.map.addControl(this._sfControl);
    },

    /**
     * Method: _tearDown
     * remove layers from the map
     */
    _tearDown: function() {
        this._up = false;
        this.map.removeLayer(this._vectorLayer);
        this.map.removeControl(this._sfControl);
        this.mapPanel.layers.remove(this.layerRecord);
        Ext.each(this.records, function(r) {
            this.mapPanel.layers.remove(r);
        }, this);
        this.records = [];
    },

    /**
     * Method: _removeDrawBox
     * Change cursor back to normal
     */
    _removeDrawBox: function() {
        OpenLayers.Element.removeClass(this.map.viewPortDiv, "olDrawBox");
    },

    /**
     * Method: _addDrawBox
     * Change cursor into draw box mode
     */
    _addDrawBox: function() {
        OpenLayers.Element.addClass(this.map.viewPortDiv, "olDrawBox");
    },

    /**
     * Method: _onGetFeatureInfo
     * Callback on GetFeatureInfo
     */
    _onGetFeatureInfo: function(o) {
        OpenLayers.Element.addClass(this.map.viewPortDiv, "olDrawBox");
        this._addDrawBox();
        if (!o.features || !o.features[0]) {
            return;
        }
        // reproject features if needed
        var r =  /.+srsName=\"(.+?)\".+/.exec(o.text);
        if (r && r[1]) {
            var srsString = r[1],
                srsName = srsString.replace(/.+[#:\/](\d+)$/, "EPSG:$1");
            if (this.map.getProjection() !== srsName) {
                var sourceSRS = new OpenLayers.Projection(srsName),
                    destSRS = this.map.getProjectionObject();
                Ext.each(o.features, function(f) {
                    if (f.geometry && !!f.geometry.transform) {
                        f.geometry.transform(sourceSRS, destSRS);
                    }
                    if (f.bounds && !!f.bounds.transform) {
                        f.bounds.transform(sourceSRS, destSRS);
                    }
                });
            }
        }
        // append features to store:
        this._store.loadData(o.features, true);
    },

    /**
     * Method: _createWindow
     * called when the layer record is available
     */
    _createWindow: function() {
        this.map.raiseLayer(this._vectorLayer, +1);
        this.window = new Ext.Window({
            title: this.tr("rctr.window.title"),
            width: 440,
            height: 500,
            closable: true,
            closeAction: "hide",
            resizable: false,
            border: false,
            layout: "fit",
            items: {
                layout: "border",
                border: false,
                items: [{
                    xtype: "toolbar",
                    region: "north",
                    border: false,
                    height: 40,
                    items: [
                        new GeoExt.Action({
                            control: new OpenLayers.Control.WMSGetFeatureInfo({
                                layers: [this.layerRecord.getLayer()],
                                maxFeatures: 1,
                                infoFormat: "application/vnd.ogc.gml",
                                eventListeners: {
                                    "beforegetfeatureinfo": this._removeDrawBox,
                                    "getfeatureinfo": this._onGetFeatureInfo,
                                    "activate": this._addDrawBox,
                                    "deactivate": this._removeDrawBox,
                                    scope: this
                                }
                            }),
                            map: this.map,
                            // button options
                            toggleGroup: this.toggleGroup,
                            allowDepress: true,
                            pressed: true,
                            tooltip: this.tr("rctr.selecttool.tip"),
                            iconCls: "gx-featureediting-draw-point",
                            text: this.tr("rctr.selecttool"),
                            iconAlign: "top",
                            // check item options
                            group: this.toggleGroup,
                            checked: false
                        }),"->",
                        new Ext.Action({
                            //handler: this.showForm,
                            scope: this,
                            text: this.tr("rctr.showform"),
                            iconCls: "gx-featureediting-export",
                            iconAlign: "top",
                            tooltip: this.tr("rctr.showform.tip")
                        })
                    ]
                }, {
                    region: "center",
                    border: false,
                    layout: "fit",
                    items: [{
                        xtype: "grid",
                        store: this._store,
                        frame: false,
                        viewConfig: {
                            forceFit: true
                        },
                        sm: new GeoExt.grid.FeatureSelectionModel({
                            singleSelect: false,
                            selectControl: this._sfControl
                        }),
                        columns: [{
                            header: this.tr("rctr.grid.id"),
                            dataIndex: this.options.layer.fields.id,
                            width: 40 // TODO: config for this ?
                        }, {
                            header: this.tr("rctr.grid.label"),
                            dataIndex: this.options.layer.fields.label
                        }],
                        bbar: ['->', {
                            text: this.tr("rctr.grid.remove"),
                            tooltip: this.tr("rctr.grid.remove.tip"),
                            handler: function(btn) {
                                var grid = btn.ownerCt.ownerCt,
                                    sm = grid.getSelectionModel();
                                this._store.remove(sm.getSelections());
                            },
                            scope: this
                        }],
                        listeners: {
                            "beforedestroy": function() {
                                this._vectorLayer.destroyFeatures();
                                this.selModel && this.selModel.unbind();
                                // this deactivates Feature handler,
                                // and moves search_results layer back to normal z-index
                                return true;
                            },
                            scope: this
                        }
                    }]
                }]
            },
            listeners: {
                "hide": this._tearDown,
                scope: this
            }
        });
        this.window.show();
        this.window.alignTo(
            Ext.get(this.map.div),
            "tr-tr",
            [-5, 5],
            true
        );
    },

    /**
     * Method: _addLayer
     * 
     */
    _addLayer: function(cfg, isBaseLayer, callback) {
        // TODO: check layer is not already loaded
        var layerOptions = isBaseLayer ? {
            gutter: 0,
            transitionEffect: "resize",
            tileSize: new OpenLayers.Size(256, 256)
        } : {};
        var u = GEOR.util.splitURL(cfg.service);
        var layerStore = GEOR.ows.WMSCapabilities({
            storeOptions: {
                url: u.serviceURL,
                layerOptions: layerOptions
            },
            baseParams: u.params,
            success: function(store) {
                // extract layer which is expected
                var record = store.queryBy(function(r) {
                    return (r.get("name") == cfg.name);
                }).first();
                if (record) {
                    // set opaque status for layer order:
                    if (isBaseLayer) {
                        record.set("opaque", true);
                        // keep a reference to baselayer records:
                        this.records.push(record);
                    } else {
                        // keep a reference to the carroyage layer record:
                        this.layerRecord = record;
                    }
                    // enforce format:
                    if (cfg.hasOwnProperty("format")) {
                        record.getLayer().params.FORMAT = cfg.format;
                    }
                    // add to map:
                    this.mapPanel.layers.addSorted(record);
                    callback && callback.call(this);
                }
                // else silently ignore it
            },
            failure: function() {
                // silently ignore it
            },
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
        this.window && this.window.close();
        this._tearDown();
        GEOR.Addons.Base.prototype.destroy.call(this);
    }
});
