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
            // clientname arrives as a query-string param (before #), set by
            // whatever launched this URL. Read it once, strip it from the
            // query string, and remember it on the plugin instance.
            var oUrl = new URL(window.location.href);
            var sClientName = oUrl.searchParams.get("clientname");

            if (!sClientName) {
                return;
            }

            oUrl.searchParams.delete("clientname");
            window.history.replaceState(null, "", oUrl.toString());

            this._sClientName = sClientName;
            // Fallback for any app that reads it via JS instead of the URL.
            window.sessionStorage.setItem("clientname", sClientName);

            // Apply to the current hash immediately - covers the very
            // first load (e.g. "#Shell-home") before any tile is clicked.
            this._applyClientNameToCurrentHash();

            // FLP fully replaces window.location.hash on every tile/app
            // navigation, so clientname has to be re-applied on every hash
            // change, not just once at startup.
            //
            // NOTE: this reacts one step behind - FLP has usually already
            // read the PRE-change hash into the target app's
            // startupParameters by the time this handler runs, so a
            // freshly-clicked tile may not see clientname in
            // getComponentData().startupParameters on its very first open
            // (a page refresh on that same app picks it up fine, since the
            // hash is patched by then). An earlier attempt to close that
            // gap via sap.ushell's ShellNavigation.registerNavigationFilter
            // broke tile navigation entirely and was reverted - that FLP
            // API needs to be verified against the actual shell version in
            // use before trying again. In the meantime, the target app
            // reading window.sessionStorage.getItem("clientname") instead
            // of startupParameters is the reliable option (see comment
            // below and in the earlier chat reply).
            window.addEventListener("hashchange", this._applyClientNameToCurrentHash.bind(this));

            // this._showInfoDialog(oNow, sTimeZone, sOffset);
        },

        // FLP shell hash grammar is NOT a plain query string - it is
        // "<SemanticObject>-<Action>?<StartupParams>&/<InnerAppRoute>".
        // Only the <StartupParams> segment (before "&/") ends up on the
        // target app's getComponentData().startupParameters; anything from
        // "&/" onward is the app's own internal router hash and must be
        // left completely untouched. Pure function: takes a hash string
        // (with or without a leading #) and returns the patched hash
        // WITHOUT a leading #, so it can feed both replaceState() and the
        // navigation filter below.
        _buildHashWithClientName: function (sHash) {
            sHash = sHash || "";
            if (sHash.charAt(0) === "#") {
                sHash = sHash.substring(1);
            }

            if (/[?&]clientname=/.test(sHash)) {
                return sHash; // already present, nothing to do
            }

            // The inner app route starts at "&/", or at "?/" when there are
            // no other startup params yet.
            var oRouteMatch = sHash.match(/[?&]\//);
            var iRouteMarkerIndex = oRouteMatch ? oRouteMatch.index : -1;

            var sBeforeRoute = iRouteMarkerIndex >= 0 ? sHash.substring(0, iRouteMarkerIndex) : sHash;
            var sRoute = iRouteMarkerIndex >= 0 ? sHash.substring(iRouteMarkerIndex) : "";
            // Once we insert our own params section, the boundary to the
            // route must be "&/" - if it currently starts with "?/" (no
            // other params existed before it), swap that leading "?" for "&".
            if (sRoute.charAt(0) === "?") {
                sRoute = "&" + sRoute.substring(1);
            }

            var iQIndex = sBeforeRoute.indexOf("?");
            var sShellPath = iQIndex >= 0 ? sBeforeRoute.substring(0, iQIndex) : sBeforeRoute;
            var sExistingParams = iQIndex >= 0 ? sBeforeRoute.substring(iQIndex + 1) : "";

            var sClientNameParam = "clientname=" + encodeURIComponent(this._sClientName);
            var sNewParams = sExistingParams ? sExistingParams + "&" + sClientNameParam : sClientNameParam;

            return sShellPath + "?" + sNewParams + sRoute;
        },

        _applyClientNameToCurrentHash: function () {
            var sNewHash = this._buildHashWithClientName(window.location.hash);
            window.history.replaceState(null, "", window.location.pathname + window.location.search + "#" + sNewHash);
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
