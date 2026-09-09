sap.ui.define([
    "sap/ui/core/Component",
    "sap/m/MessageBox"
], function (Component, MessageBox) {
    "use strict";

    return Component.extend("com.solar.timeplugin.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            var oNow = new Date();
            var sTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            var iOffsetHours = -oNow.getTimezoneOffset() / 60;
            var sOffset = "UTC" + (iOffsetHours >= 0 ? "+" : "") + iOffsetHours;
            var sPCName = this._getPCName();

            var oUrl = new URL(window.location.href);
            oUrl.searchParams.set("sTimeZone", oNow.toLocaleTimeString() + " " + sTimeZone + " (" + sOffset + ")");
            oUrl.searchParams.set("sPCName", sPCName);
            window.history.replaceState(null, "", oUrl.toString());

            MessageBox.information(
                "Current time: " + oNow.toLocaleTimeString() + "\n" +
                "Date: " + oNow.toLocaleDateString() + "\n" +
                "Time zone: " + sTimeZone + " (" + sOffset + ")" + "\n" +
                "PC name: " + sPCName,
                {
                    title: "Welcome to Build Work Zone"
                }
            );
        },

        // Browsers cannot read the OS hostname (%COMPUTERNAME%) directly;
        // ask once and remember the answer in this browser profile.
        _getPCName: function () {
            var STORAGE_KEY = "solarTimePlugin.pcName";
            var sPCName = window.localStorage.getItem(STORAGE_KEY);

            if (!sPCName) {
                sPCName = window.prompt(
                    "Enter your PC name (run 'hostname' in Command Prompt to find it):",
                    ""
                );
                sPCName = (sPCName || "").trim() || "Unknown";
                window.localStorage.setItem(STORAGE_KEY, sPCName);
            }

            return sPCName;
        }
    });
});
