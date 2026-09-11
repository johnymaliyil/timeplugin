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

            // For every SUBSEQUENT navigation (tile clicks etc.), a plain
            // "hashchange" listener reacts too late: FLP has already parsed
            // the pre-change hash into the target app's startupParameters
            // and started instantiating it by the time such a handler
            // runs - that's why the fix only ever showed up after a manual
            // refresh. Hook FLP's own navigation filter instead, which runs
            // synchronously BEFORE the shell processes the new hash.
            this._registerNavigationFilter();
            // Kept as a harmless fallback in case the navigation filter
            // can't be registered (e.g. outside a full FLP shell).
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
        },

        // FLP's officially supported hook for intercepting/rewriting a
        // navigation's target hash BEFORE the shell acts on it (loads the
        // app, builds its startupParameters). This is what actually fixes
        // the first-click race - by the time a "hashchange" event fires,
        // it's already too late.
        _registerNavigationFilter: function () {
            var that = this;

            if (!(window.sap && sap.ushell && sap.ushell.Container)) {
                return; // not running inside a full FLP shell
            }

            sap.ushell.Container.getServiceAsync("ShellNavigation").then(function (oShellNavigation) {
                oShellNavigation.registerNavigationFilter(function (sNewShellHash) {
                    var sIncomingHash = sNewShellHash.charAt(0) === "#" ? sNewShellHash.substring(1) : sNewShellHash;
                    var sPatchedHash = that._buildHashWithClientName(sIncomingHash);

                    if (sPatchedHash === sIncomingHash) {
                        return oShellNavigation.NavigationFilterStatus.Continue;
                    }

                    return {
                        status: oShellNavigation.NavigationFilterStatus.Custom,
                        hash: sPatchedHash
                    };
                });
            });
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
