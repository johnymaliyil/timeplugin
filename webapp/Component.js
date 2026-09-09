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

            var oUrl = new URL(window.location.href);
            oUrl.searchParams.set("sTimeZone", oNow.toLocaleTimeString() + " " + sTimeZone + " (" + sOffset + ")");
            window.history.replaceState(null, "", oUrl.toString());

            MessageBox.information(
                "Current time: " + oNow.toLocaleTimeString() + "\n" +
                "Date: " + oNow.toLocaleDateString() + "\n" +
                "Time zone: " + sTimeZone + " (" + sOffset + ")",
                {
                    title: "Welcome to Build Work Zone"
                }
            );
        }
    });
});
