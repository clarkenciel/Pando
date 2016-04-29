var m = require('../mithril/mithril');
var SU = require('../audio/utils.js');
var X = module.exports = {};


X.message = function (room, user) {
  this.room = room;
  this.user = user;
  this.text = m.prop('');
  this.entryStart = m.prop(null);
};

X.list = function (room, user) {
  this.room = room;
  this.user = user;
  this.messages = m.prop([]);
};

// message
X.listHandler = function (list, callBack) {
  return function (message) {
    var messages, messageData = JSON.parse(message.data);

    if (messageData.type == 'message') {
      var user = 
      list.messages().push(new X.message(messageData.userName, );
    else
      console.log('pingback!');
    m.redraw();
    
    messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;
    if (callBack) callBack(messageData);
  };
};

X.send = function (socket, callBack) {
  return function (message) {
    if (message.text().length > 0) {
      var entryDuration = (Date.now() - message.entryStart()) * 0.00000000002,
          entryAvg = message.text().split("").length / entryDuration,
          out = JSON.stringify({
            "type": "message",
            "message": message.text,
            "userName": message.user.name,
            "roomName": message.room.name,
            "frequency": SU.coordToFrequency(message.room.root(), message.room.dimensions(), message.user.coord()),
            "coord": message.user.coord
          });
      socket.send(out);
      if (callBack) callBack(message.length, entryAvg, entryDuration);      
      message.text("");
      message.entryStart(null);
    };
  };
};
