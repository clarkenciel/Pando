(document.addEventListener('DOMContentLoaded', function () {
  var siteData = Utils.getSiteInfo(document.getElementById('main'));
  var socket;
  
  Utils.postJSONAjax("/connect",
                     {"user-name": siteData.user-name,
                      "room-name": siteData.room-name},
                     function (x) {
                       var socketAddr = JSON.parse(x.responseText).socketAddress;
                       socket = new WebSocket(socketAddr);
                       console.log(socket);
                     });
}));
  
