/*global
 Ext, GeoExt, OpenLayers, GEOR
 */
Ext.namespace("GEOR.Addons");

/*
TODO:
 * template mail (?)
 * mailto (?)
*/

GEOR.Addons.RMTR = Ext.extend(GEOR.Addons.Base, {

    window: null,
    toggleGroup: null,
    layerRecord: null,
    records: null,
    vectorLayer: null,
    drawLayer: null,
    sfControl: null,
    store: null,
    cardPanel: null,
    formAction: null,
    removeRecordsBtn: null,
    gfiControl: null,
    attributeStore: null,
    geometryName: null,
    protocol: null,
    _up: false,

    /**
     * Method: init
     *
     * Parameters:
     * record - {Ext.data.record} a record with the addon parameters
     */
    init: function(record) {
        this.records = [];
        this.toggleGroup= "_rmtr_addon";
        var pseudoRecord = {
            typeName: this.options.layer.name,
            owsURL: this.options.layer.service
        };
        this.attributeStore = GEOR.ows.WFSDescribeFeatureType(pseudoRecord, {
            extractFeatureNS: true,
            success: function() {
                // we get the geometry column name
                var idx = this.attributeStore.find("type", GEOR.ows.matchGeomProperty);
                if (idx > -1) {
                    // we have a geometry
                    var r = this.attributeStore.getAt(idx),
                        geometryName = r.get("name");
                    // create the protocol:
                    this.protocol = GEOR.ows.WFSProtocol(pseudoRecord, this.map, {
                        geometryName: geometryName
                    });
                    this.geometryName = geometryName;
                    // remove geometry from attribute store:
                    //this.attributeStore.remove(r);
                } else {
                    GEOR.util.infoDialog({
                        msg: this.tr("querier.layer.no.geom")
                    });
                }
            },
            failure: function() {
                GEOR.util.errorDialog({
                    msg: this.tr("querier.layer.error")
                });
            },
            scope: this
        });
        this.vectorLayer = new OpenLayers.Layer.Vector("__georchestra_"+record.get("id"), {
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
        this.drawLayer = new OpenLayers.Layer.Vector("__georchestra_"+record.get("id")+"_draw", {
            displayInLayerSwitcher: false,
            eventListeners: {
                "sketchcomplete": this._onSketchComplete,
                scope: this
            }
        });
        // create select feature control (used by selection model)
        this.sfControl = new OpenLayers.Control.SelectFeature(this.vectorLayer, {
            toggle: true,
            multipleKey: Ext.isMac ? "metaKey" : "ctrlKey"
        });
        // we make sure that we cannot select the same object two times:
        this.sfControl.handlers.feature.stopDown = true;

        this.formAction = new Ext.Action({
            handler: this._showFormCard,
            scope: this,
            disabled: true,
            text: this.tr("rmtr.showform"),
            toggleGroup: this.toggleGroup,
            allowDepress: true,
            iconCls: "rmtr-form",
            iconAlign: "top",
            tooltip: this.tr("rmtr.showform.tip")
        });
        this.removeRecordsBtn = new Ext.Button({
            text: this.tr("rmtr.grid.remove"),
            tooltip: this.tr("rmtr.grid.remove.tip"),
            iconCls: 'btn-removeall',
            disabled: true,
            handler: function(btn) {
                var grid = btn.ownerCt.ownerCt,
                    sm = grid.getSelectionModel();
                this.store.remove(sm.getSelections());
            },
            scope: this
        });
        var storeFields = []
        Ext.each(this.options.layer.fields, function(f) {
            storeFields.push({
                name: f.name,
                type: f.type
            });
        });
        this.store = new GeoExt.data.FeatureStore({
            layer: this.vectorLayer,
            fields: storeFields,
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
                iconCls: "addon-rmtr",
                handler: this._onCheckchange,
                scope: this
            });
            this.target.doLayout();
        } else {
            // create a menu item for the "tools" menu:
            this.item = new Ext.menu.CheckItem({
                text: this.getText(record),
                qtip: this.getQtip(record),
                iconCls: "addon-rmtr",
                checked: false,
                listeners: {
                    "checkchange": this._onCheckchange,
                    scope: this
                }
            });
        }
    },

    /**
     * Method: _onSketchComplete
     * Callback on sketch completed
     */
    _onSketchComplete: function(o) {
        var geom = o.feature.geometry.clone();
        // remove drawn feature:
        this.drawLayer.destroyFeatures([o.feature]);
        if (!this.protocol || !this.geometryName) {
            return;
        }
        var filter = new OpenLayers.Filter.Spatial({
            type: OpenLayers.Filter.Spatial.INTERSECTS,
            property: this.geometryName,
            value: geom
        });
        // WFS GetFeature request intersecting current geometry
        this.protocol.read({
            maxFeatures: GEOR.config.MAX_FEATURES,
            propertyNames: this.attributeStore.collect("name"),
            filter: filter,
            callback: function(response) {
                if (!response.success()) {
                    return;
                }
                // do not load features twice:
                var idField = this.options.layer.fields[0].name,
                    featuresToLoad = [];
                Ext.each(response.features, function(f) {
                    if (this.store.find(idField, f.data[idField]) == -1) {
                        featuresToLoad.push(f);
                    }
                }, this);
                // push to store:
                this.store.loadData(featuresToLoad, true);
            },
            scope: this
        });
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
            action = this.formAction;
        if (s.getCount() == 0) {
            action.setText(this.tr("rmtr.showform"));
            action.disable();
        } else {
            action.enable();
            action.setText(this.tr("rmtr.showform") + " ("+ c +")");
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
        this.store.removeAll();
        this.map.removeControl(this.sfControl);
        this.map.removeControl(this.gfiControl);
        this.map.removeLayer(this.vectorLayer);
        this.map.removeLayer(this.drawLayer);
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
        var idField = this.options.layer.fields[0].name;
        if (!o.features || !o.features[0] ||
            // feature id already exists in store:
            this.store.find(idField, o.features[0].data[idField]) > -1) {
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
        this.store.loadData(o.features, true);
    },

    /**
     * Method: _showWelcomeCard
     *
     */
    _showWelcomeCard: function() {
        this.cardPanel.layout.setActiveItem(0);
    },

    /**
     * Method: _showGridCard
     *
     */
    _showGridCard: function() {
        this.cardPanel.layout.setActiveItem(1);
        this._addDrawBox();
    },

    /**
     * Method: _showFormCard
     *
     */
    _showFormCard: function() {
        // clear selections:
        this.window.findById("rmtr_grid").getSelectionModel().clearSelections();
        // before switching to form:
        this.cardPanel.layout.setActiveItem(2);
    },

    /**
     * Method: _createWindow
     * called when the layer record is available
     */
    _createWindow: function() {
        // add vector layer + control first:
        // (they are required for the GeoExt.grid.FeatureSelectionModel)
        this.map.addLayer(this.vectorLayer);
        this.map.addLayer(this.drawLayer);
        this.map.addControl(this.sfControl);
        // reset form action state:
        this.formAction.setText(this.tr("rmtr.showform"));
        this.formAction.disable();
        // create GFI control:
        this.gfiControl = new OpenLayers.Control.WMSGetFeatureInfo({
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
        this._drawLineControl = new OpenLayers.Control.DrawFeature(this.drawLayer, OpenLayers.Handler.Path, {
            eventListeners: {
                "activate": this._showGridCard,
                scope: this
            }
        });
        this._drawPolygonControl = new OpenLayers.Control.DrawFeature(this.drawLayer, OpenLayers.Handler.Polygon, {
            eventListeners: {
                "activate": this._showGridCard,
                scope: this
            }
        });
        var columns = [];
        Ext.each(this.options.layer.fields, function(f) {
            var c = {
                dataIndex: f.name,
                header: f.header
            };
            if (f.width) {
                c.width = f.width;
            }
            columns.push(c);
        });
        // create window:
        this.window = new Ext.Window({
            title: this.tr("rmtr.window.title"),
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
                            text: this.tr("rmtr.welcome"),
                            toggleGroup: this.toggleGroup,
                            allowDepress: true,
                            pressed: true,
                            iconCls: "rmtr-welcome",
                            iconAlign: "top",
                            tooltip: this.tr("rmtr.welcome.tip")
                        }),
                        new GeoExt.Action({
                            control: this.gfiControl,
                            map: this.map,
                            // button options
                            toggleGroup: this.toggleGroup,
                            allowDepress: true,
                            tooltip: this.tr("rmtr.selecttool.tip"),
                            iconCls: "rmtr-select",
                            text: this.tr("rmtr.selecttool"),
                            iconAlign: "top",
                            // check item options
                            checked: false
                        }),
                        new GeoExt.Action({
                            control: this._drawLineControl,
                            map: this.map,
                            // button options
                            toggleGroup: this.toggleGroup,
                            allowDepress: true,
                            tooltip: this.tr("rmtr.linetool.tip"),
                            iconCls: "rmtr-line-select",
                            text: this.tr("rmtr.linetool"),
                            iconAlign: "top",
                            // check item options
                            checked: false
                        }),
                        new GeoExt.Action({
                            control: this._drawPolygonControl,
                            map: this.map,
                            // button options
                            toggleGroup: this.toggleGroup,
                            allowDepress: true,
                            tooltip: this.tr("rmtr.polygontool.tip"),
                            iconCls: "rmtr-polygon-select",
                            text: this.tr("rmtr.polygontool"),
                            iconAlign: "top",
                            // check item options
                            checked: false
                        }), //"->",
                        this.formAction
                    ]
                }, {
                    region: "center",
                    id: "rmtr_card",
                    border: false,
                    layout: "card",
                    deferredRender: true,
                    activeItem: 0,
                    defaults: {
                        border: false
                    },
                    items: [{
                        xtype: "panel",
                        id: "rmtr_welcome",
                        bodyStyle: "padding: 1em;",
                        html: this.tr("rmtr.welcome.htmlcontent")
                    }, {
                        xtype: "grid",
                        id: "rmtr_grid",
                        store: this.store,
                        frame: false,
                        viewConfig: {
                            forceFit: true
                        },
                        sm: new GeoExt.grid.FeatureSelectionModel({
                            singleSelect: false,
                            selectControl: this.sfControl,
                            listeners: {
                                "selectionchange": function(sm) {
                                    this.removeRecordsBtn.setDisabled(
                                        sm.getCount() == 0
                                    );
                                },
                                scope: this
                            }
                        }),
                        columns: columns,
                        bbar: ["->", this.removeRecordsBtn],
                        listeners: {
                            "beforedestroy": function() {
                                this.vectorLayer.destroyFeatures();
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
                            html: this.tr("rmtr.form.textabove"),
                            height: 35
                        }, {
                            xtype: "form",
                            region: "center",
                            id: "rmtr_form",
                            labelWidth: 115,
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
                                text: this.tr("rmtr.form.submit"),
                                formBind: true,
                                handler: this._submit,
                                scope: this
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
        this.cardPanel = this.window.findById("rmtr_card");
        this.window.alignTo(
            Ext.get(this.map.div),
            "tr-tr",
            [-5, 5],
            true
        );
    },

    /**
     * Method: _submit
     *
     */
    _submit: function() {
        var fp = this.window.findByType("form")[0],
            form = fp.getForm();
        if (!form.isValid()) {
            return;
        }
        var v = form.getValues(),
            o = this.options;
        v.tiles = this.store.collect(this.options.layer.fields[0].name).join(', ');
        var spec = {
            "subject": o.subject,
            "body": new Ext.XTemplate(o.template).apply(v)
        };
        if (o.to && o.to[0]) {
            spec.to = o.to;
        }
        if (o.cc && o.cc[0]) {
            spec.cc = o.cc;
        }
        if (o.bcc && o.bcc[0]) {
            spec.bcc = o.bcc;
        }
        GEOR.waiter.show();
        OpenLayers.Request.POST({
            url: "/ldapadmin/emailProxy",
            data: new OpenLayers.Format.JSON().write(spec),
            success: function(response) {
                GEOR.util.infoDialog({
                    msg: this.tr("rmtr.request.sent")
                });
            },
            scope: this
        });
    },

    /**
     * Method: _getFormItems
     * 
     */
    _getFormItems: function() {
        return [{
                fieldLabel: this.tr("rmtr.form.firstname"),
                labelStyle: "font-weight:bold;",
                name: "first_name",
                value: GEOR.config.USERFIRSTNAME || "",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rmtr.form.lastname"),
                labelStyle: "font-weight:bold;",
                name: "last_name",
                value: GEOR.config.USERLASTNAME || "",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rmtr.form.org"),
                labelStyle: "font-weight:bold;",
                value: GEOR.config.USERORG || "",
                name: "company",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rmtr.form.service"),
                labelStyle: "font-weight:bold;",
                value: "",
                name: "service",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rmtr.form.email"),
                labelStyle: "font-weight:bold;",
                name: "email",
                vtype: "email",
                value: GEOR.config.USEREMAIL || "",
                allowBlank: false
            }, {
                fieldLabel: this.tr("rmtr.form.phone"),
                value: GEOR.config.USERTEL || "",
                name: "tel"
            }, {
                xtype: "textarea",
                fieldLabel: this.tr("rmtr.form.comments"),
                labelStyle: "font-weight:bold;",
                name: "comment",
                height: 120,
                allowBlank: false
            }, {
                xtype:"checkboxgroup",
                allowBlank: false,
                columns: 1,
                items: [{
                    boxLabel: this.tr("rmtr.form.aboveground"),
                    name: "aboveground",
                    inputValue: "true"
                }, {
                    boxLabel: this.tr("rmtr.form.underground"),
                    name: "underground",
                    inputValue: "true"
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
            if (!layer.url || 
                (!OpenLayers.Util.isEquivalentUrl(cfg.service, layer.url) && cfg.name !== record.get("name"))) {
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
        this.gfiControl && this.gfiControl.deactivate() && this.gfiControl.destroy();
        this.store = null;
        this.sfControl = null;
        this.vectorLayer = null;
        this.window = null;
        GEOR.Addons.Base.prototype.destroy.call(this);
    }
});
