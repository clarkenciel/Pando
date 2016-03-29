(document.addEventListener('DOMContentLoaded', function () {
  var App = App ? App : new Object();
  App.siteData = Utils.getSiteInfo(document.getElementById('main'));
  App.socket = null;
  App.send = function (m) {
    if (this.socket !== null) {
      this.socket.send(m);
    }
  };

  var displayArea = document.getElementById("messages");

  var messageBody = document.getElementById("message-area");
  var submitButton = document.getElementById("message-submit");

  var flushMessage = function () {
    var message = messageBody.value;
    messageBody.value = "";
    return message;
  };
  
  var sendMessage = function (message) {
    var out = {
      "message": message,
      "userName": App.siteData.userName,
      "roomName": App.siteData.roomName,
      "frequency": App.siteData.frequency
    };
    console.log("sending", out);
    App.send(JSON.stringify(out));
  };
  
  Utils.postJSONAjax("/connect",
                     {"user-name": App.siteData.user-name,
                      "room-name": App.siteData.room-name},
                     Utils.getSocketEndpoint(App, displayArea));

  submitButton.onclick = function () { sendMessage(flushMessage()); };
}));
  
