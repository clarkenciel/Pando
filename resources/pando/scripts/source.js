var m = require('./mithril/mithril');
var Sound = require('./audio/sound.js');
var Room = function (roomName, userName) {
  this.name = m.prop(roomName || "");
  this.user = m.prop(userName || "");
  this.socket = m.prop(null);
  this.errors = m.prop([]);
  this.messages = m.prop([]);
  this.currentMessage = m.prop("");
};
var Views = require('./views/views.js');

var App =  {
  socket: null,
  room: null,
  reconnect: false,
  sound: null
};

var RoomList = function () {
  var self = this;
  this.data = m.request({ method: "GET", url: "/pando/api/rooms/list" }).
    then(function (data) {      
      return {
        count: data.roomCount,
        list: data.rooms
      };
    });
};

Room.connect = function (room) {
  var socketAddr;
  socketAddr = 'ws://' + window.location.host + '/pando/api/connect/' + room.name() + '/' + room.user();
  console.log("socket address:", socketAddr);
  
  App.socket = new WebSocket(socketAddr);
  console.log(App.socket);
  App.socket.onmessage = function (message) {
    var dat = JSON.parse(message.data);
    App.room.messages().push(dat);
    m.redraw();
    var messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;
    if (dat.userName != App.room.user())
      App.sound.updateFreq(dat.newRoot);
  };
  App.socket.onopen = function (x) {
    console.log(x);
    m.route("/pando/rooms/"+App.room.name());
    Room.makeSound(App).
      then(function () {
        App.sound.start();
        console.log("starting", App.sound);
      });
  };
  App.socket.onerror = function (e) {
    App.socket = null;
    m.route("/pando");
  };
  App.socket.onclose = function (e) {
    App.socket = null;
    if (App.sound != null)
      App.sound.stop();
  };
};

Room.quit = function (room) {
  m.request({ method: "DELETE",
              url: "/pando/api/quit",
              data: { "user-name": room.user(),
                      "room-name": room.name() }}).
    then(function () { console.log("successfully logged out"); }).
    catch(function (e) { console.log("log out error:", e.message); });
};

Room.sendMessage = function (app) {
  return function () {
    var out = {
      "message": app.room.currentMessage,
      "userName": app.room.user,
      "roomName": app.room.name,
      "frequency": 0
    };    
    app.socket.send(JSON.stringify(out));
    app.room.currentMessage("");
  };
};

Room.makeSound = function (app) {
  return m.request({ method: "GET",
                     url: "/pando/api/rooms/info/"+app.room.name()+"/"+app.room.user() }).
    then(function (resp) {
      app.sound = new Sound(resp.fundamental, resp.dimensions, resp.coord);
    }).catch(function (e) {
      console.log("make sound error", e);
    });
};

Room.conversation = {
  controller: function (roomName) {

    console.log("roomName:", roomName);

    // store data if the page refreshes and allow reconnect
    window.onbeforeunload = function (e) {
      var navType = window.performance.navigation.type;
      console.log("navtype:", navType);
      if (navType == 1 || navType == 0) {
        sessionStorage.setItem('room-name', App.room.name());
        sessionStorage.setItem('user-name', App.room.user());
        console.log("refresh detected, stored:", sessionStorage.getItem('room'));
      };
    };

    // handle back button navigation as a log out
    window.onpopstate = function (e) {
      console.log("Back navigation detected, logging out", e);      
      App.reconnect = false;
      App.socket.close();
      m.route("/pando");
    };
    
    // restore from storage
    if (App.room === null || typeof App.room === "undefined") {
      var storedRoom = new Room(sessionStorage.getItem('room-name'),
                                sessionStorage.getItem('user-name'));
      console.log("stored room", storedRoom);                                  
      if (storedRoom !== null) {
        App.room = storedRoom;
      }
      else {
        m.route("/pando");
      };
    };
    if (App.socket === null || typeof App.socket === "undefined") {
      Room.connect(App.room);
    };
    sessionStorage.clear();
  },
  
  view: function (ctl) {
    if (App.room.user() == "observer")
        return Views.room.observerView(App.room);  
    else
      return Views.room.participantView(App.room, Room.sendMessage(App));    
  }
};

var Index = {
  controller: function () {    
    App.room = App.room || new Room();
    App.reconnect = false;
    if (App.sound !== null && App.sound.isStarted)
      App.sound.stop();
    this.rooms = typeof this.rooms === "undefined" ? new RoomList() : this.rooms;
    console.log("Index controller ", this.rooms);
  },
  view: function (ctl) {
    return m("div.container", [
      m("div#appTitle.title_text", "Pando"),
      Views.common.displayErrors(App.room),
      Views.room.formView(App.room, ctl.rooms,
                          function (room, roomList) {
                            console.log("connect callback");
                            if (room.user() == "observer" &&
                                !roomList.data().list.some(function (v) {                             
                                  return v.roomName == room.name(); })) {
                              room.errors().push("You can only observe a room with at least one member");
                              m.route("/pando");
                            }
                            else if (room.name() == "" || room.user() == "") {
                              room.errors().push("Please provide both a room name and a user name");
                              m.route("/pando");
                            }
                            else {
                              console.log("successful connect request");
                              Room.connect(room);
                            };
                          })]);      
  }
};

var target = document.getElementById('app');

m.route.mode = "pathname";

m.route(target, "/pando", {
  "/pando": Index,
  "/pando/rooms/:roomName": Room.conversation
});
