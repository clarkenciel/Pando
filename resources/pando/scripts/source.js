/* REQUIRES THAT CRACKED BE INCLUDED IN HEAD OF HTML */

var m = require('./mithril/mithril');
var Views = require('./views/views.js');
var T = require('./tools.js');
var ST = require('./audio/utils.js');

var IMOBILE = T.any([/iPad/i, /iPod/i, /iPhone/i],
                    function (p) { return navigator.userAgent.match(p) != null; });

// 
// VIEW MODELS
var App =  {
  socket: null,
  room: null,
  reconnect: false,
  hasSound: false,
  soundCallback: null,
  errors: m.prop([])
};

var Room = function (roomName, userName) {
  this.name = m.prop(roomName || "");
  this.user = m.prop(userName || "");
  this.dimensions = m.prop([]);
  this.coord = m.prop([]);
  this.freq = m.prop(0);
  this.socket = m.prop(null);
  this.messages = m.prop([]);
  this.currentMessage = m.prop("");
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

var whenUserValid = function (room, success) {
  if (room.name() == "" || room.user() == "") {
    App.errors().push("Please provide both a room name and a user name");
  }
  else success();
};

var whenObserverValid = function (room, roomList, success) {
  var roomPopulated = !roomList.data().list.some(function (v) { return v.roomName == room.name(); });
  if (room.user() == "observer" && roomPopulated) {
    App.errors().push("You can only observe a room with at least one member");
  }
  else success();
};

// AUDIO
var resetAppSound = function (app) {
  T.when(app.killSoundCallback, app.killSoundCallback);
  app.hasSound = false;
  app.soundCallback = null;
  app.killSoundCallback = null;
  app.freq = 0;
};

var participantCallback = function (dat) {
  T.when(dat.newRoot, function () {
    if (dat.userName != App.room.user() && App.sound !== null) {
      App.room.freq(ST.coordToFrequency(dat.newRoot, App.room.dimensions(), App.room.coord()));
      cracked("participant").frequency(App.room.freq());
    };
  });
};

var participantKill = function () {
  cracked("participant").stop();
};

var observerCallback = function (dat) {
  console.log(dat);
  App.room.freq(dat.newRoot);
  if (dat.userName != App.room.name()) {
    cracked("#"+dat.userName).
      frequency(ST.coordToFrequency(App.room.freq, App.room.dimensions(), dat.coord));
  }
};

var observerKill = function () {
  cracked("observer").stop();
};

cracked.participantChain = function () {  
  cracked().
    begin("participant").
    sine(0).
    gain(0).
    end("participant");
  return cracked;
};

cracked.observerChain = function (id, freq, gain) {
  cracked().
    begin("observer", {'id': id}).
    sine({'id': id+'observerSine', 'frequency': freq}).
    gain({'id': id+'observerGain', 'gain': gain}).
    end("observer");
  return cracked;
};

// ROOM MODEL
Room.connect = function (room) {
  var socketAddr;
  socketAddr = 'ws://' + window.location.host + '/pando/api/connect/' + room.name() + '/' + room.user();
  
  App.socket = App.socket === null ? new WebSocket(socketAddr) : App.socket;
  
  App.socket.onopen = function (x) {
    console.log("socket opened");

    App.socket.onmessage = function (message) {
      var messages, dat = JSON.parse(message.data);
      
      App.room.messages().push(dat);
      m.redraw();
      messages = document.getElementById("messages");
      messages.scrollTop = messages.scrollHeight;
      T.when(App.soundCallback, function () { App.soundCallback(dat); });
    };
    
    App.socket.onerror = function (e) {
      App.socket = null;
      console.log(e);
      App.errors().push("Something went wrong when making a connection");
      App.socket.close();
      m.route("/pando");
    };
    
    App.socket.onclose = function (e) {
      App.socket = null;
      resetAppSound(App);
    };

    // move us to the room if we logged in via the landing page
    if (!m.route.param("roomName")) m.route("/pando/"+App.room.name());
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
    if (app.room.currentMessage().length > 0) {
      var out = {
        "message": app.room.currentMessage,
        "userName": app.room.user,
        "roomName": app.room.name,
        "frequency": 0,
        "coord": app.room.coord
      };    
      app.socket.send(JSON.stringify(out));
      app.room.currentMessage("");
    };
  };
};

Room.participantSoundSetup = function (app) {
  cracked().participantChain().dac();
  cracked("participant").start();

  return m.request({ method: "GET",
                     url: "/pando/api/rooms/info/"+app.room.name()+"/"+app.room.user() }).
    then(function (resp) {
      var freq = ST.coordToFrequency(resp.fundamental, resp.dimensions, resp.coord);
      cracked("participant").frequency(freq).volume(0.01);
            
      app.soundCallback = participantCallback;
      app.killSoundCallback = participantKill;
      app.hasSound = true;
      app.room.freq(freq);
      app.room.dimensions(resp.dimensions);
      app.room.coord(resp.coord);
      console.log(app);
    }).catch(function (e) {
      app.errors().push(e.message);
      resetAppSound(App);
      m.route("/pando");
    });
};

Room.observerSoundSetup = function (app) {
  return m.request({ method:"GET",
                     url: "/pando/api/rooms/info/users/"+app.room.name()}).
    then(function (resp) {
      for (var user in resp.users) {
        var freq = ST.coordToFrequency(resp.root, resp.dimensions, resp.users[user].coord);
        cracked().observerChain(user, freq).dac();
        cracked("observer").start();
      }
      app.soundCallback = observerCallback;
      app.killSoundCallback = observerKill;
      app.hasSound = true;
      app.freq(resp.root);
      app.room.dimensions(resp.dimensions);
      app.room.coord([0,0]);
      console.log("observer response", resp);
    }).catch(function (e) {
      console.log("observer error", e);
    });
};

// VIEWS
Room.conversation = {
  controller: function () {
    var body = document.getElementsByTagName("body")[0];
    body.classList.remove("auto_height");
    body.classList.add("full_height");

    // restore from storage
    if (App.room === null || typeof App.room === "undefined") {
      var roomName = sessionStorage.getItem('room-name'),
          userName = sessionStorage.getItem('user-name');

      if (m.route.param("roomName")) {
        App.room = new Room(m.route.param("roomName"), null);
        console.log("roomname from url, user null", App.room.name());
      }
      else if (roomName && userName) {
        console.log("restored room");
        App.room = new Room(roomName, userName);
      }
    };
    sessionStorage.clear();

    // store data if the page refreshes and allow reconnect
    window.onbeforeunload = function (e) {
      var navType = window.performance.navigation.type;
      console.log("navtype:", navType);
      if (navType == 1 || navType == 0) {
        sessionStorage.setItem('room-name', App.room.name());
        sessionStorage.setItem('user-name', App.room.user());
        console.log("refresh detected, stored:",
                    sessionStorage.getItem('room'));
      };
      App.socket.close();
      App.hasSound = false;
    };

    // handle back button navigation as a log out
    window.onpopstate = function (e) {
      console.log("Back navigation detected, logging out", e);
      App.reconnect = false;
      App.socket.close();
      App.hasSound = false;
      m.route("/pando");
    };
  },

  view: function (ctl) {    
    var view = [Views.room.errorDisplay(App)];
    if (!App.room.user()) {
      view.push(Views.room.onTheFlyJoin(App, function () {
        whenUserValid(App.room, function () {
          Room.connect(App.room);
        });
      }));
    }
    else {
      if (App.room.user() == "observer") {
        view.push(Views.room.observerView(App.room));
      }
      else {
        view.push(Views.room.participantView(App.room, Room.sendMessage(App)));
      }
      if (!App.hasSound) {
        view.push(
          m("div.container.popup",
            Views.room.audioPrompt(
              App,
              function () {
                if (App.room.user() == "observer")
                  Room.observerSoundSetup(App);
                else
                  Room.participantSoundSetup(App);
              },
              function () { m.route("/pando"); })));
      }
    }
    return m("div.container", view);
  }
};

var Index = {
  controller: function () {
    App.room = App.room || new Room();
    App.reconnect = false;
    this.rooms = new RoomList();
  },
  view: function (ctl) {
    var body = document.getElementsByTagName("body")[0];
    body.classList.remove("full_height");
    body.classList.add("auto_height");
    
    return m("div.container", [
      m("div#appTitle",
        m("div.title_text", m("p", "Pando")),
        m("div.medium_text", m("p", "a distributed, chat-oriented virtual installation"))),
      Views.room.errorDisplay(App),
      Views.room.formView(
        App.room, ctl.rooms,
        function (room, roomList) {
          whenUserValid(room, function () {
            whenObserverValid(room, roomList, function () {
              Room.connect(App.room);
              m.route("/pando/"+room.name());
            });
          });
        })
    ]);
  }
};

var target = document.getElementById('app');

m.route.mode = "pathname";

m.route(target, "/pando", {
  "/pando": Index,
  "/pando/:roomName": Room.conversation
});
