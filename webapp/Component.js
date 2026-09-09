sap.ui.define([
    "sap/ui/core/Component",
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/Button",
    "sap/m/VBox"
], function (Component, Dialog, Input, Label, Text, Button, VBox) {
    "use strict";

    var STORAGE_KEY = "solarTimePlugin.pcName";

    return Component.extend("com.solar.timeplugin.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            var oNow = new Date();
            var sTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            var iOffsetHours = -oNow.getTimezoneOffset() / 60;
            var sOffset = "UTC" + (iOffsetHours >= 0 ? "+" : "") + iOffsetHours;

            this._showInfoDialog(oNow, sTimeZone, sOffset);
        },

        // Single popup: basic info as of this login, plus an editable PC name
        // field (pre-filled from localStorage, since browsers can't read the
        // OS hostname directly).
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

                        var oUrl = new URL(window.location.href);
                        oUrl.searchParams.set("sTimeZone", oNow.toLocaleTimeString() + " " + sTimeZone + " (" + sOffset + ")");
                        oUrl.searchParams.set("ZCLIENTNAME", sPCName);
                        window.history.replaceState(null, "", oUrl.toString());

                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        }
    });
});
