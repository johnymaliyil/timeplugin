sap.ui.define([
    "sap/ui/core/Component"
], function (Component) {
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

    return Component.extend("com.solar.terminalplugin.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            // clientname arrives as a query-string param, set by whatever
            // launched this URL.
            var oUrl = new URL(window.location.href);
            var sClientName = oUrl.searchParams.get("clientname");

            if (!sClientName) {
                return;
            }

            this._setUserParameter(sClientName);
        },

        // Sets the SAP user parameter ZCLIENTNAME server-side. Any ABAP-side
        // GET PARAMETER ID 'ZCLIENTNAME' in this user's session - from ANY
        // app on the same backend system - picks it up with no
        // frontend-side URL/hash logic needed.
        _setUserParameter: function (sClientName) {
            sap.ui.require(["sap/ui/model/odata/ODataModel"], function (ODataModel) {
                try {
                    var oModel = new ODataModel(this._resolveODataServiceUrl(), {
                        json: true,
                        loadMetadataAsync: true
                    });

                    oModel.update("/UsParamSet('ZCLIENTNAME')", {
                        Parid: "ZCLIENTNAME",
                        Parva: sClientName
                    }, {
                        method: "PUT",
                        success: function () {
                            // eslint-disable-next-line no-console
                            console.log("ZCLIENTNAME user parameter set to", sClientName);
                        },
                        error: function (oError) {
                            // eslint-disable-next-line no-console
                            console.error("Failed to set ZCLIENTNAME user parameter:", oError);
                        }
                    });
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error("_setUserParameter failed:", e);
                }
            }.bind(this), function (oError) {
                // eslint-disable-next-line no-console
                console.error("Failed to load ODataModel module:", oError);
            });
        },

        // Resolves the absolute OData service URL against THIS component's
        // own deployed path prefix, instead of a root-relative path (which
        // resolves against the shell page's own root - outside this
        // plugin's xs-app.json scope, 403/404s) or a hardcoded absolute
        // host (breaks across dev/QA/prod landscapes).
        _resolveODataServiceUrl: function () {
            var sComponentBaseUrl = sap.ui.require.toUrl("com/solar/terminalplugin");
            var oResolvedUrl = new URL(sComponentBaseUrl, window.location.href);
            return oResolvedUrl.pathname.replace(/\/$/, "") + ODATA_SERVICE_PATH;
        }
    });
});
