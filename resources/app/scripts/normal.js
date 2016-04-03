document.addEventListener('DOMContentLoaded', function () {

  var updateFrequency = function (app, newRoot) {
    return Utils.coordToFrequency(
      newRoot,
      app.siteData.dimensions,
      app.siteData.coord);
  };

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
    
    App.send(JSON.stringify(out));
  };

  var messageResponse = function (message) {
    message = JSON.parse(message.data);
    Utils.insertMessage(displayArea, message);
    if (message.userName != App.siteData.userName) {
      App.siteData.frequency = updateFrequency(App, message.newRoot);
      sound.setFrequency(
        Utils.coordToFrequency(
          App.siteData.frequency,
          App.siteData.dimensions,
          App.siteData.coord));
      if (!sound.playing) sound.play();
    };
  };

  var App = App ? App : new Object();
  App.siteData = Utils.getSiteInfo(document.getElementById('main'));
  App.siteData.frequency =  Utils.coordToFrequency(
    App.siteData.root,
    App.siteData.dimensions,
    App.siteData.coord);
  App.socket = Utils.getSocket(messageResponse);
  App.send = function (m) {
    if (App.socket != null) {
      App.socket.send(m);
    };
  };
  
  var sound = new Sound(App.siteData.frequency, 0.1);
  var displayArea = document.getElementById("messages");
  var messageBody = document.getElementById("message-area");
  var submitButton = document.getElementById("message-submit");
  console.log(App.siteData);
  console.log(sound);
  console.log(App.socket);

  submitButton.onclick = function () { sendMessage(flushMessage()); };
  if (!sound.playing) sound.play();
});
