/*global
 Ext, GeoExt, OpenLayers, GEOR
 */
Ext.namespace("GEOR.Addons");

/*
TODO:
 * template mail (?)
 * mailto (?)
*/

GEOR.Addons.RCTR = Ext.extend(GEOR.Addons.Base, {

    window: null,
    _toggleGroup: null,
    layerRecord: null,
    records: null,
    _up: false,
    _vectorLayer: null,
    _sfControl: null,
    _store: null,
    _cardPanel: null,
    _formAction: null,
    _removeRecordsBtn: null,
    _gfiControl: null,

    /**
     * Method: init
     *
     * Parameters:
     * record - {Ext.data.record} a record with the addon parameters
     */
    init: function(record) {
        this.records = [];
        this._toggleGroup= "_rctr_addon";

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

        this._formAction = new Ext.Action({
            handler: this._showFormCard,
            scope: this,
            disabled: true,
            text: this.tr("rctr.showform"),
            toggleGroup: this._toggleGroup,
            allowDepress: true,
            iconCls: "rctr-form",
            iconAlign: "top",
            tooltip: this.tr("rctr.showform.tip")
        });
        this._removeRecordsBtn = new Ext.Button({
            text: this.tr("rctr.grid.remove"),
            tooltip: this.tr("rctr.grid.remove.tip"),
            iconCls: 'btn-removeall',
            disabled: true,
            handler: function(btn) {
                var grid = btn.ownerCt.ownerCt,
                    sm = grid.getSelectionModel();
                this._store.remove(sm.getSelections());
            },
            scope: this
        });
        this._store = new GeoExt.data.FeatureStore({
            layer: this._vectorLayer,
            fields: [
                this.options.layer.fields.id,
                this.options.layer.fields.label
            ],
            initDir: GeoExt.data.FeatureStore.STORE_TO_LAYER,
            listeners: {
                "load": this._onStoreCountChanged,
                "remove": this._onStoreCountChanged,
                scope: this
            }
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
     * Method: _onStoreCountChanged
     * 
     */
    _onStoreCountChanged: function(s) {
        var c = s.getCount(),
            action = this._formAction;
        if (s.getCount() == 0) {
            action.setText(this.tr("rctr.showform"));
            action.disable();
        } else {
            action.enable();
            action.setText(this.tr("rctr.showform") + " ("+ c +")");
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
    },

    /**
     * Method: _tearDown
     * remove layers from the map
     */
    _tearDown: function() {
        this._up = false;
        this._store.removeAll();
        this.map.removeControl(this._sfControl);
        this.map.removeControl(this._gfiControl);
        this.map.removeLayer(this._vectorLayer);
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
        var idField = this.options.layer.fields.id;
        if (!o.features || !o.features[0] ||
            // feature id already exists in store:
            this._store.find(idField, o.features[0].data[idField]) > -1) {
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
     * Method: _showWelcomeCard
     *
     */
    _showWelcomeCard: function() {
        this._cardPanel.layout.setActiveItem(0);
    },

    /**
     * Method: _showGridCard
     *
     */
    _showGridCard: function() {
        this._cardPanel.layout.setActiveItem(1);
        this._addDrawBox();
    },

    /**
     * Method: _showFormCard
     *
     */
    _showFormCard: function() {
        // clear selections:
        this.window.findById("rctr_grid").getSelectionModel().clearSelections();
        // before switching to form:
        this._cardPanel.layout.setActiveItem(2);
    },

    /**
     * Method: _createWindow
     * called when the layer record is available
     */
    _createWindow: function() {
        var me = this;
        // add vector layer + control first:
        // (they are required for the GeoExt.grid.FeatureSelectionModel)
        this.map.addLayer(this._vectorLayer);
        this.map.addControl(this._sfControl);
        // reset form action state:
        this._formAction.setText(this.tr("rctr.showform"));
        this._formAction.disable();
        // create GFI control:
        this._gfiControl = new OpenLayers.Control.WMSGetFeatureInfo({
            layers: [this.layerRecord.getLayer()],
            maxFeatures: 1,
            infoFormat: "application/vnd.ogc.gml",
            eventListeners: {
                "beforegetfeatureinfo": this._removeDrawBox,
                "getfeatureinfo": this._onGetFeatureInfo,
                "activate": this._showGridCard,
                "deactivate": this._removeDrawBox,
                scope: this
            }
        });
        // create window:
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
                    defaults: {
                        width: 80
                    },
                    items: [
                        new Ext.Action({
                            handler: this._showWelcomeCard,
                            scope: this,
                            text: this.tr("rctr.welcome"),
                            toggleGroup: this._toggleGroup,
                            allowDepress: true,
                            pressed: true,
                            iconCls: "rctr-welcome",
                            iconAlign: "top",
                            tooltip: this.tr("rctr.welcome.tip")
                        }),
                        new GeoExt.Action({
                            control: this._gfiControl,
                            map: this.map,
                            // button options
                            toggleGroup: this._toggleGroup,
                            allowDepress: true,
                            tooltip: this.tr("rctr.selecttool.tip"),
                            iconCls: "rctr-select",
                            text: this.tr("rctr.selecttool"),
                            iconAlign: "top",
                            // check item options
                            checked: false
                        }), //"->",
                        this._formAction
                    ]
                }, {
                    region: "center",
                    id: "rctr_card",
                    border: false,
                    layout: "card",
                    deferredRender: true,
                    activeItem: 0,
                    defaults: {
                        border: false
                    },
                    items: [{
                        xtype: "panel",
                        id: "rctr_welcome",
                        bodyStyle: "padding: 1em;",
                        html: this.tr("rctr.welcome.htmlcontent")
                    }, {
                        xtype: "grid",
                        id: "rctr_grid",
                        store: this._store,
                        frame: false,
                        viewConfig: {
                            forceFit: true
                        },
                        sm: new GeoExt.grid.FeatureSelectionModel({
                            singleSelect: false,
                            selectControl: this._sfControl,
                            listeners: {
                                "selectionchange": function(sm) {
                                    this._removeRecordsBtn.setDisabled(
                                        sm.getCount() == 0
                                    );
                                },
                                scope: this
                            }
                        }),
                        columns: [{
                            header: this.tr("rctr.grid.id"),
                            dataIndex: this.options.layer.fields.id,
                            width: 40 // TODO: config for this ?
                        }, {
                            header: this.tr("rctr.grid.label"),
                            dataIndex: this.options.layer.fields.label
                        }],
                        bbar: ["->", this._removeRecordsBtn],
                        listeners: {
                            "beforedestroy": function() {
                                this._vectorLayer.destroyFeatures();
                                this.selModel && this.selModel.unbind();
                                // this deactivates Feature handler,
                                // and moves vector layer layer back to normal z-index
                                return true;
                            },
                            scope: this
                        }
                    }, {
                        layout: "border",
                        defaults: {
                            border: false,
                        },
                        items: [{
                            region: "north",
                            bodyStyle: "padding:10px;",
                            html: this.tr("rctr.form.textabove"),
                            height: 35
                        }, {
                            xtype: "form",
                            region: "center",
                            id: "rctr_form",
                            labelWidth: 110,
                            labelAlign: "right",
                            //standardSubmit: false,
                            monitorValid: true,
                            defaults: {
                                anchor: "-20px"
                            },
                            defaultType: "textfield",
                            labelSeparator: this.tr("labelSeparator"),
                            items: this._getFormItems(),
                            buttons: [{
                                text: this.tr("rctr.form.submit"),
                                formBind: true,
                                handler: function() {
                                    var fp = this.ownerCt.ownerCt,
                                        form = fp.getForm();
                                    if (form.isValid()) {
                                        var v = form.getValues(),
                                            ids = me._store.collect(me.options.layer.fields.id);
                                        console.log(v, ids);
                                        // mailto:xxx@yy.fr?cc=bb,gg&subject=zzz&body=aaa
                                    }
                                }
                            }]
                        }]
                    }]
                }]
            },
            listeners: {
                "hide": this._tearDown,
                scope: this
            }
        });
        this.window.show();
        this._cardPanel = this.window.findById("rctr_card");
        this.window.alignTo(
            Ext.get(this.map.div),
            "tr-tr",
            [-5, 5],
            true
        );
    },

    /**
     * Method: _getFormItems
     * 
     */
    _getFormItems: function() {
        return [{
                fieldLabel: this.tr("rctr.form.firstname"),
                labelStyle: "font-weight:bold;",
                name: "first_name",
                value: GEOR.config.USERFIRSTNAME || "",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rctr.form.lastname"),
                labelStyle: "font-weight:bold;",
                name: "last_name",
                value: GEOR.config.USERLASTNAME || "",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rctr.form.org"),
                labelStyle: "font-weight:bold;",
                value: GEOR.config.USERORG || "",
                name: "company",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rctr.form.service"),
                labelStyle: "font-weight:bold;",
                value: "",
                name: "service",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rctr.form.email"),
                labelStyle: "font-weight:bold;",
                name: "email",
                vtype: "email",
                value: GEOR.config.USEREMAIL || "",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rctr.form.phone"),
                value: GEOR.config.USERTEL || "",
                name: "tel"
            }, {
                xtype: "textarea",
                fieldLabel: this.tr("rctr.form.comments"),
                name: "comment",
                height: 120
            }, {
                xtype:"checkboxgroup",
                allowBlank: false,
                columns: 1,
                items: [{
                    boxLabel: this.tr("rctr.form.aboveground"),
                    name: "aboveground"
                }, {
                    boxLabel: this.tr("rctr.form.underground"),
                    name: "underground"
                }]
            }
        ];
    },

    /**
     * Method: _addLayer
     * 
     */
    _addLayer: function(cfg, isBaseLayer, callback) {
        // check layer is not already loaded
        var quit = false;
        this.mapPanel.layers.each(function(record) {
            var layer = record.getLayer();
            if (!layer.url || (cfg.service !== layer.url && cfg.name !== record.get("name"))) {
                // skip layers that are not in cfg
                return;
            }
            if (isBaseLayer) {
                // keep a reference to baselayer records:
                this.records.push(record);
            } else {
                // keep a reference to the carroyage layer record:
                this.layerRecord = record;
            }
            quit = true;
        }, this);
        if (quit) {
            callback && callback.call(this);
            return;
        }
        // go on with adding layer:
        var layerOptions = isBaseLayer ? {
            gutter: 0,
            transitionEffect: "resize",
            tileSize: new OpenLayers.Size(256, 256)
        } : {};
        var u = GEOR.util.splitURL(cfg.service);
        GEOR.ows.WMSCapabilities({
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
        this.window && this.window.hide(); // will invoke tearDown
        this._gfiControl && this._gfiControl.deactivate() && this._gfiControl.destroy();
        this._store = null;
        this._sfControl = null;
        this._vectorLayer = null;
        this.window = null;
        GEOR.Addons.Base.prototype.destroy.call(this);
    }
});
