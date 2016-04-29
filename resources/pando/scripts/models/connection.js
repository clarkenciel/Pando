var m = require('../mithril/mithril');
var TO = require('timeout');
var X = module.exports = {};

X.ping = function (timeoutStore, socket, timeout, roomName, userName) {
  return function () {
    if (socket) {
      var out = JSON.stringify({
        "type": "ping",
        "userName": userName,
        "roomName": roomName      
      });
      socket.send(out);
      TO.setTimeout(timeoutStore, TO.genKey(roomName, userName), timeout, X.ping);
    }
  };
};

X.connect = function (roomName, userName, pingTimeout,
                      openCallback, closeCallback, errorCallback, messageCallback) {
  if (typeof pingTimeout === 'undefined') pingTimeout = 1000;
  
  var socketAddr = 'ws://' + window.location.host + '/pando/api/connect/' + room.name() + '/' + room.user(),
      socket = new WebSocket(socketAddr);
  
  socket.onerror = errorCallback;    

  socket.onclose = closeCallback;

  socket.onopen = function (e) {
    console.log('starting socket open', roomName, userName);
    socket.onmessage = messageCallback;
    openCallback(e);
    console.log('socket opened');
  };

  return socket;
};
