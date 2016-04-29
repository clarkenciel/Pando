var m = require('../mithril/mithril');
var X = module.exports = {};

// message
X.messageHandler = function (room, callback) {
  return function (message) {
    var messages, messageData = JSON.parse(message.data);

    if (dat.type == 'message')
      room.messages().push(messageData);
    else
      console.log('pingback!');
    m.redraw();
    
    messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;
    if (callback) callback(messageData);
  };
};
