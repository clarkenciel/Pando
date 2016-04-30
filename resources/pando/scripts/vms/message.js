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
    if (callback) callback(messageData);
  };
};

