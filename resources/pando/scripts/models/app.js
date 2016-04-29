var Room = require('room');
var User = require('user');
var m = require('../mithril/mithril');
var X = module.exports = {};

X.new = function ()  {
  this.socket = null;
  this.room = null;
  this.user = null;
  this.hasSound = false;
  this.soundCallback = null;
  this.soundParams = null;
  this.errors = m.prop([]);
};

//close
X.socketCloseHandler = function (app) {  
  return function (e) {
    console.log("closing socket", e);
    try { Room.quit(app.room); }
    catch (e) { console.log('closing error', e); }
    finally { app.socket = null; }
  };
};

//open
X.socketOpenHandler = function (destination) {
  return function (e) { m.route(destination); };
};

//error
X.sockectErrorHandler = function (app) {
  return function (e) {
    console.log("error: ", e);
    app.socket.close();

    if (errorLog)
      errorLog.errors().
      push('The user name "'+app.user.name()+'" has been taken, please choose a different user name.');    
    m.route('/pando/'+app.room.name());
  };
};

// leaving chat room
X.quit = function (app) {
  console.log('logging out', app.room.name(), app.user.name());
  m.request({ method: "DELETE",
              url: "/pando/api/quit",
              data: { "user-name": app.room.user(),
                      "room-name": app.user.name() }});
};

// altering sounds when sending a message
X.messageSoundCallback = function () {
  return function (messageLength, entryDuration, wpm) {
    if (messageLength === 0) messageLength = 1;
    app.soundParams.
      entropy(wpm).
      interval(wpm).
      decay(0).
      delay(1 / messageLength);
    cracked.loop('stop').
      loop({steps:2,interval:app.soundParams.interval()}).
      loop('start');
  };
};


