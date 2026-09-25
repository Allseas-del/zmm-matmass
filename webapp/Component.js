sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/core/HTML"
], function (UIComponent, HTML) {
  "use strict";
  // Hosts the self-contained upload tool (tool.html) inside the Fiori launchpad.
  // The iframe is served from the same BSP, so all OData calls are same-origin and use the FLP session.
  return UIComponent.extend("com.allseas.zmmmatmass.Component", {
    metadata: { manifest: "json" },
    createContent: function () {
      var sUrl = sap.ui.require.toUrl("com/allseas/zmmmatmass/tool.html");
      return new HTML({
        content: '<iframe src="' + sUrl + '" style="border:0;width:100%;height:100%;display:block" title="Material master mass upload"></iframe>',
        preferDOM: true
      });
    }
  });
});
