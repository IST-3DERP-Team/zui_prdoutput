sap.ui.define([ 
    "sap/ui/model/json/JSONModel" ,
    "sap/base/util/uid",
    "../libs/xlsx",
    "../libs/jszip",
    "sap/m/MessageBox",
], function (JSONModel, uid, xlsx, jszip, MessageBox) {
	"use strict";

    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyMMddHHmm" });
    var me;

	return {

        async onUpload(oThis, sSBU, sModule, sSection, sDestTable) {
            me = oThis;

            me.getView().setModel(new JSONModel({
                sbu: sSBU,
                module: sModule,
                section: sSection,
                table: sDestTable,
                lblrow: 1
            }), "excelupload");

            await this.getMapping();

            var sDialogFragmentName = "zuiprodoutput.view.fragments.dialog.ExcelUploadDialog";

            if (!me._ExcelUploadDialog) {
                me._ExcelUploadDialog = sap.ui.xmlfragment(sDialogFragmentName, me);
                me.getView().addDependent(me._ExcelUploadDialog);
            }

            me._ExcelUploadDialog.setContentHeight("200px");
            me._ExcelUploadDialog.open();
            sap.ui.getCore().byId("xuWithHdrInd").setSelected(true);
            sap.ui.getCore().byId("excelMapTab").setVisible(false);
            sap.ui.getCore().byId("btnXUValidate").setVisible(false);
            sap.ui.getCore().byId("btnXUPreview").setVisible(false);
            sap.ui.getCore().byId("cboxExcelMapId").setSelectedKey(undefined);

            var oDefaultMapping = me.getView().getModel("excelmapping").getData().filter(fItem => fItem.DFLT === "X")[0];

            if (oDefaultMapping !== undefined) {
                sap.ui.getCore().byId("cboxExcelMapId").setSelectedKey(oDefaultMapping.MAPID); 
             
                if (oDefaultMapping.DFLT === "X") {
                    sap.ui.getCore().byId("xuDefaultInd").setSelected(true);
                }

                if (oDefaultMapping.COLLBL === "X") {
                    sap.ui.getCore().byId("xuWithHdrInd").setSelected(true);
                }
            }
        },

        onUploadExcel(oEvent) {
            me._selectedMappingId = "";
            me._newMapDesc = "";
            me._excelData = [];
            me._uploadedDataToSave = [];

            me.getView().getModel("excelupload").setProperty("/lblrow", sap.ui.getCore().byId("xuWithHdrInd").getSelected() ? 1 : 0);

            //start of upload            
            this.processUpload(oEvent.getParameter("files") && oEvent.getParameter("files")[0]);
            me._fileName = oEvent.getParameter('files')[0].name;
        },

        processUpload(oFile) {
            //get the file from the file reader
            if (oFile && window.FileReader) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });

                    //get the first sheet
                    var sheetName = workbook.SheetNames[0];
                    
                    //get excel data in json format
                    var excelJson = excelJson = XLSX.utils.make_json(workbook.Sheets[sheetName], { header: 1 });

                    if (!sap.ui.getCore().byId("xuWithHdrInd").getSelected()) {
                        var aLblRow = [];
                        var vCounter = 0;

                        for (let a = 0; a < excelJson[excelJson.length - 1].length; a++) {
                            vCounter++;                                
                            aLblRow.push("FIELD" + vCounter);
                        }

                        excelJson.unshift(aLblRow);
                    }

                    console.log(excelJson);
                    me._excelData = excelJson;

                    var vNoData = true;

                    if (excelJson.length === 1) {
                        MessageBox.information("No data uploaded.");
                        return;
                    }
                    else {
                        excelJson.forEach((item, index) => {
                            if (index !== 0) {
                                if (item.length > 0) { vNoData = false }
                            }
                        })
                    }

                    if (vNoData) {
                        MessageBox.information("No data uploaded.");
                        return;
                    }

                    sap.ui.getCore().byId("excelMapTab").setVisible(true);
                    sap.ui.getCore().byId("btnXUValidate").setVisible(true);
                    sap.ui.getCore().byId("btnXUPreview").setVisible(true);
                    me._ExcelUploadDialog.setContentHeight("600px");        

                    var oMapping = me.getView().getModel("excelmapping").getData();
                    var vSelMapId = sap.ui.getCore().byId("cboxExcelMapId").getSelectedKey();
                    var mapFields = [];
                    var oSelMapping;

                    if (vSelMapId !== "") {
                        me._selectedMappingId = vSelMapId;
                        oSelMapping = oMapping.filter(fItem => fItem.MAPID === vSelMapId)[0];
                        
                        excelJson[0].forEach(item => {
                            var sMatchTableFieldName = "", sMatchTableFieldDesc = "";

                            oSelMapping.MapFields.forEach(f => {
                                if (f.SCRCOLNAME.toLowerCase() === item.toLowerCase()) {
                                    f.MATCHED = true; 
                                    sMatchTableFieldName = f.FLDNAME;
                                    sMatchTableFieldDesc = f.FLDDESC;
                                }
                            })

                            mapFields.push({
                                XLSFIELD: item, 
                                TBLFIELD: sMatchTableFieldName === "" ? "" : sMatchTableFieldName,
                                TBLFIELDDESC: sMatchTableFieldName === "" ? "" : sMatchTableFieldDesc
                            });
                        })
                    }
                    else {
                        //check if matched with existing mapping
                        var isAllMatched = true;

                        excelJson[0].forEach(item => {
                            oMapping.forEach(m => {
                                m.MapFields.forEach(f => {
                                    if (f.SCRCOLNAME.toLowerCase() === item.toLowerCase()) {
                                        f.MATCHED = true; 
                                    }
                                    else {
                                        isAllMatched = false;
                                    }
                                })
                            })
                        })
                        console.log(isAllMatched)
                        var matchedMapId = "";

                        if (isAllMatched) {
                            oMapping.forEach(m => {
                                if (m.MapFields.filter(fItem => !fItem.MATCHED).length === 0) {
                                    matchedMapId = m.MAPID;
                                    m.MATCHED = true;
                                }
                                else { m.MATCHED = false; }
                            })
                        }

                        if (matchedMapId !== "") {
                            oSelMapping = oMapping.filter(fItem => fItem.MAPID === matchedMapId)[0];
                            sap.ui.getCore().byId("cboxExcelMapId").setSelectedKey(matchedMapId);
                        }

                        excelJson[0].forEach(item => {
                            var sMatchTableFieldName = "", sMatchTableFieldDesc = "";

                            if (matchedMapId === "") {
                                me.getView().getModel("tablefield").getData().forEach(f => {
                                    if (f.FIELDDESC.toLowerCase() === item.toLowerCase()) {
                                        sMatchTableFieldName = f.FIELDNAME;
                                        sMatchTableFieldDesc = f.FIELDDESC;
                                    }
                                })
                            }
                            else {
                                oSelMapping.MapFields.forEach(f => {
                                    if (f.SCRCOLNAME.toLowerCase() === item.toLowerCase()) {
                                        sMatchTableFieldName = f.FLDNAME;
                                        sMatchTableFieldDesc = f.FLDDESC;
                                    }
                                })
                            }                           

                            mapFields.push({
                                XLSFIELD: item, 
                                TBLFIELD: sMatchTableFieldName === "" ? "" : sMatchTableFieldName,
                                TBLFIELDDESC: sMatchTableFieldName === "" ? "" : sMatchTableFieldDesc
                            });
                        })

                        me._selectedMappingId = matchedMapId; 
                    }

                    me.getView().setModel(new JSONModel(mapFields), "mapfield");
                };
                reader.onerror = function(err) {
                    MessageBox.error(err);
                };

                reader.readAsBinaryString(oFile);
            }
        },

        onValidate() {
            var that = this;

            if (me.getView().getModel("mapfield").getData().filter(fItem => fItem.TBLFIELD !== "").length === 0) {
                MessageBox.information("At least one field should be mapped.")
                return;
            }

            var mapFieldsOnly = me.getView().getModel("mapfield").getData().filter(fItem => fItem.TBLFIELD !== "");
            var uniqueValues = new Set(mapFieldsOnly.map(v => v.TBLFIELD));

            if (uniqueValues.size !== mapFieldsOnly.length) {
                MessageBox.error("Duplicate map field found.")
                return;
            }

            if (me.getView().getModel("mapfield").getData().filter(fItem => fItem.TBLFIELD === "").length > 0) {
                MessageBox.confirm("Not all field is mapped, continue?", {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction === "Yes") {
                            that.execute();
                        }
                    }
                })                    
            }
            else {
                this.execute();
            }

        },

        async execute() {
            this.prepareData();

            var bProceed = await this.validateData();

            if (!bProceed) {
                this.showResultData();
            }
            else {
                var that = this;
                var mapFieldsOnly = me.getView().getModel("mapfield").getData().filter(fItem => fItem.TBLFIELD !== "");
                var selectedMappingId = sap.ui.getCore().byId("cboxExcelMapId").getSelectedKey();
    
                if (selectedMappingId === "") {
                    MessageBox.confirm("Save mapping?", {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction === "Yes") {
                                that.newMapping();
                            }
                            else {
                                that.saveData();
                            }
                        }
                    })
                }
                else {
                    var selectedMapping = jQuery.extend(true, [], me.getView().getModel("excelmapping").getData().filter(fItem => fItem.MAPID === selectedMappingId)[0].MapFields);
                    selectedMapping.forEach(item => item.MATCHED = false);
                    mapFieldsOnly.forEach(item => item.MATCHED = false);
                    // console.log(mapFieldsOnly)
                    // console.log(selectedMapping)
                    if (mapFieldsOnly.length !== selectedMapping.length) {
                        this.updateMapping();
                    }
                    else {
                        mapFieldsOnly.forEach(item => {
                            var matchedField = selectedMapping.filter(fItem => fItem.FLDNAME.toLowerCase() === item.TBLFIELD.toLowerCase() && fItem.SCRCOLNAME.toLowerCase() === item.XLSFIELD.toLowerCase())[0];
    
                            if (matchedField !== undefined) {
                                item.MATCHED = true;
                                matchedField.MATCHED = true;
                            }
                        })
    
                        if (mapFieldsOnly.filter(fItem => !fItem.MATCHED).length > 0 || selectedMapping.filter(fItem => !fItem.MATCHED).length > 0) {
                            this.updateMapping();
                        }
                        else {
                            this.saveData();
                        }
                    }    
                }
    
                me._ExcelUploadDialog.close();
            }
        },

        prepareData() {
            console.log(me._excelData);
            var oData = me._excelData;
            var aTableColumns = me.getView().getModel("mapfield").getData().filter(fItem => fItem.TBLFIELD !== "");
            var vLabelRow = 1; //oResult.LBLROW;
            var vDataRow = 2; //oResult.STARTROW;

            // Initialize an array to store the mapped data
            let mappedData = [];

            // Iterate through the Excel data (starting from the second row to skip the header)
            for (let i = vDataRow - 1; i < oData.length; i++) {
                let row = oData[i];
                let mappedRow = {};

                if (row.length > 0) {
                    // Iterate through the columns in the row
                    for (let j = 0; j < row.length; j++) {
                        const columnName = oData[vLabelRow - 1][j]; // Get the column name from the header row
                        const matchColumn = aTableColumns.filter(fItem => fItem.XLSFIELD.toLowerCase() === columnName.toLowerCase());

                        // Only map if a corresponding field name is found in the mapping
                        if (matchColumn.length > 0) {
                            mappedRow[matchColumn[0].TBLFIELD] = row[j] === undefined ? "" : row[j];
                        }                                        
                    }

                    mappedData.push(mappedRow);
                }
            }

            mappedData.forEach(item => {
                item.UPLOADED = false;
                item.ERRORREMARKS = "";
                item.STATUS = "";
            })

            me._uploadedDataToSave = mappedData;
        },

        validateData: async () => {
            // var unique = me._uploadedDataToSave.filter((rowData, index, self) =>
            //     index === self.findIndex((t) => (t.IONO === rowData.IONO && t.DLVSEQ === rowData.DLVSEQ)));
            // console.log(me.getView().getModel("ui").getData().process)

            var promise = new Promise((resolve, reject) => {
                var bProceed = true;

                me._uploadedDataToSave.forEach(row => {
                    if (row.IONO === undefined || row.IONO === "") {
                        row.ERRORREMARKS += "IO number is required.\r\n";
                        row.STATUS = "E";
                        bProceed = false;
                    }
                    else {
                        if (row.IONO !== me.getView().getModel("ui").getData().activeIONO) {
                            row.ERRORREMARKS += "Invalid IO number " + row.IONO + ".\r\n";
                            row.STATUS = "E";
                            bProceed = false;
                        }
                    }

                    if (me.getView().getModel("excelupload").getData().section === "DTL-PROC") {
                        if (row.PROCESSCD === undefined) {
                            row.ERRORREMARKS += "Process is required.\r\n";
                            row.STATUS = "E";
                            bProceed = false;
                        }
                        else if (me.getView().getModel("processData").getData().results.filter(fItem => fItem.PROCESSCD === row.PROCESSCD).length === 0) {
                            row.ERRORREMARKS += "Invalid process " + row.PROCESSCD + ".\r\n";
                            row.STATUS = "E";
                            bProceed = false;
                        }
                    }
                    else {
                        if (row.PROCESSCD !== undefined) {
                            if (row.PROCESSCD !== "FN/PK") {
                                row.ERRORREMARKS += "Invalid process " + row.PROCESSCD + ".\r\n";
                                row.STATUS = "E";
                                bProceed = false;
                            }
                        }
                    }

                    if (row.DLVSEQ === undefined) {
                        row.ERRORREMARKS += "Delivery sequence is required.\r\n";
                        row.STATUS = "E";
                        bProceed = false;
                    }
                    else if (me.getView().getModel("COMPONENT_MODEL").getData().filter(fItem => (fItem.DLVSEQ + "") === row.DLVSEQ).length === 0) {
                        row.ERRORREMARKS += "Invalid delivery sequence " + row.DLVSEQ + ".\r\n";
                        row.STATUS = "E";
                        bProceed = false;
                    }
                    
                    if (row.STARTDT === undefined || row.STARTDT === "") {
                        row.ERRORREMARKS += "Actual start is required.\r\n";
                        row.STATUS = "E";
                        bProceed = false;
                    }

                    if (row.FINISHDT === undefined || row.FINISHDT === "") {
                        row.ERRORREMARKS += "Actual finish is required.\r\n";
                        row.STATUS = "E";
                        bProceed = false;
                    }

                    if ((row.STARTDT !== undefined && row.STARTDT !== "") && (row.FINISHDT !== undefined && row.FINISHDT !== "")) {
                        if (new Date(row.STARTDT) > new Date(row.FINISHDT)) {
                            row.ERRORREMARKS += "Actual start date must be earlier than or equal to actual finish date.\r\n";
                            row.STATUS = "E";
                            bProceed = false;
                        }
                    }

                    if (row.POSTDT === undefined || row.POSTDT === "") {
                        row.ERRORREMARKS += "Posting date is required.\r\n";
                        row.STATUS = "E";
                        bProceed = false;
                    }

                    if (row.QTY === undefined || row.QTY === "") {
                        row.ERRORREMARKS += "Quantity is required.\r\n";
                        row.STATUS = "E";
                        bProceed = false;
                    }
                    else if (row.QTY === "0") {
                        row.ERRORREMARKS += "Invalid quantity " + row.QTY + ".\r\n";
                        row.STATUS = "E";
                        bProceed = false;
                    }

                    if (me.getView().getModel("excelupload").getData().section === "DTL-FG") {
                        if (row.COLORCD === undefined) {
                            row.ERRORREMARKS += "Color is required.\r\n";
                            row.STATUS = "E";
                            bProceed = false;
                        }
                        else if (me._FGColors.filter(fItem => fItem === row.COLORCD).length === 0) {
                            row.ERRORREMARKS += "Invalid color " + row.COLORCD + ".\r\n";
                            row.STATUS = "E";
                            bProceed = false;
                        }

                        if (row.SIZECD === undefined) {
                            row.ERRORREMARKS += "Size is required.\r\n";
                            row.STATUS = "E";
                            bProceed = false;
                        }
                        else if (me._FGSizes.filter(fItem => fItem === row.SIZECD).length === 0) {
                            row.ERRORREMARKS += "Invalid size " + row.SIZECD + ".\r\n";
                            row.STATUS = "E";
                            bProceed = false;
                        }
                    }
                })

                if (bProceed) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            })

            return promise;
        },

        onCancelUpload() {
            me._ExcelUploadDialog.close();
        },

        onMappingChange(oEvent) {
            if (oEvent.getSource().getSelectedKey() !== "") {
                var oSelectedMapping = me.getView().getModel("excelmapping").getData().filter(fItem => fItem.MAPID === oEvent.getSource().getSelectedKey())[0];

                if (me.getView().getModel("mapfield") !== undefined) {
                    me.getView().getModel("mapfield").getData().forEach(item => {
                        var oMatchedField = oSelectedMapping.MapFields.filter(fItem => fItem.SCRCOLNAME.toLowerCase() === item.XLSFIELD.toLowerCase())[0];

                        if (oMatchedField === undefined) {
                            item.TBLFIELD = "";
                            item.TBLFIELDDESC = "";
                            item.MATCHED = false;    
                        }
                        else {
                            var oTableField = me.getView().getModel("tablefield").getData().filter(fItem => fItem.FIELDNAME.toLowerCase() === oMatchedField.FLDNAME.toLowerCase())[0];
                            item.TBLFIELD = oTableField.FIELDNAME;
                            item.TBLFIELDDESC = oTableField.FIELDDESC;
                            item.MATCHED = true;    
                        }
                    })
                }

                if (oSelectedMapping.DFLT === "X") {
                    sap.ui.getCore().byId("xuDefaultInd").setSelected(true);
                }
                else {
                    sap.ui.getCore().byId("xuDefaultInd").setSelected(false);
                }

                if (oSelectedMapping.COLLBL === "X") {
                    sap.ui.getCore().byId("xuWithHdrInd").setSelected(true);
                }
                else {
                    sap.ui.getCore().byId("xuWithHdrInd").setSelected(false);
                }

                me._selectedMappingId = oEvent.getSource().getSelectedKey();
            }
            else {
                if (oEvent.getSource().getValue() !== "") {
                    MessageBox.information("Selected mapping not found.");
                }                    
            }
        },

        newMapping() {
            var sDialogFragmentName = "zuiprodoutput.view.fragments.dialog.NewExcelMappingDialog";

            if (!me._NewMappingDialog) {
                me._NewMappingDialog = sap.ui.xmlfragment(sDialogFragmentName, me);
                // me._NewMappingDialog.setModel(new JSONModel());
                me.getView().addDependent(me._NewMappingDialog);
            }

            me._NewMappingDialog.open();
            sap.ui.getCore().byId("xuCrtNewMapId").setValue("");
        },

        updateMapping() {
            var sDialogFragmentName = "zuiprodoutput.view.fragments.dialog.UpdateExcelMappingDialog";

            if (!me._UpdateMappingDialog) {
                me._UpdateMappingDialog = sap.ui.xmlfragment(sDialogFragmentName, me);
                // me._UpdateMappingDialog.setModel(new JSONModel());
                me.getView().addDependent(me._UpdateMappingDialog);
            }

            me._UpdateMappingDialog.open();
            sap.ui.getCore().byId("xuUpdNewMapId").setValue("");
        },

        onNewMapping(oEvent) {
            if (sap.ui.getCore().byId("xuCrtNewMapId").getValue() === "") {
                MessageBox.information("Please enter new mapping description.");
                return;
            }

            me._NewMappingDialog.close();                
            me._newMapDesc = sap.ui.getCore().byId("xuCrtNewMapId").getValue();
            this.saveMapping("CREATE");
        },

        onUpdateMapping(oEvent) {
            me._UpdateMappingDialog.close();

            if (sap.ui.getCore().byId("xuNewMapInd").getSelected()) {
                if (sap.ui.getCore().byId("xuUpdNewMapId").getValue() === "") {
                    MessageBox.information("Please enter new mapping description.");
                    return;
                }

                me._newMapDesc = sap.ui.getCore().byId("xuUpdNewMapId").getValue();
                this.saveMapping("CREATE");                    
            }
            else{
                this.saveMapping("UPDATE");
            }
        },

        onPrepareData: function(oEvent) {
            me._UpdateMappingDialog.close();
            this.saveData();
        },

        onNewMapIndChange(oEvent) {
            if (oEvent.getParameter("selected")) {
                sap.ui.getCore().byId("xuUpdNewMapId").setEnabled(true);
            }
            else{
                sap.ui.getCore().byId("xuUpdNewMapId").setEnabled(false);
            }
        },

        saveMapping(action) {
            var mapFieldsOnly = me.getView().getModel("mapfield").getData().filter(fItem => fItem.TBLFIELD !== "");
            var oParam = {};
            var aParamHdr = [], aParamItem = [];
            var sNewMapId = dateFormat.format(new Date());

            mapFieldsOnly.forEach(item => {
                aParamItem.push({
                    MAPID: action === "UPDATE" ? sap.ui.getCore().byId("cboxExcelMapId").getSelectedKey() : sNewMapId,
                    FLDNAME: item.TBLFIELD,
                    FLDDESC: me.getView().getModel("tablefield").getData().filter(fItem => fItem.FIELDNAME === item.TBLFIELD)[0].FIELDDESC,
                    SCRCOLNAME: item.XLSFIELD
                })
            })

            aParamHdr.push({
                MAPID: action === "UPDATE" ? sap.ui.getCore().byId("cboxExcelMapId").getSelectedKey() : sNewMapId,
                MAPDESC: action === "UPDATE" ? "" : me._newMapDesc,
                DFLT: sap.ui.getCore().byId("xuDefaultInd").getSelected() ? "X" : "",
                LBLROW: sap.ui.getCore().byId("xuWithHdrInd").getSelected() ? 1 : 0,
                STARTROW: sap.ui.getCore().byId("xuWithHdrInd").getSelected() ? 2 : 1
            })

            oParam = {
                SBU: me.getView().getModel("excelupload").getData().sbu,
                MODULE: me.getView().getModel("excelupload").getData().module,
                TABLE: me.getView().getModel("excelupload").getData().table,
                SECTION: me.getView().getModel("excelupload").getData().section,
                ACTION: action,
                N_ExcelMapHdr: aParamHdr,
                N_ExcelMapItem: aParamItem
            }

            console.log(oParam);
            var oModelTemplate = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

            oModelTemplate.create("/ExcelMapSet", oParam, {
                method: "POST",
                success: function(oResult, oResponse) { },
                error: function(err) { }
            });
            // return;
            this.saveData();
        },

        saveData() {
            var aData = me._uploadedDataToSave;
            console.log(aData);

            if (me.getView().getModel("excelupload").getData().section === "DTL-FG") {
                me.saveFG();
            }
            else {
                me.saveProcess();
            }
        },

        getMapping: async () => {
            var oModelTemplate = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            var oParam = {
                SBU: me.getView().getModel("excelupload").getData().sbu,
                MODULE: me.getView().getModel("excelupload").getData().module,
                TABLE: me.getView().getModel("excelupload").getData().table,
                SECTION: me.getView().getModel("excelupload").getData().section,
                ACTION: "GET",
                N_ExcelMapHdr: [],
                N_ExcelMapItem: [],
                N_ExcelMapTblCol: []
            }

            var promise = new Promise((resolve, reject) => {
                oModelTemplate.create("/ExcelMapSet", oParam, {
                    method: "POST",
                    success: function(oResult, oResponse) {
                        var oMapping = [];

                        oResult.N_ExcelMapHdr.results.forEach(item => {
                            item.MapFields = oResult.N_ExcelMapItem.results.filter(fItem => fItem.MAPID === item.MAPID);
                            oMapping.push(item);
                        })

                        me.getView().setModel(new JSONModel(oMapping), "excelmapping");

                        oResult.N_ExcelMapTblCol.results.forEach(item => item.FIELDDESC = item.FIELDDESC === "" ? item.FIELDNAME : item.FIELDDESC);
                        me.getView().setModel(new JSONModel(oResult.N_ExcelMapTblCol.results), "tablefield");
                        console.log(oResult.N_ExcelMapTblCol.results)
                        resolve(true);
                    },
                    error: function(err) { 
                        resolve(false);
                    }
                });
            })

            return promise;
        },

        onPreviewData() {
            var sDialogFragmentName = "zuiprodoutput.view.fragments.dialog.ExcelPreviewDialog";

            if (!me._ExcelPreviewDialog) {
                me._ExcelPreviewDialog = sap.ui.xmlfragment(sDialogFragmentName, me);
                me.getView().addDependent(me._ExcelPreviewDialog);

                sap.ui.getCore().byId("excelPreviewTab").setModel(new JSONModel({
                    columns: [],
                    rows: []
                }));
            }

            var oTable = sap.ui.getCore().byId("excelPreviewTab");
            var vLblRow = me.getView().getModel("excelupload").getData().lblrow;
            var aRows = [];

            oTable.getModel().setProperty("/columns", me.getView().getModel("mapfield").getData());

            me._excelData.forEach((item, index) => {
                var oRow = {};

                if (vLblRow === 1 && index === 0) { return }

                me.getView().getModel("mapfield").getData().forEach((itm, idx) => {
                    oRow[itm.XLSFIELD] = item[idx];
                })

                aRows.push(oRow);
            })

            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().XLSFIELD;
                var sMapped = context.getObject().TBLFIELD === "" ? false : true;

                return new sap.ui.table.Column({
                    name: sColumnId,
                    label: new sap.m.Text({text: (sMapped ? "" : "*") + sColumnId}), 
                    template: new sap.m.Text({text: "{" + sColumnId + "}"}), 
                    width: '150px',
                    hAlign: "Begin"
                });
            });

            oTable.getModel().setProperty("/rows", aRows);
            oTable.bindRows("/rows");
            console.log(oTable.getModel())

            me._ExcelPreviewDialog.open();
        },

        showResultData() {
            var sDialogFragmentName = "zuiprodoutput.view.fragments.dialog.ExcelResultDialog";

            if (!me._ExcelResultDialog) {
                me._ExcelResultDialog = sap.ui.xmlfragment(sDialogFragmentName, me);
                me.getView().addDependent(me._ExcelResultDialog);

                sap.ui.getCore().byId("excelResultTab").setModel(new JSONModel({
                    columns: [],
                    rows: []
                }));
            }

            var oTable = sap.ui.getCore().byId("excelResultTab");
            var aColumns = [], aRows = [];

            aColumns.push({
                FIELDNAME: "ERRORREMARKS",
                FIELDDESC: me.getView().getModel("ddtext").getData()["ERRORREMARKS"]
            })
            
            aColumns.push({
                FIELDNAME: "UPLOADED",
                FIELDDESC: me.getView().getModel("ddtext").getData()["UPLOADED"]
            })

            Object.keys(me._uploadedDataToSave[0]).forEach(item => {
                if (!(item === "ERRORREMARKS" || item === "UPLOADED")) {
                    var oTableField = me.getView().getModel("tablefield").getData().filter(fItem => fItem.FIELDNAME === item)[0];

                    aColumns.push({
                        FIELDNAME: item,
                        FIELDDESC: oTableField === undefined ? item : oTableField.FIELDDESC
                    })
                }
            }) 

            oTable.getModel().setProperty("/columns", aColumns);

            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().FIELDNAME;
                var sColumnDesc = context.getObject().FIELDDESC;
                var oTemplate;

                if (sColumnId === "UPLOADED") {
                    oTemplate = new sap.m.CheckBox({ selected: "{" + sColumnId + "}", editable: false })
                }
                else {
                    oTemplate = new sap.m.Text({text: "{" + sColumnId + "}"})
                }

                return new sap.ui.table.Column({
                    name: sColumnId,
                    label: new sap.m.Text({text: sColumnDesc}), 
                    template: oTemplate, 
                    width: sColumnId === "ERRORREMARKS" ? "250px" : "150px",
                    hAlign: "Begin",
                    visible: sColumnId === "UPLOADED" || sColumnId === "STATUS" ? false : true
                });
            });

            oTable.getModel().setProperty("/rows", me._uploadedDataToSave);
            oTable.bindRows("/rows");

            me._ExcelResultDialog.open();
        },

        onClosePreview() {
            me._ExcelPreviewDialog.close();
        },

        onCloseResult() {
            me._ExcelResultDialog.close();
        }

	};
});