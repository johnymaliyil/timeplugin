sap.ui.define([
    "sap/ui/core/Component"
    // Popup UI disabled - dependencies commented out for easy restore.
    // "sap/m/Dialog",
    // "sap/m/Input",
    // "sap/m/Label",
    // "sap/m/Text",
    // "sap/m/Button",
    // "sap/m/VBox"
], function (Component /*, Dialog, Input, Label, Text, Button, VBox */) {
    "use strict";

    var STORAGE_KEY = "solarTimePlugin.pcName";

    return Component.extend("com.solar.timeplugin.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            // No popup: silently read the cached PC name (or default) and
            // move it onto the URL hash (after #), no user interaction.
            var sPCName = window.localStorage.getItem(STORAGE_KEY) || "DKLT000XXXXX";

            var sHash = window.location.hash || "#";
            var iQIndex = sHash.indexOf("?");
            var sHashPath = iQIndex >= 0 ? sHash.substring(0, iQIndex) : sHash;
            var oHashParams = new URLSearchParams(iQIndex >= 0 ? sHash.substring(iQIndex + 1) : "");

            oHashParams.set("clientname", sPCName);

            var sNewUrl = window.location.pathname + window.location.search + sHashPath + "?" + oHashParams.toString();
            window.history.replaceState(null, "", sNewUrl);

            // this._showInfoDialog(oNow, sTimeZone, sOffset);
        }

        // Popup showing basic info (time/date/timezone) plus an editable PC
        // name field. Disabled per request (no popup wanted) - kept here,
        // commented, so it can be restored by:
        //   1. uncommenting the sap/m/* dependencies above and the function
        //      params (Dialog, Input, Label, Text, Button, VBox)
        //   2. uncommenting this method
        //   3. in init(), computing oNow/sTimeZone/sOffset again and calling
        //      this._showInfoDialog(oNow, sTimeZone, sOffset) instead of the
        //      inline clientname-only logic
        /*
        ,
        _showInfoDialog: function (oNow, sTimeZone, sOffset) {
            var oInput = new Input({
                value: window.localStorage.getItem(STORAGE_KEY) || "DKLT000XXXXX",
                placeholder: "Enter your PC name"
            });

            var oDialog = new Dialog({
                title: "Welcome to Build Work Zone",
                content: new VBox({
                    items: [
                        new Text({ text: "Current time: " + oNow.toLocaleTimeString() }),
                        new Text({ text: "Date: " + oNow.toLocaleDateString() }),
                        new Text({ text: "Time zone: " + sTimeZone + " (" + sOffset + ")" }),
                        new Label({ text: "PC name", labelFor: oInput }).addStyleClass("sapUiTinyMarginTop"),
                        oInput
                    ]
                }).addStyleClass("sapUiSmallMargin"),
                beginButton: new Button({
                    text: "OK",
                    type: "Emphasized",
                    press: function () {
                        var sPCName = (oInput.getValue() || "").trim() || "Unknown";
                        window.localStorage.setItem(STORAGE_KEY, sPCName);

                        var sHash = window.location.hash || "#";
                        var iQIndex = sHash.indexOf("?");
                        var sHashPath = iQIndex >= 0 ? sHash.substring(0, iQIndex) : sHash;
                        var oHashParams = new URLSearchParams(iQIndex >= 0 ? sHash.substring(iQIndex + 1) : "");

                        oHashParams.set("sTimeZone", oNow.toLocaleTimeString() + " " + sTimeZone + " (" + sOffset + ")");
                        oHashParams.set("clientname", sPCName);

                        var sNewUrl = window.location.pathname + window.location.search + sHashPath + "?" + oHashParams.toString();
                        window.history.replaceState(null, "", sNewUrl);

                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        }
        */
    });
});
