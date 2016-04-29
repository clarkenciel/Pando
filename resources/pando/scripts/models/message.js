var m = require('../mithril/mithril');
var X = module.exports = {};

X.new = function () {
  this.text = m.prop('');
  this.entryStart = m.prop(null);
};

X.send = function (socket, roomName, userName, coord, callBack) {
  return function (message) {
    if (message.text().length > 0) {
      var entryDuration = (Date.now() - message.entryStart()) * 0.00000000002,
          entryAvg = message.text().split("").length / entryDuration,
          out = JSON.stringify({
            "type": "message",
            "message": message.text,
            "userName": userName,
            "roomName": roomName,
            "frequency": 0,
            "coord": coord
          });
      socket.send(out);
      if (callBack) callBack(message.length, entryAvg, entryDuration);      
      message.text("");
      message.entryStart(null);
    };
  };
};
