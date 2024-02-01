sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../js/Common",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/HashChanger",
    'sap/m/Token',
    'sap/m/ColumnListItem',
    'sap/m/Label',
    "../js/TableValueHelp",
    "../js/TableFilter",
    'jquery.sap.global',
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Common, Filter, FilterOperator, HashChanger, Token, ColumnListItem, Label, TableValueHelp, TableFilter, jQuery) {
        "use strict";
        var me;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "YYYY-MM-dd" });
        var sapDateFormat2 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyyMMdd" });
        return Controller.extend("zuiprodoutput.controller.main", {
            onInit: function () {
                me = this;
                this._aColumns = {};
                this._aDataBeforeChange = [];
                this._validationErrors = [];
                this._aInvalidValueState = [];
                this._bHdrChanged = false;
                this._bDtlChanged = false;
                this._dataMode = "READ";
                this._aColFilters = [];
                this._aColSorters = [];
                this._aMultiFiltersBeforeChange = [];
                this._aFilterableColumns = {};
                this._sActiveTable = "headerTab";
                this._oModel = this.getOwnerComponent().getModel();
                this._tableValueHelp = TableValueHelp;
                this._tableFilter = TableFilter;
                this._colFilters = {};

                this._oTableLayout = {
                    headerTab: {
                        type: "PRDOUTPUTHDR",
                        tabname: "ZERP_IOHDR"
                    },
                    detailTab: {
                        type: "PRDOUTPUTDTL",
                        tabname: "ZERP_IOPROCOUT"
                    }
                }


                var oModel = new sap.ui.model.json.JSONModel();
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })

                // alert(this._userid);
                this.setSmartFilterModel();


                this.getView().setModel(new JSONModel({
                    activeIONO: "",
                    dataWrap: {
                        headerTab: false,
                        detailTab: false
                    }
                }), "ui");

                this._counts = {
                    header: 0,
                    detail: 0
                }

                this.getView().setModel(new JSONModel(this._counts), "counts");

                this.byId("headerTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("detailTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                var oDDTextParam = [], oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oDDTextParam.push({ CODE: "SBU" });
                oDDTextParam.push({ CODE: "INFO_NO_RECORD_TO_PROC" });
                oDDTextParam.push({ CODE: "INFO_NO_SEL_RECORD_TO_PROC" });
                oDDTextParam.push({ CODE: "INFO_NO_LAYOUT" });
                oDDTextParam.push({ CODE: "INFO_LAYOUT_SAVE" });
                oDDTextParam.push({ CODE: "INFO_INPUT_REQD_FIELDS" });
                oDDTextParam.push({ CODE: "CONFIRM_DISREGARD_CHANGE" });
                oDDTextParam.push({ CODE: "INFO_SEL_RECORD_TO_DELETE" });
                oDDTextParam.push({ CODE: "INFO_DATA_DELETED" });
                oDDTextParam.push({ CODE: "CONF_DELETE_RECORDS" });
                oDDTextParam.push({ CODE: "INFO_ERROR" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_SAVE" });
                oDDTextParam.push({ CODE: "INFO_DATA_SAVE" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_EDIT" });
                oDDTextParam.push({ CODE: "INFO_CHECK_INVALID_ENTRIES" });
                oDDTextParam.push({ CODE: "ADD" });
                oDDTextParam.push({ CODE: "EDIT" });
                oDDTextParam.push({ CODE: "SAVE" });
                oDDTextParam.push({ CODE: "CANCEL" });
                oDDTextParam.push({ CODE: "DELETE" });
                oDDTextParam.push({ CODE: "REFRESH" });
                oDDTextParam.push({ CODE: "COPY" });
                oDDTextParam.push({ CODE: "INFO_INPUT_REQD_FIELDS" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_MODIFIED" });
                oDDTextParam.push({ CODE: "INFO_DATA_COPIED" });
                oDDTextParam.push({ CODE: "WRAP" });
                oDDTextParam.push({ CODE: "UNWRAP" });

                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam }, {
                    method: "POST",
                    success: function (oData, oResponse) {
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        me.getView().setModel(new JSONModel(oDDTextResult), "ddtext");
                    },
                    error: function (err) { }
                });

                var oTableEventDelegate = {
                    onkeyup: function (oEvent) {
                        me.onKeyUp(oEvent);
                    },

                    onAfterRendering: function (oEvent) {
                        var oControl = oEvent.srcControl;
                        var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                        if (sTabId.substr(sTabId.length - 3) === "Tab") me._tableRendered = sTabId;
                        else me._tableRendered = "";

                        me.onAfterTableRendering();
                    },

                    onclick: function (oEvent) {
                        me.onTableClick(oEvent);
                    }
                };

                this.byId("headerTab").addEventDelegate(oTableEventDelegate);
                this.byId("detailTab").addEventDelegate(oTableEventDelegate);


                this.byId("headerTab").attachBrowserEvent("mousemove", function (oEvent) {
                    //get your model and do whatever you want:
                    console.log("mouseenter")
                });

                //this.getData();

                // this._oModel.read('/IODLVSet', {
                //     async: false,
                //     success: function (oData) {
                //         me.getView().setModel(new JSONModel(oData.results), "COMPONENT_MODEL");
                //     },
                //     error: function (err) { }
                // })


                //this.getAppAction();
            },
            setSmartFilterModel: function () {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_IO_FILTER_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },
            onSearch: function () {
                this.getColumnProp();
                this.getData();
            },
            getData() {
                Common.openLoadingDialog(this);
                var vProcess = this.byId('cboxProcess').getSelectedKey();
                var aFilters = this.getView().byId("smartFilterBar").getFilters();
                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/PRODOUTPUTIOHDRSet', {
                    filters: aFilters,
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            data.results.sort((a, b) => (a.IONO > b.IONO ? 1 : -1));
                        }

                        data.results.forEach((item, index) => {
                            if (index === 0) {
                                me.getView().getModel("ui").setProperty("/activeIONO", item.IONO);
                                // me.getProcess(item.IONO);
                                // me.getDtls(item.IONO, vProcess);

                                me.getDatas(item.IONO);
                                // me.getProcess(item.IONO)
                                // .then(function(vProcess) {
                                //     return me.getDtls(item.IONO, vProcess);
                                // })
                                // .then(function(resultFromGetDtls) {
                                //     me.getView().setModel(new JSONModel(resultFromGetDtls), "DTLS_MODEL");
                                //     me.byId("detailTab").getModel().setProperty("/rows", resultFromGetDtls);
                                //     me.byId("detailTab").bindRows("/rows");
                                //     me.getView().getModel("counts").setProperty("/detail", resultFromGetDtls.length);

                                //     Common.closeLoadingDialog(me);
                                // })
                                // .catch(function(error) {
                                //     // Handle errors that may occur in either getProcess or getDtls
                                //     console.error("An error occurred:", error);
                                // });
                            }
                        });

                        me.byId("headerTab").getModel().setProperty("/rows", data.results);
                        me.byId("headerTab").bindRows("/rows");
                        me.getView().getModel("counts").setProperty("/header", data.results.length);
                        me.setActiveRowHighlight("headerTab");
                        Common.closeLoadingDialog(me);
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(me);
                    }
                });
            },
            // getProcess(IONO) {
            //     var oJSONCommonDataModel = new JSONModel();
            //     var oModel = this.getOwnerComponent().getModel();
            //     oModel.read("/OutputBreakdownProcessSet", {
            //         urlParameters: {
            //             "$filter": "IONO eq '" + IONO + "'"
            //         },
            //         success: function (oData, oResponse) {
            //             if (oData.results.length > 0) {
            //                 me.isHasPOB(oData.results[0].PROCESSCD);
            //                 if (me.hasPOB === true) {
            //                     me.byId("btnOutputBreakdown").setEnabled(true);
            //                 }
            //                 else {
            //                     me.byId("btnOutputBreakdown").setEnabled(false);
            //                 }
            //                 me.byId("btnAddDtl").setEnabled(true);
            //                 me.byId("btnEditDtl").setEnabled(true);
            //                 me.byId("btnDeleteDtl").setEnabled(true);
            //                 //me.byId("btnRefreshDtls").setEnabled(true);
            //                 oJSONCommonDataModel.setData(oData);
            //                 me.getView().setModel(oJSONCommonDataModel, "processData");
            //                 me.getView().getModel("ui").setProperty("/process", oData.results[0].PROCESSCD);
            //                 //_this.getDtls(iono,oData.results[0].PROCESSCD)
            //             }
            //             else {
            //                 me.byId("btnAddDtl").setEnabled(false);
            //                 me.byId("btnEditDtl").setEnabled(false);
            //                 me.byId("btnOutputBreakdown").setEnabled(false);
            //                 me.byId("btnDeleteDtl").setEnabled(false);
            //                 //me.byId("btnRefreshDtls").setEnabled(false);
            //                 oJSONCommonDataModel.setData("");
            //                 me.getView().setModel(oJSONCommonDataModel, "processData");
            //             }
            //         },
            //         error: function (err) { }
            //     });
            // },
            getProcess(IONO) {
                //me.byId("btnOutputBreakdown").setEnabled(false);
                return new Promise(function (resolve, reject) {
                    var oJSONCommonDataModel = new JSONModel();
                    var oModel = this.getOwnerComponent().getModel();
                    oModel.read("/OutputBreakdownProcessSet", {
                        urlParameters: {
                            "$filter": "IONO eq '" + IONO + "'"
                        },
                        success: function (oData, oResponse) {
                            oJSONCommonDataModel.setData([]);
                            me.getView().getModel("ui").setProperty("/process", "");
                            if (oData.results.length > 0) {
                                me.isHasPOB(oData.results[0].PROCESSCD).then(function (hasPOB) {
                                    if (hasPOB) {
                                        me.byId("btnOutputBreakdown").setEnabled(true);
                                    }
                                    else {
                                        me.byId("btnOutputBreakdown").setEnabled(false);
                                    }

                                    //console.log("me.hasPOB",me.hasPOB);
                                    // if (me.hasPOB === true) {
                                    //     me.byId("btnOutputBreakdown").setEnabled(true);
                                    // }

                                    me.byId("btnAddDtl").setEnabled(true);
                                    me.byId("btnEditDtl").setEnabled(true);
                                    me.byId("btnDeleteDtl").setEnabled(true);
                                    //me.byId("btnRefreshDtls").setEnabled(true);

                                    oJSONCommonDataModel.setData(oData);
                                    me.getView().setModel(oJSONCommonDataModel, "processData");
                                    me.getView().getModel("ui").setProperty("/process", oData.results[0].PROCESSCD);
                                    var vProcess = oData.results[0].PROCESSCD;
                                    resolve(vProcess);

                                });
                                // if (me.hasPOB === true) {
                                //     me.byId("btnOutputBreakdown").setEnabled(true);
                                // }
                                // else {
                                //     me.byId("btnOutputBreakdown").setEnabled(false);
                                // }


                            } else {
                                //me.getView().setModel(new JSONModel([]), "DTLS_MODEL");
                                var oDTLSModel = me.getView().getModel("DTLS_MODEL");
                                var oTable = me.byId("detailTab");

                                // Check if the table has data
                                if (oDTLSModel && oDTLSModel.getData() && oDTLSModel.getData().length > 0) {
                                    // Clear the existing data in the model
                                    oDTLSModel.setData([]); // or oDTLSModel.setData([]) if your data is an array

                                    // Update the bindings to reflect the changes in the table
                                    oTable.bindRows("/");

                                    //me.getView().setModel(new JSONModel(resultFromGetDtls), "DTLS_MODEL");
                                    oTable.getModel().setProperty("/rows", []);
                                    oTable.bindRows("/rows");
                                } else {
                                    console.log("Table does not have data, no need to clear rows.");
                                }

                                me.byId("btnAddDtl").setEnabled(false);
                                me.byId("btnEditDtl").setEnabled(false);
                                me.byId("btnOutputBreakdown").setEnabled(false);
                                me.byId("btnDeleteDtl").setEnabled(false);
                                //me.byId("btnRefreshDtls").setEnabled(false);
                                oJSONCommonDataModel.setData("");
                                me.getView().setModel(oJSONCommonDataModel, "processData");
                                reject("No data found for IONO: " + IONO);
                            }
                        },
                        error: function (err) {
                            reject(err);
                        }
                    });
                }.bind(this));
            },
            onRefresh: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.refreshData();
            },
            refreshData() {
                if (this._dataMode === "READ") {

                    this._aColFilters = this.byId(this._sActiveTable).getBinding("rows").aFilters;
                    this._aColSorters = this.byId(this._sActiveTable).getBinding("rows").aSorters;

                    if (this._sActiveTable === "headerTab") {
                        //this.getHeaderData();
                        me.getData();
                        //Common.closeLoadingDialog(me);
                    }
                    else if (this._sActiveTable === "detailTab") {
                        Common.openLoadingDialog(this);
                        var vProcess = this.byId('cboxProcess').getSelectedKey();
                        var vIONO = this.getView().getModel("ui").getData().activeIONO;

                        me.getDtls(vIONO, vProcess).then(function (resultFromGetDtls) {
                            me.getView().getModel("counts").setProperty("/detail", 0);
                            me.getView().setModel(new JSONModel(resultFromGetDtls), "DTLS_MODEL");
                            me.byId("detailTab").getModel().setProperty("/rows", resultFromGetDtls);
                            me.byId("detailTab").bindRows("/rows");
                            me.getView().getModel("counts").setProperty("/detail", resultFromGetDtls.length);

                            Common.closeLoadingDialog(me);
                        })
                            .catch(function (error) {
                                Common.closeLoadingDialog(me);
                                console.error("An error occurred:", error);
                            });

                    }
                }
            },
            onProcessChange: function (oEvent) {
                Common.openLoadingDialog(this);
                var vProcess = this.byId('cboxProcess').getSelectedKey();
                var vIONO = this.getView().getModel("ui").getData().activeIONO;
                this.getView().getModel("ui").setProperty("/process", vProcess);
                me.isHasPOB(vProcess).then(function (hasPOB) {
                    if (hasPOB) {
                        me.byId("btnOutputBreakdown").setEnabled(true);
                    }
                    else {
                        me.byId("btnOutputBreakdown").setEnabled(false);
                    }

                    me.getDtls(vIONO, vProcess).then(function (resultFromGetDtls) {
                        me.getView().getModel("counts").setProperty("/detail", 0);
                        me.getView().setModel(new JSONModel(resultFromGetDtls), "DTLS_MODEL");
                        me.byId("detailTab").getModel().setProperty("/rows", resultFromGetDtls);
                        me.byId("detailTab").bindRows("/rows");
                        me.getView().getModel("counts").setProperty("/detail", resultFromGetDtls.length);

                        Common.closeLoadingDialog(me);
                    })
                        .catch(function (error) {
                            // Handle errors that may occur in either getProcess or getDtls
                            console.error("An error occurred:", error);
                        });
                });
            },
            isHasPOB(process) {
                return new Promise(function (resolve, reject) {
                    var oModel = me.getOwnerComponent().getModel();
                    oModel.read("/OBHASPOBSet", {
                        urlParameters: {
                            "$filter": "PROCESSCD eq '" + process + "'"
                        },
                        success: function (oData, oResponse) {
                            if (oData.results.length > 0) {
                                resolve(oData.results[0].HASPOB === 'X' ? true : false);
                                //me.hasPOB = oData.results[0].HASPOB === 'X' ? true : false;
                            }
                            else {
                                //me.hasPOB = false;
                                resolve(false);
                            }
                        },
                        error: function (err) { }
                    });
                });
            },
            getDtls(IONO, PROCESSCD) {
                return new Promise(function (resolve, reject) {
                    var oModel = this.getOwnerComponent().getModel();
                    oModel.read('/PRDOUTPUTDTLSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + IONO + "' and PROCESSCD eq '" + PROCESSCD + "'"
                        },
                        success: function (data, response) {
                            me.getView().getModel("counts").setProperty("/detail", 0);
                            if (data.results.length > 0) {
                                console.log("dataDtls", data.results);
                                data.results.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));
                                data.results.forEach(item => {
                                    if (item.STARTDT !== null) {
                                        item.STARTDT = dateFormat.format(new Date(item.STARTDT));
                                    }

                                    if (item.FINISHDT !== null) {
                                        item.FINISHDT = dateFormat.format(new Date(item.FINISHDT));
                                    }

                                    if (item.POSTDT !== null) {
                                        item.POSTDT = dateFormat.format(new Date(item.POSTDT));
                                    }

                                    item.MJAHR = item.MJAHR === '0000' ? '' : item.MJAHR;
                                });

                                resolve(data.results); // Resolve the Promise with the data
                            } else {
                                resolve(data.results);
                                //me.getView().getModel("counts").setProperty("/detail",0);
                                //reject("No data found for IONO: " + IONO + ", PROCESSCD: " + PROCESSCD);
                            }

                            Common.closeLoadingDialog(me);
                        },
                        error: function (err) {
                            me.getView().getModel("counts").setProperty("/detail", 0);
                            reject(err);
                            Common.closeLoadingDialog(me);
                        }
                    });
                }.bind(this));
            },
            // getDtls(IONO, PROCESSCD) {
            //     var oModel = this.getOwnerComponent().getModel();
            //     oModel.read('/PRDOUTPUTDTLSet', {
            //         urlParameters: {
            //             "$filter": "IONO eq '" + IONO + "' and PROCESSCD eq '" + PROCESSCD + "'"
            //         },
            //         success: function (data, response) {
            //             if (data.results.length > 0) {
            //                 console.log("dataDtls", data.results);
            //                 data.results.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));
            //                 data.results.forEach(item => {
            //                     if (item.STARTDT !== null) {
            //                         item.STARTDT = dateFormat.format(new Date(item.STARTDT));
            //                     }

            //                     if (item.FINISHDT !== null) {
            //                         item.FINISHDT = dateFormat.format(new Date(item.FINISHDT));
            //                     }

            //                     if (item.POSTDT !== null) {
            //                         item.POSTDT = dateFormat.format(new Date(item.POSTDT));
            //                     }

            //                     item.MJAHR = item.MJAHR === '0000' ? '' : item.MJAHR;
            //                 })
            //             }
            //             me.getView().setModel(new JSONModel(data.results), "DTLS_MODEL");
            //             me.byId("detailTab").getModel().setProperty("/rows", data.results);
            //             me.byId("detailTab").bindRows("/rows");
            //             me.getView().getModel("counts").setProperty("/detail", data.results.length);

            //             Common.closeLoadingDialog(me);
            //         },
            //         error: function (err) {
            //             Common.closeLoadingDialog(me);
            //         }
            //     })
            // },
            onTableResize: function (oEvent) {
                // console.log(this.byId("splitterHdr"))
                this._sActiveTable = oEvent.getSource().data("TableId");

                var vFullScreen = oEvent.getSource().data("Max") === "1" ? true : false;
                var vSuffix = oEvent.getSource().data("ButtonIdSuffix");
                var vHeader = oEvent.getSource().data("Header");
                var me = this;

                // this.byId("smartFilterBar").setFilterBarExpanded(!vFullScreen);
                this.byId("btnFullScreen" + vSuffix).setVisible(!vFullScreen);
                this.byId("btnExitFullScreen" + vSuffix).setVisible(vFullScreen);
                // this._oTables.filter(fItem => fItem.TableId !== me._sActiveTable).forEach(item => me.byId(item.TableId).setVisible(!vFullScreen));

                if (vFullScreen) {
                    if (vHeader === "1") {
                        this.byId("splitterHdr").setProperty("size", "100%");
                        this.byId("splitterDtl").setProperty("size", "0%");
                    }
                    else {
                        this.byId("splitterHdr").setProperty("size", "0%");
                        this.byId("splitterDtl").setProperty("size", "100%");
                    }
                }
                else {
                    this.byId("splitterHdr").setProperty("size", "50%");
                    this.byId("splitterDtl").setProperty("size", "50%");
                }
            },
            onSaveTableLayout: function (oEvent) {
                //saving of the layout of table
                this._sActiveTable = oEvent.getSource().data("TableId");
                var oTable = this.byId(this._sActiveTable);
                var oColumns = oTable.getColumns();
                var vSBU = "VER"; //this.getView().getModel("ui").getData().sbu;
                var me = this;
                var ctr = 1;

                var oParam = {
                    "SBU": vSBU,
                    "TYPE": this._oTableLayout[this._sActiveTable].type,
                    "TABNAME": this._oTableLayout[this._sActiveTable].tabname,
                    "TableLayoutToItems": []
                };

                //get information of columns, add to payload
                oColumns.forEach((column) => {
                    oParam.TableLayoutToItems.push({
                        // COLUMNNAME: column.sId,
                        COLUMNNAME: column.mProperties.sortProperty,
                        ORDER: ctr.toString(),
                        SORTED: column.mProperties.sorted,
                        SORTORDER: column.mProperties.sortOrder,
                        SORTSEQ: "1",
                        VISIBLE: column.mProperties.visible,
                        WIDTH: column.mProperties.width.replace('px', '')
                        //WRAPTEXT: this.getView().getModel("ui").getData().dataWrap[this._sActiveTable] === true ? "X" : ""
                    });

                    ctr++;
                });

                console.log(oParam)

                //call the layout save
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function (data, oResponse) {
                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_LAYOUT_SAVE"]);
                    },
                    error: function (err) {
                        MessageBox.error(err);
                    }
                });
            },
            onWrapText: function (oEvent) {
                this._sActiveTable = oEvent.getSource().data("TableId");
                var vWrap = this.getView().getModel("ui").getData().dataWrap[this._sActiveTable];
                this.byId(this._sActiveTable).getColumns().forEach(col => {
                    var oTemplate = col.getTemplate();
                    if (oTemplate instanceof sap.m.Text) {
                        oTemplate.setWrapping(!vWrap);
                        col.setTemplate(oTemplate);
                    }

                })

                this.getView().getModel("ui").setProperty("/dataWrap/" + [this._sActiveTable], !vWrap);
            },
            onEdit: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.editData();
            },
            editData() {
                if (this._dataMode === "READ") {
                    if (this._sActiveTable === "headerTab") this._bHdrChanged = false;
                    else if (this._sActiveTable === "detailTab") this._bDtlChanged = false;

                    if (this.byId(this._sActiveTable).getModel().getData().rows.length === 0) {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"])
                    }
                    else {
                        if (this._sActiveTable === "detailTab") {
                            this.byId("btnAddDtl").setVisible(false);
                            this.byId("btnEditDtl").setVisible(false);
                            this.byId("btnDeleteDtl").setVisible(false);
                            this.byId("btnRefreshDtl").setVisible(false);
                            this.byId("btnSaveDtl").setVisible(true);
                            this.byId("btnCancelDtl").setVisible(true);
                            this.byId("searchFieldDtl").setVisible(false);
                            this.byId("btnOutputBreakdown").setVisible(false);
                            this.byId("btnExitFullScreenDtl").setVisible(false);

                            this.byId("btnRefreshHdr").setEnabled(false);
                            this.byId("searchFieldHdr").setEnabled(false);
                        }

                        this._aDataBeforeChange = jQuery.extend(true, [], this.byId(this._sActiveTable).getModel().getData().rows);
                        this._validationErrors = [];
                        this._dataMode = "EDIT";

                        if (this.byId(this._sActiveTable).getBinding("rows").aFilters.length > 0) {
                            this._aColFilters = this.byId(this._sActiveTable).getBinding("rows").aFilters;
                        }

                        if (this.byId(this._sActiveTable).getBinding("rows").aSorters.length > 0) {
                            this._aColSorters = this.byId(this._sActiveTable).getBinding("rows").aSorters;
                        }
                        //this.onTableResize('Dtls','Max');
                        this.setRowEditMode();
                    }
                }
            },
            setRowEditMode() {
                var oTable = this.byId(this._sActiveTable);
                var vProcess = this.byId('cboxProcess').getSelectedKey();
                var oInputEventDelegate = {
                    onkeydown: function (oEvent) {
                        me.onInputKeyDown(oEvent);
                    },
                };

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";
                    var oValueHelp = false;

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }

                    this._aColumns[this._sActiveTable.replace("Tab", "")].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.Editable) {
                                if (vProcess === 'FN/PK') {
                                    if (sColName === 'REFDOC' || sColName === 'REMARKS') {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this)
                                        }).addEventDelegate(oInputEventDelegate));
                                    }
                                }
                                else {
                                    if (ci.DataType === "DATETIME") {
                                        if (this._sActiveTable === "detailTab" && sColName === "POSTDT" || sColName === "FINISHDT" || sColName === "STARTDT") {
                                            col.setTemplate(new sap.m.DatePicker({
                                                value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                                displayFormat: "MM/dd/yyyy",
                                                valueFormat: "MM/dd/yyyy",
                                                change: this.onInputLiveChange.bind(this)
                                            }));
                                        }
                                    }
                                    // else {
                                    //     if(sColName === "REFDOC" || sColName === "REMARKS"){
                                    //         col.setTemplate(new sap.m.Input({
                                    //             type: "Text",
                                    //             value: "{" + sColName + "}",
                                    //             maxLength: ci.Length,
                                    //             change: this.onInputLiveChange.bind(this)
                                    //         }).addEventDelegate(oInputEventDelegate));
                                    //     }
                                    // }

                                    if (ci.Mandatory) {
                                        col.getLabel().addStyleClass("sapMLabelRequired");
                                    }
                                }
                            }
                        })
                })
            },
            onCreate: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.byId("btnExitFullScreenDtl").setVisible(false);
                this.byId("smartFilterBar").setVisible(false);
                this.byId("splitterHdr").setProperty("size", "0%");
                this.byId("splitterDtl").setProperty("size", "100%");
                this.createData();
            },
            createData() {
                if (this._dataMode === "READ") {
                    if (this._sActiveTable === "detailTab") {
                        this.byId("btnAddDtl").setVisible(false);
                        this.byId("btnEditDtl").setVisible(false);
                        this.byId("btnDeleteDtl").setVisible(false);
                        this.byId("btnRefreshDtl").setVisible(false);
                        this.byId("btnOutputBreakdown").setVisible(false);
                        this.byId("btnSaveDtl").setVisible(true);
                        this.byId("btnCancelDtl").setVisible(true);
                        this.byId("searchFieldDtl").setVisible(false);
                        this.byId("cboxProcess").setEnabled(false);
                        this.byId("btnFullScreenDtl").setVisible(false);
                        this.byId("btnTabLayoutDtl").setVisible(false);
                        this.byId("btnDataWrapDtls").setVisible(false);

                        //this.byId("btnFullScreenHdr").setEnabled(false);
                        this.byId("btnUploadOutput").setEnabled(false);
                        this.byId("btnRefreshHdr").setEnabled(false);
                        this.byId("searchFieldHdr").setEnabled(false);

                    }

                    var oTable = this.byId(this._sActiveTable);
                    this._aDataBeforeChange = jQuery.extend(true, [], oTable.getModel().getData().rows);
                    this._validationErrors = [];

                    if (oTable.getBinding("rows").aApplicationFilters.length > 0) {
                        this._aMultiFiltersBeforeChange = this._aFilterableColumns["gmc"].filter(fItem => fItem.value !== "");
                        oTable.getBinding("rows").filter("", "Application");
                    }

                    if (oTable.getBinding("rows").aFilters.length > 0) {
                        this._aColFilters = jQuery.extend(true, [], oTable.getBinding("rows").aFilters);
                        // this._aColFilters = oTable.getBinding("rows").aFilters;
                        oTable.getBinding("rows").aFilters = [];
                    }

                    if (oTable.getBinding("rows").aSorters.length > 0) {
                        this._aColSorters = jQuery.extend(true, [], oTable.getBinding("rows").aSorters);
                    }

                    var oColumns = oTable.getColumns();

                    for (var i = 0, l = oColumns.length; i < l; i++) {
                        var isFiltered = oColumns[i].getFiltered();

                        if (isFiltered) {
                            oColumns[i].filter("");
                        }
                    }

                    this.setRowCreateMode();
                    // sap.ushell.Container.setDirtyFlag(true);
                }
            },
            onCancel: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.cancelData();
            },
            cancelData() {
                if (this._dataMode === "NEW" || this._dataMode === "EDIT") {
                    var bChanged = false;

                    if (this._sActiveTable === "headerTab") bChanged = this._bHdrChanged;
                    else if (this._sActiveTable === "detailTab") bChanged = this._bDtlChanged;

                    if (bChanged) {

                        var oData = {
                            Action: "update-cancel",
                            Text: this.getView().getModel("ddtext").getData()["CONFIRM_DISREGARD_CHANGE"]
                        }

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(oData);

                        if (!this._ConfirmDialog) {
                            this._ConfirmDialog = sap.ui.xmlfragment("zuiprodoutput.view.fragments.dialog.ConfirmDialog", this);

                            this._ConfirmDialog.setModel(oJSONModel);
                            this.getView().addDependent(this._ConfirmDialog);
                        }
                        else this._ConfirmDialog.setModel(oJSONModel);

                        this._ConfirmDialog.open();
                    }
                    else {
                        if (this._sActiveTable === "headerTab") {
                            //this.byId("btnAddHdr").setVisible(true);
                            // this.byId("btnEditHdr").setVisible(true);
                            // this.byId("btnDeleteHdr").setVisible(true);
                            // this.byId("btnRefreshHdr").setVisible(true);
                            // this.byId("btnSaveHdr").setVisible(false);
                            // this.byId("btnCancelHdr").setVisible(false);
                            // this.byId("btnCopyHdr").setVisible(true);
                            // this.byId("btnAddNewHdr").setVisible(false);
                            //this.byId("searchFieldHdr").setVisible(true);

                            this.byId("btnAddDtl").setEnabled(true);
                            this.byId("btnEditDtl").setEnabled(true);
                            this.byId("btnDeleteDtl").setEnabled(true);
                            this.byId("btnRefreshDtl").setEnabled(true);
                            //this.byId("searchFieldDtl").setEnabled(true);
                        }
                        else if (this._sActiveTable === "detailTab") {

                            this.byId("btnAddDtl").setVisible(true);
                            this.byId("btnEditDtl").setVisible(true);
                            this.byId("btnDeleteDtl").setVisible(true);
                            this.byId("btnRefreshDtl").setVisible(true);
                            this.byId("btnSaveDtl").setVisible(false);
                            this.byId("btnCancelDtl").setVisible(false);
                            //this.byId("searchFieldDtl").setVisible(true);
                            this.byId("btnOutputBreakdown").setVisible(true);
                            this.byId("cboxProcess").setEnabled(true);
                            this.byId("btnFullScreenHdr").setEnabled(true);
                            this.byId("btnUploadOutput").setEnabled(true);
                            this.byId("btnRefreshHdr").setEnabled(true);
                            this.byId("smartFilterBar").setVisible(true);

                            this.byId("btnFullScreenDtl").setVisible(true);
                            this.byId("btnTabLayoutDtl").setVisible(true);
                            this.byId("btnDataWrapDtls").setVisible(true);
                            // this.byId("splitterHdr").setProperty("size", "100%");
                            // this.byId("splitterDtl").setProperty("size", "100%");

                            //this.byId("searchFieldHdr").setEnabled(true);
                        }

                        // if (this.byId(this._sActiveTable).getBinding("rows")) {
                        //     me._aColFilters = this.byId(this._sActiveTable).getBinding("rows").aFilters;
                        //     me._aColSorters = this.byId(this._sActiveTable).getBinding("rows").aSorters;
                        // }

                        this.byId(this._sActiveTable).getModel().setProperty("/rows", this._aDataBeforeChange);
                        this.byId(this._sActiveTable).bindRows("/rows");

                        if (this._aColFilters.length > 0) { this.setColumnFilters(this._sActiveTable); }
                        if (this._aColSorters.length > 0) { this.setColumnSorters(this._sActiveTable); }
                        //this.onTableResize('Dtls', 'Min');
                        this.byId("splitterHdr").setProperty("size", "50%");
                        this.byId("splitterDtl").setProperty("size", "50%");

                        this.setRowReadMode();
                        this._dataMode = "READ";



                    }
                }
            },
            cancelSave() {
                this.byId("btnAddDtl").setVisible(true);
                this.byId("btnEditDtl").setVisible(true);
                this.byId("btnDeleteDtl").setVisible(true);
                this.byId("btnRefreshDtl").setVisible(true);
                this.byId("btnSaveDtl").setVisible(false);
                this.byId("btnCancelDtl").setVisible(false);
                this.byId("searchFieldDtl").setVisible(true);
                this.byId("btnOutputBreakdown").setVisible(true);
                this.byId("cboxProcess").setEnabled(true);
                this.byId("btnFullScreenHdr").setEnabled(true);
                this.byId("btnUploadOutput").setEnabled(true);
                this.byId("btnRefreshHdr").setEnabled(true);
                this.byId("searchFieldHdr").setEnabled(true);

                this.byId("btnFullScreenDtl").setVisible(true);
                this.byId("btnTabLayoutDtl").setVisible(true);
                this.byId("btnDataWrapDtls").setVisible(true);
                //this.onTableResize('Dtls', 'Min');
                this.setRowReadMode();
                this._dataMode = "READ";
                var vProcess = this.byId('cboxProcess').getSelectedKey();
                var vIONO = this.getView().getModel("ui").getData().activeIONO;
                Common.openLoadingDialog(this);
                this.getDtls(vIONO, vProcess);
            },
            setRowCreateMode() {
                var oTable = this.byId(this._sActiveTable);
                var aNewRow = [];
                var oNewRow = {};

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";
                    var oValueHelp = false;

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }

                    this._aColumns[this._sActiveTable.replace("Tab", "")].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.Editable || ci.Creatable) {
                                if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];

                                if (oValueHelp) {
                                    var bValueFormatter = false;
                                    var sSuggestItemText = ci.ValueHelp["SuggestionItems"].text;
                                    var sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '';
                                    var sTextFormatMode = "Key";

                                    if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                        sTextFormatMode = ci.TextFormatMode;
                                        bValueFormatter = true;

                                        if (ci.ValueHelp["SuggestionItems"].additionalText && ci.ValueHelp["SuggestionItems"].text !== ci.ValueHelp["SuggestionItems"].additionalText) {
                                            if (sTextFormatMode === "ValueKey" || sTextFormatMode === "Value") {
                                                sSuggestItemText = ci.ValueHelp["SuggestionItems"].additionalText;
                                                sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].text;
                                            }
                                        }
                                    }

                                    var oInput = new sap.m.Input({
                                        type: "Text",
                                        showValueHelp: true,
                                        valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                        suggestionItems: {
                                            path: ci.ValueHelp["SuggestionItems"].path,
                                            length: 10000,
                                            template: new sap.ui.core.ListItem({
                                                key: ci.ValueHelp["SuggestionItems"].text,
                                                text: sSuggestItemText,
                                                additionalText: sSuggestItemAddtlText,
                                            }),
                                            templateShareable: false
                                        },
                                        // suggest: this.handleSuggestion.bind(this),
                                        change: this.handleValueHelpChange.bind(this)
                                    })

                                    if (bValueFormatter) {
                                        oInput.setProperty("textFormatMode", sTextFormatMode);
                                        oInput.bindValue({
                                            parts: [{ path: sColName }, { value: ci.ValueHelp["items"].path }, { value: ci.ValueHelp["items"].value }, { value: ci.ValueHelp["items"].text }, { value: sTextFormatMode }],
                                            formatter: this.formatValueHelp.bind(this)
                                        });
                                    }
                                    else {
                                        oInput.bindValue({
                                            parts: [
                                                { path: sColName }
                                            ]
                                        });
                                    }

                                    col.setTemplate(oInput);
                                }
                                else if (ci.DataType === "DATETIME") {
                                    col.setTemplate(new sap.m.DatePicker({
                                        value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                        displayFormat: "MM/dd/yyyy",
                                        valueFormat: "MM/dd/yyyy",
                                        change: this.onInputLiveChange.bind(this)
                                    }));
                                }
                                else if (ci.DataType === "NUMBER") {
                                    // console.log("a3 NUMBER " + sColName);
                                    if (sColName === "QTY" && this.byId('cboxProcess').getSelectedKey() === 'FN/PK') {
                                        col.setTemplate(new sap.m.Input({
                                            type: sap.m.InputType.Number,
                                            value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                            showValueHelp: true,
                                            valueHelpOnly: true,
                                            valueHelpRequest: this.handleValueHelp.bind(this)
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: sap.m.InputType.Number,
                                            textAlign: sap.ui.core.TextAlign.Right,
                                            value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                            liveChange: this.onNumberLiveChange.bind(this)
                                        }));
                                    }

                                }
                                else if (ci.DataType === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({ selected: "{" + sColName + "}", editable: true }));
                                }
                                else {
                                    if (this._sActiveTable === "ioMatListTab" && sColName === "MATDESC1") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "MATNO",
                                                formatter: function (MATNO) {
                                                    if (MATNO !== "") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (this._sActiveTable === "costHdrTab" && sColName === "VERDESC") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "COSTSTATUS",
                                                formatter: function (COSTSTATUS) {
                                                    if (COSTSTATUS === "REL") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }

                                if (ci.Mandatory) {
                                    col.getLabel().addStyleClass("sapMLabelRequired");
                                }

                                if (ci.DataType === "STRING") oNewRow[sColName] = "";
                                else if (ci.DataType === "NUMBER") oNewRow[sColName] = 0;
                                else if (ci.DataType === "BOOLEAN") oNewRow[sColName] = false;
                                else if (ci.DataType === "DATETIME") oNewRow[sColName] = sapDateFormat.format(new Date());
                            }
                        })
                })

                oNewRow["NEW"] = true;
                aNewRow.push(oNewRow);

                this.byId(this._sActiveTable).getModel().setProperty("/rows", aNewRow);
                this.byId(this._sActiveTable).bindRows("/rows");
                this._dataMode = "NEW";

                oTable.focus();
            },
            setRowReadMode() {
                var oTable = this.byId(this._sActiveTable);
                var sColName = "";
                oTable.getColumns().forEach((col, idx) => {
                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                    }

                    this._aColumns[this._sActiveTable.replace("Tab", "")].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp && ci.ValueHelp["items"].text && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                col.setTemplate(new sap.m.Text({
                                    text: {
                                        parts: [
                                            { path: sColName }
                                        ],
                                        formatter: function (sKey) {
                                            var oValue = me.getView().getModel(ci.ValueHelp["items"].path).getData().filter(v => v[ci.ValueHelp["items"].value] === sKey);

                                            if (oValue && oValue.length > 0) {
                                                if (ci.TextFormatMode === "Value") {
                                                    return oValue[0][ci.ValueHelp["items"].text];
                                                }
                                                else if (ci.TextFormatMode === "ValueKey") {
                                                    return oValue[0][ci.ValueHelp["items"].text] + " (" + sKey + ")";
                                                }
                                                else if (ci.TextFormatMode === "KeyValue") {
                                                    return sKey + " (" + oValue[0][ci.ValueHelp["items"].text] + ")";
                                                }
                                            }
                                            else return sKey;
                                        }
                                    },
                                    wrapping: false
                                    //tooltip: "{" + sColName + "}"
                                }));
                            }
                            else if (ci.DataType === "STRING" || ci.DataType === "DATETIME" || ci.DataType === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + sColName + "}",
                                    wrapping: false
                                    //tooltip: "{" + sColName + "}"
                                }));
                            }
                            else if (ci.DataType === "BOOLEAN") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + sColName + "}",
                                    wrapping: false,
                                    editable: false
                                }));
                            }
                        })

                    col.getLabel().removeStyleClass("sapMLabelRequired");
                })

                this.byId(this._sActiveTable).getModel().getData().rows.forEach(item => item.EDITED = false);
            },
            getColumnProp: async function () {
                var sPath = jQuery.sap.getModulePath("zuiprodoutput", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                this._oModelColumns = oModelColumns.getData();
                // var oColumns = [];

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getDynamicColumns("PRDOUTPUTHDR", "ZERP_IOHDR", "headerTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getDynamicColumns("PRDOUTPUTDTL", "ZERP_IOPROCOUT", "detailTab", oColumns);
                }, 100);
            },
            getDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = "VER";

                if (arg1 === "PRODOB") {
                    var o3DModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                    var oJSONCommonDataModel = new JSONModel();
                    var oJSON3DDataModel = new JSONModel();
                    var oJSONModel = new JSONModel();
                    this._columns;
                    var columns;
                    var ccolumns;
                    var pivotArray;
                    pivotArray = this.OBSizes;
                    console.log("PivotArray", pivotArray);

                    oModel.setHeaders({
                        sbu: vSBU,
                        type: modCode,
                        tabname: tabName
                    });

                    oModel.read("/ColumnsSet", {
                        success: function (oData, oResponse) {
                            if (oData.results.length > 0) {
                                oJSONCommonDataModel.setData(oData);
                                me.getView().setModel(oJSONCommonDataModel, "currIODETModel");
                            }
                        },
                        error: function (err) {
                            //resolve();
                        }
                    });


                    o3DModel.setHeaders({
                        sbu: vSBU,
                        type: modCode,
                        usgcls: ""
                    });

                    o3DModel.read("/DynamicColumnsSet", {
                        success: function (oData, oResponse) {
                            if (oData.results.length > 0) {
                                oJSON3DDataModel.setData(oData);
                                me.getView().setModel(oJSON3DDataModel, "IODETPVTModel");
                            }
                        },
                        error: function (err) {
                            //resolve();
                        }
                    });

                    var pivotRow;
                    columns = me.getView().getModel("IODETPVTModel").getProperty("/results");
                    ccolumns = me.getView().getModel("currIODETModel").getProperty("/results");

                    for (var i = 0; i < columns.length; i++) {
                        if (columns[i].Pivot !== '') {
                            pivotRow = columns[i].Pivot;
                        }
                    }
                    /*console.log("Pivot Row");
                    console.log(pivotRow);

                    console.log("Columns");
                    console.log(columns);*/


                    for (var i = 0; i < columns.length; i++) {
                        if (columns[i].Pivot === pivotRow) {
                            console.log(columns[i].Pivot);
                            console.log("----> " + pivotRow);
                            //pivot the columns
                            for (var j = 0; j < pivotArray.length; j++) {
                                columnData.push({
                                    "ColumnName": pivotArray[j].Custsize + ccolumns[i].ColumnName,
                                    "ColumnLabel": pivotArray[j].Custsize + " " + ccolumns[i].ColumnLabel,
                                    "ColumnWidth": 120,
                                    "ColumnType": pivotRow,
                                    "DataType": ccolumns[i].DataType,
                                    "Editable": ccolumns[i].Editable,
                                    "Mandatory": columns[i].Mandatory,
                                    "Visible": true,
                                    "Creatable": ccolumns[i].Creatable,
                                    "Decimal": ccolumns[i].Decimal,
                                    "DictType": ccolumns[i].DictType,
                                    "Key": ccolumns[i].Key,
                                    "Length": ccolumns[i].Length,
                                    "Order": ccolumns[i].Length,
                                    "SortOrder": ccolumns[i].SortOrder,
                                    "SortSeq": ccolumns[i].SortSeq,
                                    "Sorted": ccolumns[i].Sorted
                                })
                            }
                        }
                    }
                    console.log("column Data");
                    console.log(columnData);

                }
                else {

                    oModel.setHeaders({
                        sbu: vSBU,
                        type: sType,
                        tabname: sTabName
                    });

                    oModel.read("/ColumnsSet", {
                        success: function (oData, oResponse) {
                            if (oData.results.length > 0) {
                                if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                    oData.results.forEach(item => {
                                        oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                            .forEach(col => {
                                                item.ValueHelp = col.ValueHelp;
                                                item.TextFormatMode = col.TextFormatMode;
                                            })
                                    })
                                }

                                me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                                me.setTableColumns(sTabId, oData.results);

                                var oDDTextResult = me.getView().getModel("ddtext").getData();
                                oData.results.forEach(item => {
                                    oDDTextResult[item.ColumnName] = item.ColumnLabel;
                                })

                                me.getView().setModel(new JSONModel(oDDTextResult), "ddtext");
                            }
                        },
                        error: function (err) {
                        }
                    });
                }
            },
            // setTableColumns(arg1, arg2) {
            //     var sTabId = arg1;
            //     var oColumns = arg2;
            //     var oTable = this.getView().byId(sTabId);
            //     // console.log(oTable)
            //     oTable.getModel().setProperty("/columns", oColumns);
            //     //bind the dynamic column to the table
            //     oTable.bindColumns("/columns", function (index, context) {
            //         var sColumnId = context.getObject().ColumnName;
            //         var sColumnLabel = context.getObject().ColumnLabel;
            //         var sColumnWidth = context.getObject().ColumnWidth;
            //         var sColumnVisible = context.getObject().Visible;
            //         var sColumnSorted = context.getObject().Sorted;
            //         var sColumnSortOrder = context.getObject().SortOrder;
            //         var sColumnDataType = context.getObject().DataType;

            //         if (sColumnWidth === 0) sColumnWidth = 100;

            //         var oText = new sap.m.Text({
            //             wrapping: false,
            //             //tooltip: sColumnDataType === "BOOLEAN" ? "" : "{" + sColumnId + "}"
            //         })

            //         var oColProp = me._aColumns[sTabId.replace("Tab", "")].filter(fItem => fItem.ColumnName === sColumnId);

            //         if (oColProp && oColProp.length > 0 && oColProp[0].ValueHelp && oColProp[0].ValueHelp["items"].text && oColProp[0].ValueHelp["items"].value !== oColProp[0].ValueHelp["items"].text &&
            //             oColProp[0].TextFormatMode && oColProp[0].TextFormatMode !== "Key") {
            //             oText.bindText({
            //                 parts: [
            //                     { path: sColumnId }
            //                 ],
            //                 formatter: function (sKey) {
            //                     var oValue = me.getView().getModel(oColProp[0].ValueHelp["items"].path).getData().filter(v => v[oColProp[0].ValueHelp["items"].value] === sKey);

            //                     if (oValue && oValue.length > 0) {
            //                         if (oColProp[0].TextFormatMode === "Value") {
            //                             return oValue[0][oColProp[0].ValueHelp["items"].text];
            //                         }
            //                         else if (oColProp[0].TextFormatMode === "ValueKey") {
            //                             return oValue[0][oColProp[0].ValueHelp["items"].text] + " (" + sKey + ")";
            //                         }
            //                         else if (oColProp[0].TextFormatMode === "KeyValue") {
            //                             return sKey + " (" + oValue[0][oColProp[0].ValueHelp["items"].text] + ")";
            //                         }
            //                     }
            //                     else return sKey;
            //                 }
            //             });
            //         }
            //         else {
            //             oText.bindText({
            //                 parts: [
            //                     { path: sColumnId }
            //                 ]
            //             });
            //         }

            //         // var oMenu = new sap.ui.unified.Menu({
            //         //     items: new sap.ui.unified.MenuItem({
            //         //         text: "My custom menu entry",
            //         //         select: "onQuantityCustomItemSelect"
            //         //     })
            //         // }) 

            //         return new sap.ui.table.Column({
            //             id: sTabId.replace("Tab", "") + "Col" + sColumnId,
            //             label: new sap.m.Text({ text: sColumnLabel }),
            //             template: oText,
            //             width: sColumnWidth + "px",
            //             sortProperty: sColumnId,
            //             // filterProperty: sColumnId,
            //             autoResizable: true,
            //             visible: sColumnVisible,
            //             sorted: sColumnSorted,
            //             hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
            //             sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
            //         });
            //     });

            //     //date/number sorting
            //     oTable.attachSort(function (oEvent) {
            //         var sPath = oEvent.getParameter("column").getSortProperty();
            //         var bDescending = false;

            //         oTable.getColumns().forEach(col => {
            //             if (col.getSorted()) {
            //                 col.setSorted(false);
            //             }
            //         })

            //         oEvent.getParameter("column").setSorted(true); //sort icon initiator

            //         if (oEvent.getParameter("sortOrder") === "Descending") {
            //             bDescending = true;
            //             oEvent.getParameter("column").setSortOrder("Descending") //sort icon Descending
            //         }
            //         else {
            //             oEvent.getParameter("column").setSortOrder("Ascending") //sort icon Ascending
            //         }

            //         var oSorter = new sap.ui.model.Sorter(sPath, bDescending); //sorter(columnData, If Ascending(false) or Descending(True))
            //         var oColumn = oColumns.filter(fItem => fItem.ColumnName === oEvent.getParameter("column").getProperty("sortProperty"));
            //         var columnType = oColumn[0].DataType;

            //         if (columnType === "DATETIME") {
            //             oSorter.fnCompare = function (a, b) {
            //                 // parse to Date object
            //                 var aDate = new Date(a);
            //                 var bDate = new Date(b);

            //                 if (bDate === null) { return -1; }
            //                 if (aDate === null) { return 1; }
            //                 if (aDate < bDate) { return -1; }
            //                 if (aDate > bDate) { return 1; }

            //                 return 0;
            //             };
            //         }
            //         else if (columnType === "NUMBER") {
            //             oSorter.fnCompare = function (a, b) {
            //                 // parse to Date object
            //                 var aNumber = +a;
            //                 var bNumber = +b;

            //                 if (bNumber === null) { return -1; }
            //                 if (aNumber === null) { return 1; }
            //                 if (aNumber < bNumber) { return -1; }
            //                 if (aNumber > bNumber) { return 1; }

            //                 return 0;
            //             };
            //         }

            //         oTable.getBinding('rows').sort(oSorter);
            //         // prevent internal sorting by table
            //         oEvent.preventDefault();
            //     });

            //     TableFilter.updateColumnMenu(sTabId, this);
            // },
            setTableColumns(arg1, arg2) {
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);
                // console.log(oTable)
                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    var oText = new sap.m.Text({
                        wrapping: false,
                        //tooltip: sColumnDataType === "BOOLEAN" ? "" : "{" + sColumnId + "}"
                    })

                    var oColProp = me._aColumns[sTabId.replace("Tab", "")].filter(fItem => fItem.ColumnName === sColumnId);

                    if (oColProp && oColProp.length > 0 && oColProp[0].ValueHelp && oColProp[0].ValueHelp["items"].text && oColProp[0].ValueHelp["items"].value !== oColProp[0].ValueHelp["items"].text &&
                        oColProp[0].TextFormatMode && oColProp[0].TextFormatMode !== "Key") {
                        oText.bindText({
                            parts: [
                                { path: sColumnId }
                            ],
                            formatter: function (sKey) {
                                var oValue = me.getView().getModel(oColProp[0].ValueHelp["items"].path).getData().filter(v => v[oColProp[0].ValueHelp["items"].value] === sKey);

                                if (oValue && oValue.length > 0) {
                                    if (oColProp[0].TextFormatMode === "Value") {
                                        return oValue[0][oColProp[0].ValueHelp["items"].text];
                                    }
                                    else if (oColProp[0].TextFormatMode === "ValueKey") {
                                        return oValue[0][oColProp[0].ValueHelp["items"].text] + " (" + sKey + ")";
                                    }
                                    else if (oColProp[0].TextFormatMode === "KeyValue") {
                                        return sKey + " (" + oValue[0][oColProp[0].ValueHelp["items"].text] + ")";
                                    }
                                }
                                else return sKey;
                            }
                        });
                    }
                    else {
                        oText.bindText({
                            parts: [
                                { path: sColumnId }
                            ]
                        });
                    }

                    // var oMenu = new sap.ui.unified.Menu({
                    //     items: new sap.ui.unified.MenuItem({
                    //         text: "My custom menu entry",
                    //         select: "onQuantityCustomItemSelect"
                    //     })
                    // }) 
                    if (sTabId === 'detailTab') {
                        if (sColumnId === 'DELETED' || sColumnId === 'APPRVD') {
                            sColumnDataType = 'BOOLEAN';
                        }
                    }


                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel }),
                        name: sColumnId,
                        //template: oText,
                        template: sColumnDataType === "BOOLEAN" ? new sap.m.CheckBox({ selected: '{' + sColumnId + '}', editable: false }) : oText,
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        // filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //date/number sorting
                oTable.attachSort(function (oEvent) {
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bDescending = false;

                    oTable.getColumns().forEach(col => {
                        if (col.getSorted()) {
                            col.setSorted(false);
                        }
                    })

                    oEvent.getParameter("column").setSorted(true); //sort icon initiator

                    if (oEvent.getParameter("sortOrder") === "Descending") {
                        bDescending = true;
                        oEvent.getParameter("column").setSortOrder("Descending") //sort icon Descending
                    }
                    else {
                        oEvent.getParameter("column").setSortOrder("Ascending") //sort icon Ascending
                    }

                    var oSorter = new sap.ui.model.Sorter(sPath, bDescending); //sorter(columnData, If Ascending(false) or Descending(True))
                    var oColumn = oColumns.filter(fItem => fItem.ColumnName === oEvent.getParameter("column").getProperty("sortProperty"));
                    var columnType = oColumn[0].DataType;

                    if (columnType === "DATETIME") {
                        oSorter.fnCompare = function (a, b) {
                            // parse to Date object
                            var aDate = new Date(a);
                            var bDate = new Date(b);

                            if (bDate === null) { return -1; }
                            if (aDate === null) { return 1; }
                            if (aDate < bDate) { return -1; }
                            if (aDate > bDate) { return 1; }

                            return 0;
                        };
                    }
                    else if (columnType === "NUMBER") {
                        oSorter.fnCompare = function (a, b) {
                            // parse to Date object
                            var aNumber = +a;
                            var bNumber = +b;

                            if (bNumber === null) { return -1; }
                            if (aNumber === null) { return 1; }
                            if (aNumber < bNumber) { return -1; }
                            if (aNumber > bNumber) { return 1; }

                            return 0;
                        };
                    }

                    oTable.getBinding('rows').sort(oSorter);
                    // prevent internal sorting by table
                    oEvent.preventDefault();
                });

                TableFilter.updateColumnMenu(sTabId, this);
            },
            onAfterTableRendering: function (oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlightByTableId(this._tableRendered);
                    this._tableRendered = "";
                }
            },
            setActiveRowHighlightByTable(arg) {
                var oTable = arg;

                setTimeout(() => {
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 1);
            },

            setActiveRowHighlightByTableId(arg) {
                var oTable = this.byId(arg);

                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 10);
            },

            onInputLiveChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
            },

            onNumberChange: function (oEvent) {
                var decPlaces = oEvent.getSource().getBindingInfo("value").constraints.scale;

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (oEvent.getParameters().value.split(".")[1].length > decPlaces) {
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum of " + decPlaces + " decimal places.");
                        this._validationErrors.push(oEvent.getSource().getId());
                    }
                    else {
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
            },

            onNumberLiveChange: function (oEvent) {
                var oSource = oEvent.getSource();
                if (oSource.getBindingInfo("value") &&
                    oSource.getBindingInfo("value").constraints &&
                    oSource.getBindingInfo("value").constraints.scale !== undefined) {
                    var vColDecPlaces = oSource.getBindingInfo("value").constraints.scale;
                    var vColLength = oSource.getBindingInfo("value").constraints.precision;

                    var dtlsData = me.getView().getModel("DTLS_MODEL").getData();
                    // if (parseInt(oEvent.getParameters().value) >= parseInt(dtlsData[dtlsData.length - 1].QTY)) {
                    //     oEvent.getSource().setValueState("Error");
                    //     oEvent.getSource().setValueStateText("Output qty should be less than previous process total output");
                    //     if (this._validationErrors.filter(fItem => fItem === oEvent.getSource().getId()).length === 0) {
                    //         this._validationErrors.push(oEvent.getSource().getId());
                    //     }
                    // }
                    if (oEvent.getParameters().value.split(".")[0].length > (vColLength - vColDecPlaces)) {
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum whole number length of " + (vColLength - vColDecPlaces));

                        if (this._validationErrors.filter(fItem => fItem === oEvent.getSource().getId()).length === 0) {
                            this._validationErrors.push(oEvent.getSource().getId());
                        }
                    }
                    else if (oEvent.getParameters().value.split(".").length > 1) {
                        if (vColDecPlaces === 0) {
                            oEvent.getSource().setValueState("Error");
                            oEvent.getSource().setValueStateText("Enter a number without decimal place/s");

                            if (this._validationErrors.filter(fItem => fItem === oEvent.getSource().getId()).length === 0) {
                                this._validationErrors.push(oEvent.getSource().getId());
                            }
                        }
                        else {
                            if (oEvent.getParameters().value.split(".")[1].length > vColDecPlaces) {
                                oEvent.getSource().setValueState("Error");
                                oEvent.getSource().setValueStateText("Enter a number with a maximum of " + vColDecPlaces.toString() + " decimal places");

                                if (this._validationErrors.filter(fItem => fItem === oEvent.getSource().getId()).length === 0) {
                                    this._validationErrors.push(oEvent.getSource().getId());
                                }
                            }
                            else {
                                oEvent.getSource().setValueState("None");
                                this._validationErrors.forEach((item, index) => {
                                    if (item === oEvent.getSource().getId()) {
                                        this._validationErrors.splice(index, 1);
                                    }
                                })
                            }
                        }
                    }
                    else {
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1);
                            }
                        })
                    }

                    var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                    this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);

                    if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                    else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
                }
                else {
                    var oSource = oEvent.getSource().oParent.oBindingContexts.DataModel.sPath;
                    sap.ui.getCore().byId("OBTab").getModel("DataModel").setProperty(oSource + oEvent.getSource().getBindingInfo("value").parts[0].path, oEvent.getSource().mProperties.value);
                    sap.ui.getCore().byId("OBTab").getModel("DataModel").setProperty(oSource + "/EDITED", true);
                    // var srcInput = oSource.getBindingInfo("value").parts[0].path;
                    // if(this.editmode === true){
                    //      var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                    //      this.byId("detailTab").getModel().setProperty(sRowPath+'/'+srcInput, oSource.getValue().trim());
                    //      this.byId("detailTab").getModel().setProperty(sRowPath+'/EDITED', true);    
                    // }
                    // else{
                    //     this.byId("detailTab").getModel().setProperty('/results/0/'+srcInput, oSource.getValue().trim());
                    // }
                }
            },
            handleValueHelp: function (oEvent) {
                var aNewRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.NEW === true);
                if (aNewRows[0].POSTDT !== '' && aNewRows[0].FINISHDT !== '' && aNewRows[0].STARTDT !== '' && (aNewRows[0].DLVSEQ !== 0 || aNewRows[0].DLVSEQ !== null)) {
                    Common.openLoadingDialog(this);
                    var oTable = sap.ui.getCore().byId("OBTab");
                    if (oTable) {
                        var oDataModel = oTable.getModel("DataModel");
                        oDataModel.setProperty("/columns", []);
                        oDataModel.setProperty("/results", []);
                    }
                    this.OBSizes = [];

                    // var oTable = sap.ui.getCore().byId("OBTab");
                    // var oDTLSModel = sap.ui.getCore().getView().getModel("DataModel");

                    // if (oDTLSModel && oDTLSModel.getData() && oDTLSModel.getData().length > 0) {
                    // oDTLSModel.setData([]);
                    // oTable.bindRows("/");



                    // //me.getView().setModel(new JSONModel(resultFromGetDtls), "DTLS_MODEL");
                    // oTable.getModel().setProperty("/rows", []);
                    // oTable.bindRows("/rows");
                    // }

                    this.inputId = oEvent.getSource().getId();
                    this.mode = 'edit';
                    var oViewModel;
                    oViewModel = new JSONModel({ onsave: false, createMode: true, saveBtn: false });
                    this.getView().setModel(oViewModel, "mode");
                    // this.getOutputBreakdownSizes(vIONO, "");
                    // if (!this._OutputBreakdownDialog) {
                    //     this._OutputBreakdownDialog = sap.ui.xmlfragment("zuiprodoutput.view.outputBreakdown", this);
                    //     this.getView().addDependent(this._OutputBreakdownDialog);
                    // }
                    // this._OutputBreakdownDialog.open();

                    var loadDataPromise = new Promise((resolve, reject) => {
                        var vIONO = this.getView().getModel("ui").getData().activeIONO;

                        // Assuming getOutputBreakdownSizes returns a Promise or is asynchronous
                        this.getOutputBreakdownSizes(vIONO, "")
                            .then(() => {
                                // Additional data loading logic if needed
                                resolve();
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

                    // When all promises are resolved, open the dialog
                    Promise.all([loadDataPromise])
                        .then(() => {
                            var oViewModel = new JSONModel({ onsave: false, createMode: true, saveBtn: false });
                            this.getView().setModel(oViewModel, "mode");

                            if (!this._OutputBreakdownDialog) {
                                this._OutputBreakdownDialog = sap.ui.xmlfragment("zuiprodoutput.view.outputBreakdown", this);
                                this.getView().addDependent(this._OutputBreakdownDialog);
                            }

                            this._OutputBreakdownDialog.open();
                        })
                        .catch((error) => {
                            console.error("An error occurred:", error);
                            // Handle error, show message, or perform other actions as needed
                        });

                }
                else {
                    MessageBox.information("Please fill in all required fields.");
                    return;
                }
            },
            // getOutputBreakdownSizes(IONO, SEQNO) {
            //     var oModel = this.getOwnerComponent().getModel();
            //     oModel.read('/OutputBreakdownSizesSet', {
            //         urlParameters: {
            //             "$filter": "Iono eq '" + IONO + "'"
            //         },
            //         success: function (data, response) {
            //             data.results.sort((a, b) => parseInt(a.Custcolor) - parseInt(b.Custcolor) && parseInt(a.AttribSeq) - parseInt(b.AttribSeq));
            //             me.OBSizes = data.results;
            //             me.getStyleBOMUV(SEQNO);
            //         },
            //         error: function (err) { }
            //     })
            // },
            getOutputBreakdownSizes(IONO, SEQNO) {
                return new Promise((resolve, reject) => {
                    var oModel = this.getOwnerComponent().getModel();
                    oModel.read('/OutputBreakdownSizesSet', {
                        urlParameters: {
                            "$filter": "Iono eq '" + IONO + "'"
                        },
                        success: (data, response) => {
                            data.results.sort((a, b) => parseInt(a.Custcolor) - parseInt(b.Custcolor) && parseInt(a.AttribSeq) - parseInt(b.AttribSeq));
                            this.OBSizes = data.results;
                            this.getStyleBOMUV(SEQNO);
                            resolve();  // Resolve the Promise once data is loaded and processed
                        },
                        error: (err) => {
                            reject(err);  // Reject the Promise in case of an error
                        }
                    });
                })
                    .finally(() => {
                        Common.closeLoadingDialog(this);
                    });
            },
            getStyleBOMUV: function (SEQNO) {
                console.log("get BOM by UV");
                var me = this;
                var columnData = [];
                var oModelUV = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                //var usageClass = this.getView().byId("UsageClassCB").getSelectedKey();
                // console.log(usageClass)
                oModelUV.setHeaders({
                    sbu: 'VER', //"VER",
                    type: "PRODOB"
                });

                var pivotArray = [];
                pivotArray = this.OBSizes.filter((rowData, index, self) =>
                    index === self.findIndex((t) => (t.Custsize === rowData.Custsize)))
                    .sort((a, b) => a.Custcolor - b.Custcolor);
                // var pivotArray = this.OBSizes
                // .filter((rowData, index, self) => index === self.findIndex((t) => t.Custsize === rowData.Custsize))
                // .sort((a, b) => a.AttribSeq - b.AttribSeq);
                console.log("pivotArray", pivotArray);

                console.log("get dynamic columns of BOM by UV");
                oModelUV.read("/DynamicColumnsSet", {
                    success: function (oData, oResponse) {
                        var columns = oData.results;
                        var pivotRow;
                        //find the column to pivot
                        console.log("Columns", columns);
                        for (var i = 0; i < columns.length; i++) {
                            if (columns[i].Pivot !== '') {
                                pivotRow = columns[i].Pivot;
                            }
                        }
                        //build the table dyanmic columns
                        for (var i = 0; i < columns.length; i++) {
                            if (columns[i].Pivot === pivotRow) {
                                //pivot the columns
                                for (var j = 0; j < pivotArray.length; j++) {
                                    columnData.push({
                                        "ColumnName": pivotArray[j].Custsize,
                                        "ColumnDesc": pivotArray[j].Custsize,
                                        "ColumnWidth": 125,
                                        "ColumnType": pivotRow,
                                        "Editable": true,
                                        "Mandatory": false,
                                        "Visible": true,
                                        "Sorted": false,
                                        "SortOrder": "ASC"
                                    })
                                }
                            } else {
                                if (columns[i].ColumnName !== pivotRow) {
                                    if (columns[i].Visible === true) {
                                        columnData.push({
                                            "ColumnName": columns[i].ColumnName,
                                            "ColumnDesc": columns[i].ColumnName,
                                            "ColumnWidth": columns[i].ColumnWidth,
                                            "ColumnType": columns[i].ColumnType,
                                            "Editable": columns[i].Editable,
                                            "Mandatory": columns[i].Mandatory,
                                            "Sorted": columns[i].Sorted,
                                            "SortOrder": columns[i].SortOrder
                                        })
                                    }
                                }
                            }
                        }
                        console.log("columnData", columnData);
                        console.log("pivotArray", pivotArray);
                        if (me.mode === 'read') {
                            me.getBOMUVTableData(columnData, pivotArray, SEQNO);
                            //Common.closeLoadingDialog(me);
                        }
                        else {
                            me.getBOMUVIOTableData(columnData, pivotArray);
                            ///Common.closeLoadingDialog(me);
                        }

                    },
                    error: function (err) {
                        Common.closeLoadingDialog(me);
                    }
                });

            },
            getBOMUVTableData: function (columnData, pivot, SEQNO) {
                var me = this;
                this._aColumns["OBTab"] = columnData;
                var oTable = sap.ui.getCore().byId("OBTab");
                var oModel = this.getOwnerComponent().getModel();
                var IONO = this.getView().getModel("ui").getData().activeIONO;
                var PROCESSCD = this.byId('cboxProcess').getSelectedKey();
                oModel.read("/OUTPUTBREAKDOWNSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + IONO + "' and PROCESSCD eq '" + PROCESSCD + "' and SEQNO eq '" + SEQNO + "'"
                    },
                    success: function (oData, oResponse) {
                        oData.results.sort((a, b) => parseInt(a.COLORCD) - parseInt(b.COLORCD));
                        var rowData = oData.results;
                        var unique = rowData.filter((rowData, index, self) =>
                            index === self.findIndex((t) => t.COLORCD === rowData.COLORCD)
                        );

                        for (var i = 0; i < unique.length; i++) {
                            for (var j = 0; j < rowData.length; j++) {
                                if (rowData[j].COLORDESC !== "") {
                                    if (
                                        unique[i].COLORCD === rowData[j].COLORCD &&
                                        unique[i].COLORDESC === rowData[j].COLORDESC
                                    ) {
                                        for (var k = 0; k < pivot.length; k++) {
                                            var colname = pivot[k].Custsize;
                                            if (rowData[j].SIZECD === colname) {
                                                unique[i][colname] = rowData[j].QTY;
                                                unique[i]["COLORCD"] = rowData[j].COLORCD;
                                            }
                                        }
                                    }
                                }
                            }
                            for (var k = 0; k < pivot.length; k++) {
                                var colname = pivot[k].Custsize;
                                if (!(colname in unique[i])) {
                                    unique[i][colname] = 0;
                                }
                            }
                        }
                        unique.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                        console.log(unique);
                        var oJSONModel = new JSONModel();
                        oJSONModel.setData({
                            results: unique,
                            columns: columnData
                        });

                        console.log("uniquelast", unique);
                        console.log("ColumnData", columnData);
                        oTable.setModel(oJSONModel, "DataModel");
                        // oTable.setVisibleRowCount(unique.length);
                        oTable.attachPaste();
                        oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                            var column = oContext.getObject();
                            var sColumnWidth = column.ColumnWidth;

                            if (sColumnWidth === 0) sColumnWidth = 100;

                            return new sap.ui.table.Column({
                                id: "styleBOMUVCol" + column.ColumnName,
                                label: new sap.m.Text({ text: me.getStyleColumnDesc("OBTab", column) }),
                                template: me.styleColumnTemplate('', column),
                                sortProperty: column.ColumnName,
                                filterProperty: column.ColumnName,
                                width: sColumnWidth + "px",
                                autoResizable: true,
                                visible: column.Visible,
                                sorted: column.Sorted,
                                sortOrder: ((column.Sorted === true) ? column.SortOrder : "Ascending")
                            });
                        });
                        oTable.bindRows("DataModel>/results");
                        Common.closeLoadingDialog(me);
                    },
                    error: function (err) {
                        // Common.closeLoadingDialog(me);
                    }
                });
            },
            getBOMUVIOTableData: function (columnData, pivot) {
                console.log("Get BOM by UV actual data");
                var me = this;
                this._aColumns["OBTab"] = columnData;
                var oTable = sap.ui.getCore().byId("OBTab");
                var oModel = this.getOwnerComponent().getModel();
                var IONO = this.getView().getModel("ui").getData().activeIONO;
                //var IONO ='8A00286';
                //var usageClass = this.getView().byId("UsageClassCB").getSelectedKey();

                // console.log(this._styleNo, this._styleVer, usageClass);
                oModel.read("/OutputBreakdwonIOSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + IONO + "'"
                    },
                    success: function (oData, oResponse) {
                        var rowData = oData.results;
                        console.log("rowData", rowData);
                        // console.log(rowData)
                        //Get unique items of BOM by UV
                        var unique = rowData.filter((rowData, index, self) =>
                            index === self.findIndex((t) => (t.COLORCD === rowData.COLORCD)));
                        console.log("unique", unique);
                        //For every unique item
                        for (var i = 0; i < unique.length; i++) {
                            //Set the pivot column for each unique item
                            for (var j = 0; j < rowData.length; j++) {
                                if (rowData[j].COLORDESC !== "") {
                                    if (unique[i].COLORCD === rowData[j].COLORCD && unique[i].COLORDESC === rowData[j].COLORDESC) {
                                        for (var k = 0; k < pivot.length; k++) {
                                            var colname = pivot[k].Custsize;
                                            //console.log("Unique",unique[i]);
                                            //console.log("Rowdata",rowData[j]);
                                            //console.log("colname",colname);
                                            if (rowData[j].SIZECD === colname) {
                                                unique[i][colname] = rowData[j].QTY;
                                                unique[i]['COLORCD'] = rowData[j].COLORCD;
                                            }
                                            else {
                                                unique[i][colname] = 0;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        //set the table columns/rows
                        rowData = oData.results;
                        unique.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData({
                            results: unique,
                            columns: columnData
                        });

                        console.log("ColumnData", columnData);
                        oTable.setModel(oJSONModel, "DataModel");
                        // oTable.setVisibleRowCount(unique.length);
                        oTable.attachPaste();
                        oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                            var column = oContext.getObject();
                            var sColumnWidth = column.ColumnWidth;

                            if (sColumnWidth === 0) sColumnWidth = 100;

                            return new sap.ui.table.Column({
                                id: "styleBOMUVCol" + column.ColumnName,
                                label: new sap.m.Text({ text: me.getStyleColumnDesc("OBTab", column) }),
                                template: me.styleColumnTemplate('', column),
                                sortProperty: column.ColumnName,
                                filterProperty: column.ColumnName,
                                width: sColumnWidth + "px",
                                autoResizable: true,
                                visible: column.Visible,
                                sorted: column.Sorted,
                                sortOrder: ((column.Sorted === true) ? column.SortOrder : "Ascending")
                            });
                        });
                        oTable.bindRows("DataModel>/results");
                        console.log("BOM by UV Pivot");
                        console.log(oTable);
                        //Common.closeLoadingDialog(me);

                        //   Common.closeLoadingDialog(me);
                    },
                    error: function (err) {
                        // Common.closeLoadingDialog(me);
                    }
                });
            },
            getStyleColumnDesc: function (arg1, arg2) {
                var desc;
                var sTabId = arg1;
                var oColumn = arg2;
                /*
                if (oColumn.ColumnType === "SIZECD") 
                    desc = oColumn.ColumnDesc;
                else 
                    desc = this.getView().getModel("ddtext").getData()[oColumn.ColumnName];*/

                desc = oColumn.ColumnDesc;

                return desc;
            },
            styleColumnTemplate: function (type, column) {
                //set the column template based on gynamic fields
                var columnName = column.ColumnName;
                var oColumnTemplate;

                if (this.mode === 'read' || (this.mode === 'edit' && (columnName === 'COLORCD' || columnName === 'COLORDESC'))) {
                    oColumnTemplate = new sap.m.Text({ text: "{DataModel>" + columnName + "}", wrapping: false, tooltip: "{DataModel>" + columnName + "}" });
                }
                else {
                    //oColumnTemplate = new sap.m.Input({ text: "{DataModel>" + columnName + "}", wrapping: false, tooltip: "{DataModel>" + columnName + "}", change: this.onNumberChange.bind(this) });
                    oColumnTemplate = new sap.m.Input({
                        type: sap.m.InputType.Number,
                        textAlign: sap.ui.core.TextAlign.Right,
                        value: "{path:'DataModel>" + columnName + "'}",
                        liveChange: this.onNumberLiveChange.bind(this)
                    });
                }

                return oColumnTemplate;
            },
            closeOutputBreakdown() {
                this._OutputBreakdownDialog.close();
            },
            handleValueHelpClose: function (oEvent) {
                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");

                    if (oSelectedItem) {
                        // this._inputSource.setValue(oSelectedItem.getTitle());
                        this._inputSource.setSelectedKey(oSelectedItem.getTitle());

                        // if (this._inputKey !== oSelectedItem.getTitle()) {
                        //     console.log(this._inputSource.getBindingInfo("value"))
                        //     var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;

                        //     this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);

                        //     if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                        //     else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
                        // }
                    }

                    this._inputSource.setValueState("None");
                }
            },

            handleValueHelpChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.oParent.getBindingContext().sPath;
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                oSource.getSuggestionItems().forEach(item => {
                    if (oSource.getSelectedKey() === "" && oSource.getValue() !== "") {
                        if (oSource.getProperty("textFormatMode") === "ValueKey" && ((item.getProperty("text") + " (" + item.getProperty("key") + ")") === oSource.getValue())) {
                            oSource.setSelectedKey(item.getProperty("key"));
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");
                        }
                        else if ((oSource.getProperty("textFormatMode") === "Value" || oSource.getProperty("textFormatMode") === "Key") && (item.getProperty("key") === oSource.getValue())) {
                            oSource.setSelectedKey(item.getProperty("key"));
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");
                        }
                    }
                    else if (item.getProperty("key") === oSource.getSelectedKey()) {
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                })

                if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
                else {
                    this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/' + oSource.getBindingInfo("value").parts[0].path, oSource.getSelectedKey());

                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                this.byId(this._sActiveTable).getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sActiveTable === "headerTab") this._bHdrChanged = true;
                else if (this._sActiveTable === "detailTab") this._bDtlChanged = true;
            },

            onCellClick: function (oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                    //me.byId("btnOutputBreakdown").setEnabled(false);
                    if (oTable.getId().indexOf("headerTab") >= 0) {
                        Common.openLoadingDialog(me);

                        var iRowIndex = parseInt(sRowPath.split("/")[2]);
                        oTable.setSelectedIndex(iRowIndex);
                        var vProdPlant = oTable.getModel().getProperty(sRowPath + "/PRODPLANT");
                        var vUOM = oTable.getModel().getProperty(sRowPath + "/BASEUOM");
                        var vIONO = oTable.getModel().getProperty(sRowPath + "/IONO");
                        var vSALESGRP = oTable.getModel().getProperty(sRowPath + "/SALESGRP");
                        var vSEASONCD = oTable.getModel().getProperty(sRowPath + "/SEASONCD");
                        var vCUSTGRP = oTable.getModel().getProperty(sRowPath + "/CUSTGRP");
                        this.getFgsloc(vProdPlant);
                        this.getView().getModel("ui").setProperty("/activeIONO", vIONO);
                        this.getView().getModel("ui").setProperty("/activeUOM", vUOM);
                        this.getView().getModel("ui").setProperty("/activePRODPLANT", vProdPlant);
                        this.getView().getModel("ui").setProperty("/activeSALESGRP", vSALESGRP);
                        this.getView().getModel("ui").setProperty("/activeSEASONCD", vSEASONCD);
                        this.getView().getModel("ui").setProperty("/activeCUSTGRP", vCUSTGRP);

                        // this.getProcess(vIONO); // Wait for getProcess to complete
                        // var vProcess = this.getView().getModel("ui").getData().process;
                        // me.getDtls(vIONO, vProcess);

                        me.getDatas(vIONO);
                        // me.getProcess(vIONO)
                        // .then(function(vProcess) {
                        //     var vProcess = me.getView().getModel("ui").getData().process;
                        //     return me.getDtls(vIONO, vProcess);
                        // })
                        // .then(function(resultFromGetDtls) {
                        //     me.getView().getModel("counts").setProperty("/detail",0);
                        //     me.getView().setModel(new JSONModel(resultFromGetDtls), "DTLS_MODEL");
                        //     me.byId("detailTab").getModel().setProperty("/rows", resultFromGetDtls);
                        //     me.byId("detailTab").bindRows("/rows");
                        //     me.getView().getModel("counts").setProperty("/detail", resultFromGetDtls.length);

                        //     Common.closeLoadingDialog(me);
                        // })
                        // .catch(function(error) {
                        //     // Handle errors that may occur in either getProcess or getDtls
                        //     console.error("An error occurred:", error);
                        // });

                        var oModel = this.getOwnerComponent().getModel();
                        oModel.read("/IODLVSHSet", {
                            urlParameters: {
                                "$filter": "IONO eq '" + vIONO + "'"
                            },
                            success: function (oData, oResponse) {
                                oData.results.forEach((item, index) => {
                                    if (item.REVDLVDT !== null)
                                        item.REVDLVDT = dateFormat.format(new Date(item.REVDLVDT));

                                });
                                me.getView().setModel(new JSONModel(oData.results), "COMPONENT_MODEL");
                            },
                            error: function (err) { }
                        });


                        //     this.getProcess(vIONO);

                        // setTimeout(function () {
                        //     var vProcess = this.getView().getModel("ui").getData().process;
                        //      me.getDtls(vIONO, vProcess);
                        // }.bind(this), 1000);



                        // var vPrevComp = this.getView().getModel("ui").getData().activeComp;

                        // if (vCurrComp !== vPrevComp) {
                        //     this.getView().getModel("ui").setProperty("/activeComp", vCurrComp);

                        //     if (this._dataMode === "READ") {
                        //         this.getView().getModel("ui").setProperty("/activeIONO", vCurrComp);
                        //         this.getDetailData(false);
                        //     }

                        //     var oTableDetail = this.byId("detailTab");
                        //     var oColumns = oTableDetail.getColumns();

                        //     for (var i = 0, l = oColumns.length; i < l; i++) {
                        //         if (oColumns[i].getSorted()) {
                        //             oColumns[i].setSorted(false);
                        //         }
                        //     }
                        // }

                        if (this._dataMode === "READ") this._sActiveTable = "headerTab";
                    }
                    else {
                        if (this._dataMode === "READ") this._sActiveTable = "detailTab";
                    }

                    oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                    oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow")
                    })
                }
            },
            getDatas(vIONO) {
                me.getProcess(vIONO)
                    .then(function (vProcess) {
                        var vProcess = me.getView().getModel("ui").getData().process;
                        return me.getDtls(vIONO, vProcess);
                    })
                    .then(function (resultFromGetDtls) {
                        me.getView().getModel("counts").setProperty("/detail", 0);
                        me.getView().setModel(new JSONModel(resultFromGetDtls), "DTLS_MODEL");
                        me.byId("detailTab").getModel().setProperty("/rows", resultFromGetDtls);
                        me.byId("detailTab").bindRows("/rows");
                        me.getView().getModel("counts").setProperty("/detail", resultFromGetDtls.length);

                        Common.closeLoadingDialog(me);
                    })
                    .catch(function (error) {
                        // Handle errors that may occur in either getProcess or getDtls
                        console.error("An error occurred:", error);
                    });
            },
            onTableClick(oEvent) {
                var oControl = oEvent.srcControl;
                var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                while (sTabId.substr(sTabId.length - 3) !== "Tab") {
                    oControl = oControl.oParent;
                    sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];
                }

                if (this._dataMode === "READ") this._sActiveTable = sTabId;
                // console.log(this._sActiveTable);
            },

            filterGlobally: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                var sQuery = oEvent.getParameter("query");

                if (sTabId === "headerTab") {
                    this.byId("searchFieldDtl").setProperty("value", "");
                }

                if (this._dataMode === "READ") this._sActiveTable = sTabId;
                this.exeGlobalSearch(sQuery, this._sActiveTable);
            },

            exeGlobalSearch(arg1, arg2) {
                var oFilter = null;
                var aFilter = [];

                if (arg1) {
                    this._aColumns[arg2.replace("Tab", "")].forEach(item => {
                        if (item.DataType === "BOOLEAN") aFilter.push(new Filter(item.ColumnName, FilterOperator.EQ, arg1));
                        else aFilter.push(new Filter(item.ColumnName, FilterOperator.Contains, arg1));
                    })

                    oFilter = new Filter(aFilter, false);
                }

                this.byId(arg2).getBinding("rows").filter(oFilter, "Application");

                if (arg1 && arg2 === "headerTab") {
                    var vComp = this.byId(arg2).getModel().getData().rows.filter((item, index) => index === this.byId(arg2).getBinding("rows").aIndices[0])[0].COSTCOMPCD;
                    this.getView().getModel("ui").setProperty("/activeIONO", vComp);
                    this.getDetailData(true);
                }
            },

            formatValueHelp: function (sValue, sPath, sKey, sText, sFormat) {
                // console.log(sValue, sPath, sKey, sText, sFormat);
                var oValue = this.getView().getModel(sPath).getData().filter(v => v[sKey] === sValue);

                if (oValue && oValue.length > 0) {
                    if (sFormat === "Value") {
                        return oValue[0][sText];
                    }
                    else if (sFormat === "ValueKey") {
                        return oValue[0][sText] + " (" + sValue + ")";
                    }
                    else if (sFormat === "KeyValue") {
                        return sValue + " (" + oValue[0][sText] + ")";
                    }
                }
                else return sValue;
            },

            setColumnFilters(sTable) {
                if (me._aColFilters) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    me._aColFilters.forEach(item => {
                        oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                            .forEach(col => {
                                col.filter(item.oValue1);
                            })
                    })
                }
            },

            setColumnSorters(sTable) {
                if (me._aColSorters) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    me._aColSorters.forEach(item => {
                        oColumns.filter(fItem => fItem.getSortProperty() === item.sPath)
                            .forEach(col => {
                                col.sort(item.bDescending);
                            })
                    })
                }
            },
            setActiveRowHighlight(sTableId) {
                var oTable = this.byId(sTableId !== undefined && sTableId !== "" ? sTableId : this._sActiveTable);

                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 100);
            },
            onKeyUp(oEvent) {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (this.byId(oEvent.srcControl.sId).getBindingContext()) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext().sPath;

                        oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                        oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })

                        Common.openLoadingDialog(me);
                        var vProdPlant = oTable.getModel().getProperty(sRowPath + "/PRODPLANT");
                        var vUOM = oTable.getModel().getProperty(sRowPath + "/BASEUOM");
                        var vIONO = oTable.getModel().getProperty(sRowPath + "/IONO");
                        this.getFgsloc(vProdPlant);
                        this.getView().getModel("ui").setProperty("/activeIONO", vIONO);
                        this.getView().getModel("ui").setProperty("/activeUOM", vUOM);
                        this.getView().getModel("ui").setProperty("/activePRODPLANT", vProdPlant);
                        this.getProcess(vIONO); // Wait for getProcess to complete
                        var vProcess = this.getView().getModel("ui").getData().process;
                        me.getDtls(vIONO, vProcess);

                        var oModel = this.getOwnerComponent().getModel();
                        oModel.read("/IODLVSHSet", {
                            urlParameters: {
                                "$filter": "IONO eq '" + vIONO + "'"
                            },
                            success: function (oData, oResponse) {
                                me.getView().setModel(new JSONModel(oData.results), "COMPONENT_MODEL");
                            },
                            error: function (err) { }
                        });
                    }

                    if (oTable.getId().indexOf("detailTab") >= 0) {
                        var oTableDetail = this.byId("detailTab");
                        var oColumns = oTableDetail.getColumns();

                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }
                    }



                }
                else if (oEvent.key === "Enter" && oEvent.srcControl.sParentAggregationName === "cells") {
                    if (this._dataMode === "NEW") this.onAddNewRow();
                }
            },
            onBatchSave() {
                var bProceed = true;
                //alert("here");
                if (this._validationErrors.length === 0) {
                    //this.getView().getModel("detail").getData().forEach(item => {
                    this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.NEW === true).forEach(item => {
                        const startDt = item && item.STARTDT ? new Date(item.STARTDT) : null;
                        const finishDt = item && item.FINISHDT ? new Date(item.FINISHDT) : null;

                        if (startDt && finishDt && startDt <= finishDt) {
                            if (
                                (item && parseInt(item.DLVSEQ) === 0) ||
                                (item && parseInt(item.QTY) === 0) //||
                                //(item && item.REFDOC === '')
                            ) {
                                bProceed = false;
                                MessageBox.warning(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                                return;
                            }
                        } else {
                            bProceed = false;
                            MessageBox.warning("Actual Start Date must be earlier than Actual Finish Date");
                            return;
                        }

                    })

                    if (!bProceed) {
                        var vProcess = this.getView().getModel("ui").getData().process;
                        Common.openProcessingDialog(me, "Processing...");
                        if (this._dataMode === 'NEW') {
                            var aNewRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.NEW === true);
                            var vIONO = this.getView().getModel("ui").getData().activeIONO;
                            console.log("aNewRows", aNewRows);

                            if (aNewRows.length > 0) {
                                var oParamDtls = {
                                    "POSTDT": sapDateFormat.format(new Date(aNewRows[0].POSTDT)) + "T00:00:00",
                                    "REFDOC": aNewRows[0].REFDOC,
                                    "IONO": vIONO,
                                    "PROCESSCD": vProcess,
                                    "SEQNO": "",
                                    "STARTDT": sapDateFormat.format(new Date(aNewRows[0].STARTDT)) + "T00:00:00",
                                    "FINISHDT": sapDateFormat.format(new Date(aNewRows[0].FINISHDT)) + "T00:00:00",
                                    "QTY": aNewRows[0].QTY,
                                    "MBLNR": "",
                                    "MJAHR": "",
                                    "SOLDTOCUST": "",
                                    "CPONO": "",
                                    "ASNDOCNO": "",
                                    "REMARKS": aNewRows[0].REMARKS,
                                    "CANCELLED": "",
                                    "DLVSEQ": parseInt(aNewRows[0].DLVSEQ, 10)
                                }

                                console.log(oParamDtls);

                                var oModel1 = this.getOwnerComponent().getModel();
                                oModel1.create("/PRDOUTPUTDTLSet", oParamDtls, {
                                    method: "POST",
                                    success: function (oResult, oResponse) {
                                        Common.closeProcessingDialog(me);
                                        me.cancelSave();
                                    }
                                });
                            }
                        }
                        else {
                            var vProcess = this.byId('cboxProcess').getSelectedKey();
                            var aEditedRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.EDITED === true);
                            var vIONO = this.getView().getModel("ui").getData().activeIONO;
                            var ctEditSuccess = 0;
                            aEditedRows.forEach(item => {
                                var oModel = me.getOwnerComponent().getModel();
                                var oEntitySet = "/PRDOUTPUTDTLSet(IONO='" + item["IONO"] + "',PROCESSCD='" + encodeURIComponent(item["PROCESSCD"]) + "',SEQNO='" + item["SEQNO"] + "')";
                                var param = {};
                                param["STARTDT"] = sapDateFormat.format(new Date(item["STARTDT"])) + "T00:00:00";
                                param["FINISHDT"] = sapDateFormat.format(new Date(item["FINISHDT"])) + "T00:00:00";
                                param["POSTDT"] = sapDateFormat.format(new Date(item["POSTDT"])) + "T00:00:00";
                                param["QTY"] = item["QTY"];
                                param["REFDOC"] = item["REFDOC"];
                                param["REMARKS"] = item["REMARKS"];
                                param["CANCELLED"] = "";
                                oModel.update(oEntitySet, param, {
                                    method: "PUT",
                                    success: function (data, oResponse) {
                                        ctEditSuccess++;
                                        if (ctEditSuccess === aEditedRows.length) {
                                            Common.closeProcessingDialog(me);
                                            me.cancelSave();
                                        }
                                    },
                                    error: function (err) {
                                        console.log(err);
                                    }
                                });
                            });
                        }
                        this._bDetailsChanged = false;
                        this.byId("splitterHdr").setProperty("size", "50%");
                        this.byId("splitterDtl").setProperty("size", "50%");
                    }
                    //else {
                    //    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                   // }
                }
                else {
                    var msg = this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"];
                    MessageBox.information(msg);
                }



                // if (this._validationErrors.length === 0) {
                //     var vProcess = this.getView().getModel("ui").getData().process;
                //     Common.openProcessingDialog(me, "Processing...");
                //     if (this._dataMode === 'NEW') {
                //         var aNewRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.NEW === true);
                //         var vIONO = this.getView().getModel("ui").getData().activeIONO;
                //         console.log("aNewRows", aNewRows);

                //         if (aNewRows.length > 0) {
                //             var oParamDtls = {
                //                 "POSTDT": sapDateFormat.format(new Date(aNewRows[0].POSTDT)) + "T00:00:00",
                //                 "REFDOC": aNewRows[0].REFDOC,
                //                 "IONO": vIONO,
                //                 "PROCESSCD": vProcess,
                //                 "SEQNO": "",
                //                 "STARTDT": sapDateFormat.format(new Date(aNewRows[0].STARTDT)) + "T00:00:00",
                //                 "FINISHDT": sapDateFormat.format(new Date(aNewRows[0].FINISHDT)) + "T00:00:00",
                //                 "QTY": aNewRows[0].QTY,
                //                 "MBLNR": "",
                //                 "MJAHR": "",
                //                 "SOLDTOCUST": "",
                //                 "CPONO": "",
                //                 "ASNDOCNO": "",
                //                 "REMARKS": aNewRows[0].REMARKS,
                //                 "CANCELLED": "",
                //                 "DLVSEQ": parseInt(aNewRows[0].DLVSEQ,10)
                //             }

                //             console.log(oParamDtls);

                //             var oModel1 = this.getOwnerComponent().getModel();
                //             oModel1.create("/PRDOUTPUTDTLSet", oParamDtls, {
                //                 method: "POST",
                //                 success: function (oResult, oResponse) {
                //                     Common.closeProcessingDialog(me);
                //                     me.cancelSave();
                //                 }
                //             });
                //         }
                //     }
                //     else{
                //         var vProcess = this.byId('cboxProcess').getSelectedKey();
                //         var aEditedRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.EDITED === true);
                //         var vIONO = this.getView().getModel("ui").getData().activeIONO;
                //         var ctEditSuccess = 0;
                //             aEditedRows.forEach(item => {
                //                 var oModel = me.getOwnerComponent().getModel();
                //                 var oEntitySet = "/PRDOUTPUTDTLSet(IONO='" + item["IONO"] +"',PROCESSCD='"+encodeURIComponent(item["PROCESSCD"])+"',SEQNO='"+ item["SEQNO"] +"')";
                //                 var param={};
                //                 param["STARTDT"] = sapDateFormat.format(new Date(item["STARTDT"])) + "T00:00:00";
                //                 param["FINISHDT"] = sapDateFormat.format(new Date(item["FINISHDT"])) + "T00:00:00";
                //                 param["POSTDT"] = sapDateFormat.format(new Date(item["POSTDT"])) + "T00:00:00";
                //                 param["QTY"] = item["QTY"];
                //                 param["REFDOC"] = item["REFDOC"];
                //                 param["REMARKS"] = item["REMARKS"];
                //                 param["CANCELLED"] = "";
                //                 oModel.update(oEntitySet, param, {
                //                     method: "PUT",
                //                     success: function(data, oResponse) {
                //                         ctEditSuccess++;
                //                         if(ctEditSuccess === aEditedRows.length){
                //                             Common.closeProcessingDialog(me);
                //                             me.cancelSave();
                //                         }
                //                     },
                //                     error: function(err) {
                //                         console.log(err);
                //                     }
                //                 });
                //             });
                //     }
                // }

            },
            onSaveOB: async function () {
                Common.openProcessingDialog(me, "Processing...");
                var _this = this;
                var hasMatchingSize = false;
                var aEditedRows = sap.ui.getCore().byId("OBTab").getModel("DataModel").getData().results.filter(item => item.EDITED === true && item.New !== true);
                var aNewRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.NEW === true);
                console.log("aEditedRows-Breakdown", aEditedRows);
                console.log("aNewRows-Dtls", aNewRows);
                var oParam = {};
                var vProcess = this.getView().getModel("ui").getData().process;
                var vIONO = this.getView().getModel("ui").getData().activeIONO;
                var vUOM = this.getView().getModel("ui").getData().activeUOM;
                var vPRODPLANT = this.getView().getModel("ui").getData().activePRODPLANT;

                var totalQty = 0;
                var aGoodsMvtHdrTab = [];
                var oGoodsMvtHdrTab = {
                    "PstngDate": sapDateFormat.format(new Date(aNewRows[0].POSTDT)) + "T00:00:00",
                    "DocDate": sapDateFormat.format(new Date(aNewRows[0].FINISHDT)) + "T00:00:00",
                    "RefDocNo": aNewRows[0].ASNDOCNO === "" ? aNewRows[0].REFDOC : aNewRows[0].ASNDOCNO,
                    "PrUname": me._userid,
                    "HeaderTxt": aNewRows[0].REFDOC //aNewRows[0].ASNDOCNO === "" ?  aNewRows[0].REFDOC : aNewRows[0].ASNDOCNO,
                }
                aGoodsMvtHdrTab.push(oGoodsMvtHdrTab);
                var paramOB = [];
                var aGoodsMvtItemTab = [];
                var aMatBatch = [];
                var ioDtls = [];
                console.log("aGoodsMvtHdrTab", aGoodsMvtHdrTab);

                // console.log("aEditedRows",aEditedRows);
                if (aNewRows.length > 0) {
                    var matbatchIO = me.byId("headerTab").getModel().getData().rows.filter(item => item.IONO === vIONO)
                    sap.ui.getCore().byId("OBTab").getModel("DataModel").getData().results.forEach(item => {
                        _this._aColumns["OBTab"].forEach(col => {
                            if (col.ColumnName != 'COLORCD' && col.ColumnName != 'COLORDESC') {
                                if (item[col.ColumnName] != 0) {
                                    var param = {};
                                    var oGoodsMvtItemTab = {};
                                    var ioDtlsParam = {};
                                    var matBatch = {};
                                    const filteredSize = this.OBSizes.filter(obj => obj.Custcolor === item["COLORDESC"] && obj.Custsize === col.ColumnName);
                                    const matno = filteredSize.map(obj => obj.Matno)[0];
                                    console.log("filteredSize", filteredSize);

                                    if (matno !== undefined || typeof matno !== 'undefined') {
                                        oGoodsMvtItemTab["Material"] = filteredSize.map(obj => obj.Matno)[0]; //vIONO;
                                        oGoodsMvtItemTab["Plant"] = vPRODPLANT;
                                        oGoodsMvtItemTab["Batch"] = filteredSize.map(obj => obj.BATCH)[0]; //item["COLORCD"] + col.ColumnName;
                                        oGoodsMvtItemTab["MoveType"] = "915";
                                        oGoodsMvtItemTab["EntryQnt"] = item[col.ColumnName];
                                        oGoodsMvtItemTab["EntryUom"] = vUOM;
                                        oGoodsMvtItemTab["MvtInd"] = "";
                                        oGoodsMvtItemTab["Orderid"] = vIONO;
                                        oGoodsMvtItemTab["Costcenter"] = 'VHKLSC004';
                                        oGoodsMvtItemTab["StgeLoc"] = me.getView().getModel("ui").getData().fgsloc;
                                        aGoodsMvtItemTab.push(oGoodsMvtItemTab);

                                        matBatch["MATNO"] = filteredSize.map(obj => obj.Matno)[0];
                                        matBatch["BATCH"] = filteredSize.map(obj => obj.BATCH)[0];
                                        matBatch["IONO"] = vIONO;
                                        matBatch["CUSTGRP"] = matbatchIO[0].CUSTGRP;
                                        matBatch["SEASONCD"] = matbatchIO[0].SEASONCD;
                                        matBatch["SALESGRP"] = matbatchIO[0].SALESGRP;
                                        aMatBatch.push(matBatch);

                                        ioDtlsParam["ACTUALQTY"] = (isNaN(item[col.ColumnName]) ? 0 : item[col.ColumnName]).toString(); //parseInt(isNaN(item[col.ColumnName]) ? 0 : item[col.ColumnName]);
                                        ioDtlsParam["DLVSEQ"] = parseInt(aNewRows[0].DLVSEQ);
                                        ioDtlsParam["MATNO"] = filteredSize.map(obj => obj.Matno)[0];
                                        ioDtlsParam["BATCH"] = filteredSize.map(obj => obj.BATCH)[0];
                                        ioDtls.push(ioDtlsParam);

                                        param["IONO"] = vIONO;
                                        param["PROCESSCD"] = vProcess;
                                        param["SEQNO"] = "";
                                        param["COLORCD"] = item["COLORCD"];
                                        param["SIZECD"] = col.ColumnName;
                                        param["COLORDESC"] = item["COLORDESC"];
                                        param["QTY"] = item[col.ColumnName];
                                        paramOB.push(param);

                                        totalQty = parseInt(totalQty) + parseInt(item[col.ColumnName]);
                                    }
                                }
                            }
                        })
                    });
                    var oParamSeq = {};
                    oParamSeq["N_GOODSMVT_CODE"] = [{ GmCode: "05" }];
                    oParamSeq["N_GOODSMVT_HEADER"] = aGoodsMvtHdrTab;
                    oParamSeq["N_GOODSMVT_HEADRET"] = [];
                    oParamSeq["N_GOODSMVT_ITEM"] = aGoodsMvtItemTab;
                    oParamSeq["N_GOODSMVT_PRINT_CTRL"] = [];
                    oParamSeq["N_GOODSMVT_RETURN"] = [];
                    oParamSeq["materialdocument"] = "";
                    oParamSeq["materialdocumentyear"] = "";

                    // console.log("getHdr",);
                    console.log("oParamSeq", oParamSeq);


                    var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                    oModel.create("/GoodsMvt_CreateSet", oParamSeq, {
                        method: "POST",
                        success: function (oResult, oResponse) {
                            console.log("N_GOODSMVT_RETURN", oResult.N_GOODSMVT_RETURN.results);
                            if (oResult.N_GOODSMVT_RETURN.results[0].Type === 'S') {
                                _this.onSaveIOPOB(paramOB, aNewRows, oResult.N_GOODSMVT_RETURN.results[0].Materialdocument, oResult.N_GOODSMVT_RETURN.results[0].Materialdocumentyear, totalQty, ioDtls)
                                MessageBox.information(oResult.N_GOODSMVT_RETURN.results[0].Message);
                            }
                            else {
                                //_this.closeLoadingDialog();
                                Common.closeProcessingDialog(me);
                                MessageBox.information(oResult.N_GOODSMVT_RETURN.results[0].Message);
                            }

                        },
                        error: function (oData, oResponse) {
                            alert("error");
                        }
                    });
                }
            },
            onSelectionChange: function (oEvent) {
                var oTable = this.byId("headerTab");
                if (oTable.getId().indexOf("headerTab") >= 0) {
                    var iSelectedIndex = oEvent.getSource().getSelectedIndex();
                    var aSelIndices = oTable.getSelectedIndices();
                    var aData = oTable.getModel().getData().rows;

                    oTable.setSelectedIndex(iSelectedIndex);
                    var aSelectedIONO = aSelIndices.map(function (iIndex) {
                        return aData[iIndex].IONO;
                    });

                    var aSelectedBASEUOM = aSelIndices.map(function (iIndex) {
                        return aData[iIndex].BASEUOM;
                    });

                    var aSelectedPRODPLANT = aSelIndices.map(function (iIndex) {
                        return aData[iIndex].PRODPLANT;
                    });


                    var aSelectedSALESGRP = aSelIndices.map(function (iIndex) {
                        return aData[iIndex].PRODPLANT;
                    });

                    var aSelectedSEASONCD = aSelIndices.map(function (iIndex) {
                        return aData[iIndex].SEASONCD;
                    });

                    var aSelectedCUSTGRP = aSelIndices.map(function (iIndex) {
                        return aData[iIndex].CUSTGRP;
                    });


                    Common.openLoadingDialog(me);
                    this.getFgsloc(aSelectedPRODPLANT);
                    this.getView().getModel("ui").setProperty("/activeIONO", aSelectedIONO);
                    this.getView().getModel("ui").setProperty("/activeUOM", aSelectedBASEUOM);
                    this.getView().getModel("ui").setProperty("/activePRODPLANT", aSelectedPRODPLANT);
                    this.getView().getModel("ui").setProperty("/activeSALESGRP", aSelectedSALESGRP);
                    this.getView().getModel("ui").setProperty("/activeSEASONCD", aSelectedSEASONCD);
                    this.getView().getModel("ui").setProperty("/activeCUSTGRP", aSelectedCUSTGRP);

                    this.getProcess(aSelectedIONO); // Wait for getProcess to complete
                    var vProcess = this.getView().getModel("ui").getData().process;
                    me.getDtls(aSelectedIONO, vProcess);

                    var oModel = this.getOwnerComponent().getModel();
                    oModel.read("/IODLVSHSet", {
                        urlParameters: {
                            "$filter": "IONO eq '" + aSelectedIONO + "'"
                        },
                        success: function (oData, oResponse) {
                            oData.results.forEach((item, index) => {
                                if (item.REVDLVDT !== null)
                                    item.REVDLVDT = dateFormat.format(new Date(item.REVDLVDT));

                            });
                            me.getView().setModel(new JSONModel(oData.results), "COMPONENT_MODEL");
                        },
                        error: function (err) { }
                    });
                }

                oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                // oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                // oTable.getRows().forEach(row => {
                //     if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                //         row.addStyleClass("activeRow");
                //     }
                //     else row.removeStyleClass("activeRow")
                // })

            },
            onSaveIOPOB(paramSet, paramHdr, docno, docyr, totalQty, ioDtls) {
                console.log("TOTALQTY: " + totalQty);
                var oModel1 = this.getOwnerComponent().getModel();
                var vProcess = this.getView().getModel("ui").getData().process;
                var vIONO = this.getView().getModel("ui").getData().activeIONO;
                var _this = this;
                var aNewRows = this.byId(this._sActiveTable).getModel().getData().rows.filter(item => item.NEW === true);
                ioDtls.forEach((item, idx) => {
                    oModel1.update("/OUTPUTPOSTIODLVSet(IONO='" + vIONO + "')", ioDtls[idx], {
                        method: "PUT",
                        success: function (data, oResponse) {

                        },
                        error: function (err) {
                            Common.closeProcessingDialog(me);
                        }
                    });
                });

                var paramHdr1 = { ACTUALQTY: totalQty.toString() };
                oModel1.update("/OUTPUTPOSTIOHDRDLVSet(IONO='" + vIONO + "')", paramHdr1, {
                    method: "PUT",
                    success: function (data, oResponse) {

                    },
                    error: function (err) {
                        Common.closeProcessingDialog(me);
                    }
                });

                var oParamDtls = {
                    "POSTDT": sapDateFormat.format(new Date(paramHdr[0].POSTDT)) + "T00:00:00",
                    "REFDOC": paramHdr[0].REFDOC,
                    "IONO": vIONO,
                    "PROCESSCD": vProcess,
                    "SEQNO": "",//paramHdr[0].SEQNO,
                    "STARTDT": sapDateFormat.format(new Date(paramHdr[0].STARTDT)) + "T00:00:00",
                    "FINISHDT": sapDateFormat.format(new Date(paramHdr[0].FINISHDT)) + "T00:00:00",
                    "QTY": totalQty.toString(),
                    "MBLNR": docno,
                    "MJAHR": docyr,
                    "SOLDTOCUST": "",
                    "CPONO": "",
                    "ASNDOCNO": "",
                    "REMARKS": paramHdr[0].REMARKS,
                    "CANCELLED": "",
                    "DLVSEQ": parseInt(aNewRows[0].DLVSEQ)
                }

                console.log("oParamDtls", oParamDtls);

                oModel1.create("/PRDOUTPUTDTLSet", oParamDtls, {
                    method: "POST",
                    success: function (oResult, oResponse) {
                        /*var oModel = _this.getOwnerComponent().getModel();
                        oModel.setUseBatch(true);
                        oModel.setDeferredGroups(["insert"]);
                        var mParameters = {
                            "groupId": "insert"
                        };*/
                        var oModel = _this.getOwnerComponent().getModel();
                        paramSet.forEach(item => {
                            var param = {};
                            param["IONO"] = item["IONO"];
                            param["PROCESSCD"] = item["PROCESSCD"];
                            param["SEQNO"] = JSON.parse(oResponse.headers["sap-message"]).message.toString().trim();
                            param["COLORCD"] = item["COLORCD"];
                            param["SIZECD"] = item["SIZECD"];
                            param["COLORDESC"] = item["COLORDESC"];
                            param["QTY"] = item["QTY"];

                            console.log("param", param);
                            oModel.create("/OUTPUTBREAKDOWNSet", param, {
                                method: "POST",
                                success: function (oResult, oResponse) {

                                    me.byId(me._sActiveTable).getModel().setProperty('/results/0/QTY', totalQty);
                                    var input = sap.ui.getCore().byId(me.inputId);
                                    input.setValue(totalQty);
                                    Common.closeProcessingDialog(me);
                                    me.closeOutputBreakdown();
                                    me.cancelSave();

                                    //_this.onCancel();
                                    //_this.onRefreshDtls();
                                },
                                error: function (err) {
                                    Common.closeProcessingDialog(me);
                                    console.log(err);
                                }
                            });
                            /*console.log("outputbreakdownset",param);
                            
                            oModel.create("/OUTPUTBREAKDOWNSet", param, mParameters);*/

                        });

                        /*oModel.submitChanges({
                            mParameters,
                            // groupId: "insert",
                            success: function (oData, oResponse) {
                                //Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                            },
                            error: function (oData, oResponse) {
                            }
                        });*/


                    }
                });
            },

            getFgsloc(plantcd) {
                var vSBU = 'VER';
                var oJSONCommonDataModel = new JSONModel();
                var oModel = this.getOwnerComponent().getModel();
                oModel.read("/FGSLOCSet", {
                    urlParameters: {
                        "$filter": "SBU eq '" + vSBU + "' and PLANTCD eq '" + plantcd + "'"
                    },
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            me.getView().getModel("ui").setProperty("/fgsloc", oData.results[0].Fgsloc);
                        }
                    },
                    error: function (err) { }
                });
            },
            onCloseConfirmDialog: function (oEvent) {
                if (this._ConfirmDialog.getModel().getData().Action === "update-cancel") {
                    if (this._sActiveTable === "headerTab") {
                        // this.byId("btnAddHdr").setVisible(true);
                        // this.byId("btnEditHdr").setVisible(true);
                        // this.byId("btnDeleteHdr").setVisible(true);
                        // this.byId("btnRefreshHdr").setVisible(true);
                        // this.byId("btnSaveHdr").setVisible(false);
                        // this.byId("btnCancelHdr").setVisible(false);
                        // this.byId("btnCopyHdr").setVisible(true);
                        //this.byId("btnAddNewDtl").setVisible(false);
                        this.byId("searchFieldHdr").setVisible(true);

                        this.byId("btnAddDtl").setEnabled(true);
                        this.byId("btnEditDtl").setEnabled(true);
                        this.byId("btnDeleteDtl").setEnabled(true);
                        this.byId("btnRefreshDtl").setEnabled(true);
                        this.byId("searchFieldDtl").setEnabled(true);
                    }
                    else if (this._sActiveTable === "detailTab") {
                        this.byId("btnAddDtl").setVisible(true);
                        this.byId("btnEditDtl").setVisible(true);
                        this.byId("btnDeleteDtl").setVisible(true);
                        this.byId("btnRefreshDtl").setVisible(true);
                        this.byId("btnSaveDtl").setVisible(false);
                        this.byId("btnCancelDtl").setVisible(false);
                        this.byId("btnOutputBreakdown").setVisible(true);
                        // this.byId("btnCopyDtl").setVisible(false);
                        //this.byId("btnAddNewDtl").setVisible(false);
                        //this.byId("searchFieldDtl").setVisible(true);

                        //this.byId("btnAddHdr").setEnabled(true);
                        // this.byId("btnEditHdr").setEnabled(true);
                        // this.byId("btnDeleteHdr").setEnabled(true);
                        this.byId("btnRefreshHdr").setEnabled(true);
                        //this.byId("btnCopyHdr").setEnabled(true);
                        this.byId("searchFieldDtl").setEnabled(true);
                        this.byId("cboxProcess").setEnabled(true);
                        this.byId("searchFieldHdr").setEnabled(true);
                        this.byId("smartFilterBar").setVisible(true);

                        this.byId("btnFullScreenDtl").setVisible(true);
                        this.byId("btnTabLayoutDtl").setVisible(true);
                        this.byId("btnDataWrapDtls").setVisible(true);

                        this.byId("splitterHdr").setProperty("size", "50%");
                        this.byId("splitterDtl").setProperty("size", "50%");
                    }

                    this.byId(this._sActiveTable).getModel().setProperty("/rows", this._aDataBeforeChange);
                    this.byId(this._sActiveTable).bindRows("/rows");

                    if (this._aColFilters.length > 0) { this.setColumnFilters(this._sActiveTable); }
                    if (this._aColSorters.length > 0) { this.setColumnSorters(this._sActiveTable); }
                    //this.onTableResize('Dtls', 'Min');
                    this.setRowReadMode();
                    this._dataMode = "READ";
                    this.setActiveRowHighlightByTableId(this._sActiveTable);
                }

                this._ConfirmDialog.close();
            },

            onCancelConfirmDialog: function (oEvent) {
                this._ConfirmDialog.close();
                this.byId("btnAddDtl").setVisible(true);
                this.byId("btnEditDtl").setVisible(true);
                this.byId("btnDeleteDtl").setVisible(true);
                this.byId("btnRefreshDtl").setVisible(true);
                this.byId("btnSaveDtl").setVisible(false);
                this.byId("btnCancelDtl").setVisible(false);
                //this.byId("searchFieldDtl").setVisible(true);
                this.byId("btnOutputBreakdown").setVisible(true);
                this.byId("cboxProcess").setEnabled(true);
                this.byId("btnFullScreenHdr").setEnabled(true);
                this.byId("btnUploadOutput").setEnabled(true);
                this.byId("btnRefreshHdr").setEnabled(true);
                this.byId("smartFilterBar").setVisible(true);

                this.byId("btnFullScreenDtl").setVisible(true);
                this.byId("btnTabLayoutDtl").setVisible(true);
                this.byId("btnDataWrapDtls").setVisible(true);

                this.byId("splitterHdr").setProperty("size", "50%");
                this.byId("splitterDtl").setProperty("size", "50%");

                this.byId(this._sActiveTable).getModel().setProperty("/rows", this._aDataBeforeChange);
                this.byId(this._sActiveTable).bindRows("/rows");

                if (this._aColFilters.length > 0) { this.setColumnFilters(this._sActiveTable); }
                if (this._aColSorters.length > 0) { this.setColumnSorters(this._sActiveTable); }
                //this.onTableResize('Dtls', 'Min');
                this.setRowReadMode();
                this._dataMode = "READ";
                //this.byId("searchFieldHdr").setEnabled(true);
            },
            //******************************************* */
            // Column Filtering
            //******************************************* */

            onColFilterClear: function (oEvent) {
                TableFilter.onColFilterClear(oEvent, this);
            },

            onColFilterCancel: function (oEvent) {
                TableFilter.onColFilterCancel(oEvent, this);
            },

            onColFilterConfirm: function (oEvent) {
                TableFilter.onColFilterConfirm(oEvent, this);
            },

            onFilterItemPress: function (oEvent) {
                TableFilter.onFilterItemPress(oEvent, this);
            },

            onFilterValuesSelectionChange: function (oEvent) {
                TableFilter.onFilterValuesSelectionChange(oEvent, this);
            },

            onSearchFilterValue: function (oEvent) {
                TableFilter.onSearchFilterValue(oEvent, this);
            },

            onCustomColFilterChange: function (oEvent) {
                TableFilter.onCustomColFilterChange(oEvent, this);
            },

            onSetUseColFilter: function (oEvent) {
                TableFilter.onSetUseColFilter(oEvent, this);
            },

            onRemoveColFilter: function (oEvent) {
                TableFilter.onRemoveColFilter(oEvent, this);
            },
            onRefresh: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.refreshData();
            },
            // refreshData() {
            //     if (this._dataMode === "READ") {
            //         this._aColFilters = this.byId(this._sActiveTable).getBinding("rows").aFilters;
            //         this._aColSorters = this.byId(this._sActiveTable).getBinding("rows").aSorters;

            //         if (this._sActiveTable === "headerTab") {
            //             //this.getHeaderData();
            //         }
            //         else if (this._sActiveTable === "detailTab") {
            //             var vProcess = this.byId('cboxProcess').getSelectedKey();
            //             var vIONO = this.getView().getModel("ui").getData().activeIONO;
            //             Common.openLoadingDialog(this);
            //             this.getDtls(vIONO,vProcess);
            //         }
            //     }
            // },
            onDelete: function (oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTabId = oTable.sId.split("--")[oTable.sId.split("--").length - 1];
                this._sActiveTable = sTabId;
                this.deleteData();
            },
            deleteData() {
                if (this._dataMode === "READ") {
                    var oTable = this.byId(this._sActiveTable);
                    var aSelIndices = oTable.getSelectedIndices();
                    var oTmpSelectedIndices = [];
                    var aData = oTable.getModel().getData().rows;
                    var vIONO = this.getView().getModel("ui").getData().activeIONO;
                    var vProcess = this.getView().getModel("ui").getData().process;
                    //var vEntitySet = "/";

                    // if (this._sActiveTable === "headerTab") vEntitySet += "HeaderSet(";
                    // else vEntitySet += "DetailSet(";

                    // this._oModel.setUseBatch(true);
                    // this._oModel.setDeferredGroups(["update"]);

                    // var mParameters = {
                    //     "groupId":"update"
                    // }

                    if (aSelIndices.length > 0) {
                        aSelIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })

                        aSelIndices = oTmpSelectedIndices;

                        MessageBox.confirm("Proceed to delete " + aSelIndices.length + " record(s)?", {
                            actions: ["Yes", "No"],
                            onClose: function (sAction) {
                                if (sAction === "Yes") {
                                    Common.openProcessingDialog(me, "Processing...");

                                    if (me.byId(me._sActiveTable).getBinding("rows").aFilters.length > 0) {
                                        me._aColFilters = me.byId(me._sActiveTable).getBinding("rows").aFilters;
                                    }

                                    if (me.byId(me._sActiveTable).getBinding("rows").aSorters.length > 0) {
                                        me._aColSorters = me.byId(me._sActiveTable).getBinding("rows").aSorters;
                                    }

                                    aSelIndices.forEach(item => {
                                        var oParamSeq = {};
                                        oParamSeq["N_ET_DATA"] = [{ PostingDate: sapDateFormat.format(new Date(aData.at(item)['POSTDT'])) + "T00:00:00", MatDoc: aData.at(item)['MBLNR'], MatDocYear: aData.at(item)['MJAHR'], RevMatDoc: "", RevMatDocYear: "", Message: "" }];
                                        oParamSeq["N_IT_DATA"] = [{ PostingDate: sapDateFormat.format(new Date(aData.at(item)['POSTDT'])) + "T00:00:00", MatDoc: aData.at(item)['MBLNR'], MatDocYear: aData.at(item)['MJAHR'], RevMatDoc: "", RevMatDocYear: "", Message: "" }];
                                        var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                                        oModel.create("/GoodsMvt_CancelSet", oParamSeq, {
                                            method: "POST",
                                            success: function (oResult, oResponse) {
                                                if (oResult.SUBRC === 0) {
                                                    var oModel = me.getOwnerComponent().getModel();
                                                    var oEntitySet = "/PRDOUTPUTDTLSet(IONO='" + vIONO + "',PROCESSCD='" + encodeURIComponent(vProcess) + "',SEQNO='" + aData.at(item)['SEQNO'] + "')";
                                                    var oParam = {
                                                        "STARTDT": sapDateFormat.format(new Date(aData.at(item)['STARTDT'])) + "T00:00:00",
                                                        "FINISHDT": sapDateFormat.format(new Date(aData.at(item)['FINISHDT'])) + "T00:00:00",
                                                        "POSTDT": sapDateFormat.format(new Date(aData.at(item)['POSTDT'])) + "T00:00:00",
                                                        "QTY": aData.at(item)['QTY'],
                                                        "REFDOC": aData.at(item)['REFDOC'],
                                                        "REMARKS": aData.at(item)['REMARKS'],
                                                        "CANCELLED": "X"
                                                    };
                                                    oModel.update(oEntitySet, oParam, {
                                                        method: "PUT",
                                                        success: function (data, oResponse) {
                                                            if (vProcess === 'FN/PK') {
                                                                var paramHdr = { ACTUALQTY: aData.at(item)['QTY'].toString() };
                                                                console.log("paramHdr", paramHdr);
                                                                oModel.update("/OPDELETEIOHDR(IONO='" + vIONO + "')", paramHdr, {
                                                                    method: "PUT",
                                                                    success: function (data, oResponse) {
                                                                        console.log("Success Delete Hdr");
                                                                    },
                                                                    error: function (err) {
                                                                        Common.closeProcessingDialog(me);
                                                                    }
                                                                });
                                                            }
                                                            Common.closeProcessingDialog(me);
                                                            me.getDtls(vIONO, vProcess);
                                                            sap.m.MessageBox.warning("Document No: " + aData.at(item)['MBLNR'] + " Successfully Deleted!");
                                                        },
                                                        error: function (err) {
                                                            console.log(err);
                                                        }
                                                    });



                                                }
                                            }
                                        });

                                        // var entitySet = vEntitySet;
                                        // var iKeyCount = me._aColumns[me._sActiveTable.replace("Tab","")].filter(col => col.Key === "X").length;
                                        // var itemValue;

                                        // me._aColumns[me._sActiveTable.replace("Tab","")].forEach(col => {
                                        //     if (col.DataType === "DATETIME") {
                                        //         if (col.ColumnName === "EFFECTDT")
                                        //             itemValue = sapDateFormat2.format(new Date(aData.at(item)[col.ColumnName]));
                                        //         else 
                                        //             itemValue = sapDateFormat.format(new Date(aData.at(item)[col.ColumnName])) + "T00:00:00";
                                        //     } 
                                        //     else if (col.DataType === "BOOLEAN") {
                                        //         param[col.ColumnName] = aData.at(item)[col.ColumnName] === true ? "X" : "";
                                        //     }
                                        //     else {
                                        //         itemValue = aData.at(item)[col.ColumnName];
                                        //     }

                                        //     if (iKeyCount === 1) {
                                        //         if (col.Key === "X")
                                        //             entitySet += "'" + itemValue + "'"
                                        //     }
                                        //     else if (iKeyCount > 1) {
                                        //         if (col.Key === "X") {
                                        //             entitySet += col.ColumnName + "='" + itemValue + "',"
                                        //         }
                                        //     }
                                        // })

                                        // if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                                        // entitySet += ")";

                                        // console.log(entitySet);
                                        // // console.log(param);
                                        // me._oModel.remove(entitySet, mParameters);
                                    })

                                    

                                    // me.getDtls(vIONO, vProcess).then(function (resultFromGetDtls) {
                                    //     me.getView().getModel("counts").setProperty("/detail", 0);
                                    //     me.getView().setModel(new JSONModel(resultFromGetDtls), "DTLS_MODEL");
                                    //     me.byId("detailTab").getModel().setProperty("/rows", resultFromGetDtls);
                                    //     me.byId("detailTab").bindRows("/rows");
                                    //     me.getView().getModel("counts").setProperty("/detail", resultFromGetDtls.length);

                                    // })
                                    //     .catch(function (error) {
                                    //         Common.closeLoadingDialog(me);
                                    //         console.error("An error occurred:", error);
                                    //     });

                                    // me._oModel.submitChanges({
                                    //     groupId: "update",
                                    //     success: function (oData, oResponse) {
                                    //         Common.closeProcessingDialog(me);
                                    //         // me.refreshData();
                                    //         aSelIndices.sort((a, b) => -1);
                                    //         // console.log(aSelIndices)

                                    //         aSelIndices.forEach(item => {
                                    //             aData.splice(item, 1);
                                    //         })

                                    //         // console.log(aData);

                                    //         me.byId(me._sActiveTable).getModel().setProperty("/rows", aData);
                                    //         me.byId(me._sActiveTable).bindRows("/rows");

                                    //         if (me._aColFilters.length > 0) { me.setColumnFilters(me._sActiveTable); }
                                    //         if (me._aColSorters.length > 0) { me.setColumnSorters(me._sActiveTable); }

                                    //         me.getView().getModel("counts").setProperty("/header", aData.length);

                                    //         MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_DELETED"]);
                                    //     },
                                    //     error: function () {
                                    //         Common.closeProcessingDialog(me);
                                    //     }
                                    // }) 
                                }
                            }
                        })
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                    }
                }
            },
            outputBreakdown() {
                var oTable = this.byId("detailTab");
                var aSelRows = oTable.getSelectedIndices();
                if (aSelRows.length === 0) {
                    MessageBox.information("No record(s) have been selected.");
                }
                else {
                    if (aSelRows.length > 1) {
                        MessageBox.information("Please select one record only.");
                    }
                    else {
                        Common.openLoadingDialog(this);
                        var OBTable = sap.ui.getCore().byId("OBTab");
                        if (OBTable) {
                            var oDataModel = OBTable.getModel("DataModel");
                            oDataModel.setProperty("/columns", []);
                            oDataModel.setProperty("/results", []);
                        }
                        this.OBSizes = [];
                        aSelRows.forEach(rec => {
                            var vIONO = this.getView().getModel("ui").getData().activeIONO;
                            var oContext = oTable.getContextByIndex(rec);
                            this.mode = 'read';

                            var oViewModel;
                            oViewModel = new JSONModel({ displayMode: true, createMode: false, saveBtn: false });
                            this.getView().setModel(oViewModel, "mode");

                            var loadDataPromise = new Promise((resolve, reject) => {
                                var vIONO = this.getView().getModel("ui").getData().activeIONO;

                                // Assuming getOutputBreakdownSizes returns a Promise or is asynchronous
                                this.getOutputBreakdownSizes(vIONO, oContext.getObject().SEQNO)
                                    .then(() => {
                                        // Additional data loading logic if needed
                                        resolve();
                                    })
                                    .catch((error) => {
                                        reject(error);
                                    });
                            });

                            // When all promises are resolved, open the dialog
                            Promise.all([loadDataPromise])
                                .then(() => {
                                    var oViewModel = new JSONModel({ onsave: false, createMode: true, saveBtn: false });
                                    this.getView().setModel(oViewModel, "mode");

                                    if (!this._OutputBreakdownDialog) {
                                        this._OutputBreakdownDialog = sap.ui.xmlfragment("zuiprodoutput.view.outputBreakdown", this);
                                        this.getView().addDependent(this._OutputBreakdownDialog);
                                    }

                                    this._OutputBreakdownDialog.open();
                                })
                                .catch((error) => {
                                    console.error("An error occurred:", error);
                                    // Handle error, show message, or perform other actions as needed
                                });


                            // this.getOutputBreakdownSizes(vIONO, oContext.getObject().SEQNO);
                            // if (!this._OutputBreakdownDialog) {
                            //     this._OutputBreakdownDialog = sap.ui.xmlfragment("zuiprodoutput.view.outputBreakdown", this);
                            //     this.getView().addDependent(this._OutputBreakdownDialog);
                            // }
                            // this._OutputBreakdownDialog.open();
                        });
                    }
                }

            },
        });
    });
