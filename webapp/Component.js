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

    // Routed through THIS plugin's own xs-app.json to the "dw4-bas"
    // on-premise destination. Deliberately NOT a root-relative path
    // ("/sap/opu/odata/...") - that resolves against the current page's
    // origin AT THE ROOT, which lands outside this plugin's own path
    // prefix (the shared Work Zone approuter serves the shell itself from
    // that root, with no route to this backend). This plugin's xs-app.json
    // route only applies to requests made WITHIN its own deployed path
    // prefix, so the full URL has to be built from wherever this
    // component's own files actually were loaded from - see
    // _resolveODataServiceUrl().
    var ODATA_SERVICE_PATH = "/sap/opu/odata/SAP/ZEWM_FIORI_PICKING_APP_SRV";

    var STORAGE_KEY = "solarTerminalPlugin.pcName";

    return Component.extend("com.solar.terminalplugin.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            // clientname normally arrives as a query-string param (before
            // #), set by whatever launched this URL. Read it once and strip
            // it from the query string.
            var oUrl = new URL(window.location.href);
            var sClientName = oUrl.searchParams.get("clientname");

            if (sClientName) {
                oUrl.searchParams.delete("clientname");
                window.history.replaceState(null, "", oUrl.toString());
            } else {
                // Fallback: a PREVIOUS session already moved clientname into
                // the hash, and the shell's top-level page got reloaded
                // since then (e.g. during testing, or a user hitting
                // refresh). The query string no longer has it at that
                // point, but the hash still does - read it from there so
                // this plugin instance (and its postMessage listener) still
                // initializes correctly instead of silently doing nothing.
                var oHashMatch = (window.location.hash || "").match(/[?&]clientname=([^&]*)/);
                if (oHashMatch) {
                    sClientName = decodeURIComponent(oHashMatch[1]);
                }
            }

            if (!sClientName) {
                return;
            }

            this._sClientName = sClientName;

            // ODATA_USER_PARAM: set the SAP user parameter ZCLIENTNAME
            // server-side, same call the ZEWM_PICKING app's own onPrintDet
            // already makes. If the backend genuinely persists this per
            // user (classic SU01/SPA-GPA parameter), any ABAP-side
            // GET PARAMETER ID 'ZCLIENTNAME' in this user's session - from
            // ANY app on the same backend system - picks it up with zero
            // frontend URL/hash/iframe logic needed. This is additive/
            // experimental and must NEVER be able to break the hash/
            // postMessage logic below, which is the actual confirmed-working
            // requirement. try/catch alone only protects against a
            // SYNCHRONOUS throw - it doesn't fully isolate this from the
            // rest of init() by inspection, and this experiment has already
            // regressed the working hash behavior more than once. Deferred
            // with setTimeout(..., 0) instead: that schedules the call for
            // AFTER init() has already returned completely, on a separate
            // turn of the event loop - so nothing that happens inside it
            // (sync or async, throw or not) can possibly run before, or
            // interfere with, anything below this point.
            var that = this;
            window.setTimeout(function () {
                try {
                    that._setUserParameter(sClientName);
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.log("_setUserParameter failed:", e);
                }
            }, 0);

            // Belt-and-braces for any app running in the SAME window/tab as
            // the shell. NOTE: this is NOT visible to apps loaded via
            // ui5apparuntime.html's isolated iframe - iframe sessionStorage
            // is a separate session per the iframe's own origin/context, so
            // don't rely on this for isolated apps (see postMessage below).
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
            // hash is patched by then). An earlier attempt to close that gap
            // via sap.ushell's ShellNavigation.registerNavigationFilter
            // broke tile navigation entirely and was reverted - that FLP API
            // is undocumented/deprecated and not safe to guess at again.
            window.addEventListener("hashchange", this._applyClientNameToCurrentHash.bind(this));

            // Reliable path for apps in an ISOLATED iframe
            // (ui5apparuntime.html), which can't see this window's
            // sessionStorage or URL at all: answer postMessage requests for
            // clientname directly. Standard browser API, no FLP internals
            // involved, and no timing race - the child app asks whenever
            // IT is ready, instead of us racing to inject data before FLP
            // reads the hash.
            window.addEventListener("message", function (oEvent) {
                if (oEvent.data && oEvent.data.type === "solarTerminalPlugin:getClientName" && oEvent.source) {
                    oEvent.source.postMessage({
                        type: "solarTerminalPlugin:clientName",
                        clientname: that._sClientName
                    }, "*");
                }
            });

            // this._showInfoDialog(oNow, sTimeZone, sOffset);
        },

        _setUserParameter: function (sClientName) {
            // Lazy-loaded on purpose - see the comment at the call site in
            // init(). sap.ui.require() resolves asynchronously and its own
            // error callback (below) keeps a failed module load from ever
            // throwing back into init()'s call stack.
            var that = this;
            sap.ui.require(["sap/ui/model/odata/ODataModel"], function (ODataModel) {
                try {
                    var sOdataServiceUrl = that._resolveODataServiceUrl();
                    // eslint-disable-next-line no-console
                    console.log("Resolved OData service URL:", sOdataServiceUrl);
                    var oModel = new ODataModel(sOdataServiceUrl, {
                        json: true,
                        loadMetadataAsync: true
                    });

                    var oEntry = {
                        Parid: "ZCLIENTNAME",
                        Parva: sClientName || "TERMINAL"
                    };

                    oModel.update("/UsParamSet('ZCLIENTNAME')", oEntry, {
                        method: "PUT",
                        success: function () {
                            // eslint-disable-next-line no-console
                            console.log("ZCLIENTNAME user parameter set to", oEntry.Parva);
                        },
                        error: function (oError) {
                            // eslint-disable-next-line no-console
                            console.log("Failed to set ZCLIENTNAME user parameter:", oError);
                        }
                    });
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.log("_setUserParameter failed:", e);
                }
            }, function (oError) {
                // eslint-disable-next-line no-console
                console.log("Failed to load ODataModel module:", oError);
            });
        },

        // Resolves the absolute OData service URL against THIS component's
        // own deployed path prefix, instead of a root-relative path (which
        // resolves against the shell page's own root - outside this
        // plugin's xs-app.json scope, 403/404s) or a hardcoded absolute
        // host (breaks across dev/QA/prod landscapes). sap.ui.require.toUrl
        // returns the URL this component's own resources were actually
        // loaded from (e.g. ".../comsolarterminalpluginservice.
        // comsolarterminalplugin/~version~/"), which - since THIS plugin's
        // own xs-app.json has the route to "dw4-bas" - is the only prefix
        // under which that route is actually matched by the shared
        // approuter.
        _resolveODataServiceUrl: function () {
            var sComponentBaseUrl = sap.ui.require.toUrl("com/solar/terminalplugin");
            var oResolvedUrl = new URL(sComponentBaseUrl, window.location.href);
            return oResolvedUrl.pathname.replace(/\/$/, "") + ODATA_SERVICE_PATH;
        },

        // FLP shell hash grammar is NOT a plain query string - it is
        // "<SemanticObject>-<Action>?<StartupParams>&/<InnerAppRoute>".
        // Only the <StartupParams> segment (before "&/") ends up on the
        // target app's getComponentData().startupParameters; anything from
        // "&/" onward is the app's own internal router hash and must be
        // left completely untouched. Pure function: takes a hash string
        // (with or without a leading #) and returns the patched hash
        // WITHOUT a leading #.
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
