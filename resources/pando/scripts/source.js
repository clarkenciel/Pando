/* REQUIRES THAT CRACKED BE INCLUDED IN HEAD OF HTML */

var m = require('./mithril/mithril');
var Views = require('./views/views.js');
var T = require('./tools.js');
var ST = require('./audio/utils.js');

var IMOBILE = T.any([/iPad/i, /iPod/i, /iPhone/i],
                    function (p) { return navigator.userAgent.match(p) != null; });

// Structs
var App =  {
  socket: null,
  room: null,
  reconnect: false,
  hasSound: false,
  soundCallback: null,
  soundParams: null,
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
  this.entryStart = m.prop(null);
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

var ParticipantParams = function () {
  this._maxInterval = 15000;
  this._minInterval = 100;
  this._maxDelay = 5;
  this._minDelay = 0.1;
  this._maxDecay = 0.25;
  this._minDecay = 0.0125;
  this._maxEntropy = 1.0;
  this._minEntropy = 0.0;
  this._entropyDecayRate = Math.random() * 0.08;
  this._entropy = 0.5;

  this._interval = this._minInterval;
  this._delay = this._minDelay;
  this._decay = this._minDecay;

  // entropy gradually lessens
  this.entropy = function (amt) {
    return typeof amt === 'undefined' ? this.getEntropy() : this.setEntropy(amt);
  };
  
  this.getEntropy = function () {
    var out = Math.ceil((Math.random() - 1.0) + this._entropy);    
    this._entropy *= 1.0 - this._entropyDecayRate;
    if (this._entropy < this._minEntropy) this._entropy = this._minEntropy;
    return out;
  };

  this.setEntropy = function (amt) {
    this._entropy = amt > this._maxEntropy ? this._maxEntropy : amt;
    return this;
  };

  this.interval = function (newInterval) {
    return typeof newInterval === 'undefined' ? this.getInterval() : this.setInterval(newInterval);
  };

  // interval gradually lengthens
  this.getInterval = function () {
    this._interval = this._interval * 1.1 > this._maxInterval ? this._maxInterval : this._interval * 1.1;
    return this._interval;    
  };

  this.setInterval = function (amt) {
    if (amt > this._maxInterval) this._interval = this._maxInterval;
    else if (amt < this._minInterval) this._interval = this._minInterval;
    else this._interval = amt;
    return this;
  };

  this.delay = function (newDelay) {
    return typeof newDelay === 'undefined' ? this.getDelay() : this.setDelay(newDelay);
  };

  // delay gradually lengthens
  this.getDelay = function () {
    this._delay = this._delay * 1.1 > this._maxDelay ? this._maxDelay : this._delay * 1.1;
    return this._delay;
  };

  this.setDelay = function (amt) {
    if (amt > this._maxDelay) this._delay = this._maxDelay;
    else if (amt < this._minDelay) this._delay = this._minDelay;
    else this._delay = amt;
    return this;
  };
  
  this.decay = function (newDecay) {
    return typeof newDecay === 'undefined' ? this.getDecay() : this.setDecay(newDecay);
  };

  this.setDecay = function (amt) {
    if (amt > this._maxDecay) this._decay = this._maxDecay;
    else if (amt < this._minDecay) this._decay = this._minDecay;
    else this._decay = amt;
    return this;
  };

  // decay gradually lengthens
  this.getDecay = function () {
    this._decay = this._decay * 1.01 > this._maxDecay ? this._maxDecay : this._decay * 1.01;
    return this._decay;
  };
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
    console.log(dat.userName, App.room.user());
    if (dat.userName != App.room.user() && App.sound !== null) {
      App.room.freq(ST.coordToFrequency(dat.newRoot, App.room.dimensions(), App.room.coord()));
      cracked('noiseChain').frequency(App.room.freq());
      cracked.loop('stop').loop({steps:2,interval:App.soundParams.interval()}).loop('start');
    };
  });
};

var participantKill = function () {
  cracked('*').stop();
};

var observerCallback = function (dat) {
  console.log(dat);
  App.room.freq(dat.newRoot);
  if (dat.userName != App.room.name()) {
    cracked("#"+dat.userName).
      frequency(ST.coordToFrequency(App.room.freq(), App.room.dimensions(), dat.coord));
  }
};

var observerKill = function () {
  cracked('*').stop();
};

cracked.participantChain = function (opts) {
  cracked().begin("participant").sine(0).end("participant");
      
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
  var socketAddr = 'ws://' + window.location.host + '/pando/api/connect/' + room.name() + '/' + room.user();

  console.log('connect');
  App.socket = App.socket === null ? new WebSocket(socketAddr) : App.socket;
  App.socket.onerror = function (e) {
    App.socket.close();
    App.socket = null;
    console.log("error:", e);
    App.errors().push('The user name <'+App.room.user()+'> is taken, please choose a different user name.');
    m.route(room.name());
  };

  App.socket.onclose = function (e) {
    console.log("closing socket", e);
    Room.connect(room);
    App.socket = null;
    //resetAppSound(App);
  };
  
  App.socket.onopen = function (x) {
    if (App.socketTimeout !== null && typeof App.socketTimeout !== 'undefined' )
      window.clearTimeout(App.socketTimeout);
    App.socketTimeout = window.setTimeout(Room.ping(App), 5000);
    console.log("socket opened");

    // move us to the room if we logged in via the landing page
    m.route('/pando/'+App.room.name()+'/'+App.room.user());

    
    App.socket.onmessage = function (message) {
      var messages, dat = JSON.parse(message.data);

      if (dat.type != 'ping')
        App.room.messages().push(dat);
      console.log('received type', dat.type);
      m.redraw();
      messages = document.getElementById("messages");
      messages.scrollTop = messages.scrollHeight;
      T.when(App.soundCallback, function () { App.soundCallback(dat); });
    };    
  };
};

Room.quit = function (room) {
  return m.request({ method: "DELETE",
                     url: "/pando/api/quit",
                     data: { "user-name": room.user(),
                             "room-name": room.name() }}).
    then(function () {
      console.log("successfully logged out");
      App.socket = null;
      App.room = null;
      m.route(m.route().split('/').slice(0,-1).join('/'));
      m.redraw();
    }).
    catch(function (e) { console.log("log out error:", e.message); });
};

Room.sendMessage = function (app) {
  return function () {
    var message = app.room.currentMessage();
    if (message.length > 0) {
      var entryDuration = (Date.now() - app.room.entryStart()) * 0.00000000002,
          entryAvg = message.split("").length / entryDuration,
          out = JSON.stringify({
            "type": "message",
            "message": message,
            "userName": app.room.user,
            "roomName": app.room.name,
            "frequency": 0,
            "coord": app.room.coord
          });
      
      console.log('message out', out);
      app.socket.send(out);
      app.soundParams.entropy(entryAvg);
      app.soundParams.interval(entryAvg);
      app.soundParams.decay(0);
      app.soundParams.delay(0);
      cracked.loop('stop').
        loop({steps:2,interval:app.soundParams.interval()}).
        loop('start');
      console.log(entryAvg);
      console.log(app.soundParams);
      app.room.currentMessage("");
      app.room.entryStart(null);
    };
  };
};

Room.ping = function (app) {
  return function () {
    if (app.socket) {
      console.log("ping");
      var out = JSON.stringify({
        "type": "ping",
        "userName": app.room.user,
        "roomName": app.room.name      
      });
      app.socket.send(out);    
      app.socketTimeout =  window.setTimeout(Room.ping(app), 5000);
    }
  };
};

cracked.noiseChain = function (opts) {
  cracked.begin('noiseChain').
    sine({id:opts.id,frequency:opts.frequency}).
    gain({'gain':opts.gain}).
    end('noiseChain');
  return cracked;
};

Room.participantSoundSetup = function (app) {
  
  app.soundParams = new ParticipantParams();
  
  cracked().
    noiseChain({id:'participant',frequency:0,q:200,gain:0.4}).
    adsr({id:'notes'}).
    gain({id:'master', gain:0}).
    dac();
  cracked('#notes').
    comb({id:'masterDelay',delay: app.soundParams.delay()}).
    connect('#master');
  cracked('*').start();
  
  cracked.loop({steps:2,interval:app.soundParams.interval()});
  cracked("sine,adsr").bind("step", function (index, data, array) {
    var freq,
        env = [0.0125,app.soundParams.decay(),0.1,0.1];

    // adjust frequency
    if (app.soundParams.entropy()) {
      freq = ST.coordToFrequency(app.room.freq(),
                                 app.room.dimensions(),
                                 app.room.coord().map(function (c) {
                                   return c + cracked.random(-3,3);
                                 }));
    }
    else {
      freq = app.room.freq();
    }    
    cracked('noiseChain').frequency(freq);

    // adjust delay
    cracked('#masterDelay').attr({delay: app.soundParams.delay()});
    cracked('#notes').adsr('trigger',env);

    // adjust interval
    cracked.loop('stop').loop({steps:2,interval:app.soundParams.interval()}).loop('start');
  }, [1,0]);

  return m.request({ method: "GET",
                     url: "/pando/api/rooms/info/"+app.room.name()+"/"+app.room.user() }).
    then(function (resp) {
      console.log("info response",resp);
      if (!app.hasSound) {
        var freq = ST.coordToFrequency(resp.fundamental, resp.dimensions, resp.coord);
        cracked("#participant").frequency(freq);
        cracked('#master').ramp(0.5,0.1,'gain',0.0);
        cracked.loop("start");
        
        app.soundCallback = participantCallback;
        app.killSoundCallback = participantKill;
        app.hasSound = true;
        app.room.freq(freq);
        app.room.dimensions(resp.dimensions);
        app.room.coord(resp.coord);
      }
      console.log(app);
    }).catch(function (e) {
      app.errors().push(e.message);
      resetAppSound(App);
      m.route("/pando");
    });
};

Room.observerSoundSetup = function (app) {

  cracked('*').start();
  
  return m.request({ method:"GET",
                     url: "/pando/api/rooms/info/users/"+app.room.name()}).
    then(function (resp) {
      var freq;
      for (var user in resp.users) {
        freq = ST.coordToFrequency(resp.root, resp.dimensions, resp.users[user].coord);
        cracked().observerChain(user, freq, 0.3).dac();
        cracked("observer").start();
      }
      app.soundCallback = observerCallback;
      app.killSoundCallback = observerKill;
      app.hasSound = true;
      app.room.freq(resp.root);
      app.room.dimensions(resp.dimensions);
      app.room.coord([0,0]);
      console.log("observer response", resp);
    }).catch(function (e) {
      console.log("observerx error", e);
    });
};

Room.fetch = function (item) {
  if (sessionStorage.getItem(item))
    return sessionStorage.getItem(item);
  else if (m.route.param(item) != '')
    return m.route.param(item);
  else
    return null;
};

// VIEWS
Room.conversation = {
  controller: function () {
    var body = document.getElementsByTagName("body")[0],
        roomName = Room.fetch('roomName'),
        userName = Room.fetch('userName');
    sessionStorage.clear();
    App.room = new Room(roomName, userName);   
    body.classList.remove("auto_height");
    body.classList.add("full_height");

    // store data if the page refreshes and allow reconnect
    window.onbeforeunload = function (e) {
      Room.quit(App.room).then(function () {
        var navType = window.performance.navigation.type;
        if (navType == 1) {
          sessionStorage.setItem('roomName', App.room.name());
          sessionStorage.setItem('userName', App.room.user());
          console.log("refresh detected, stored:", App.room.name(), App.room.user());                    
        };
        App.socket.close();
        
        cracked().loop('stop');
        cracked('*').stop();
        App.hasSound = false;
      });
    };

    // handle back button navigation as a log out
    window.onpopstate = function (e) {
      console.log("Back navigation detected, logging out", e);
      sessionStorage.setItem('roomName', App.room.name());
      sessionStorage.setItem('userName', App.room.user());
      Room.quit(App.room);
      App.reconnect = false;
      App.socket.close();
      App.socket = null;
      cracked().loop('stop');
      cracked('*').stop();
      App.hasSound = false;
      m.route("/pando");
    };
  },

  view: function (ctl) {
    var view = [Views.room.errorDisplay(App)];
    if (!App.socket) {
      Room.connect(App.room);
    } else if (App.socket.readyState == 1) {
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
              function () {
                console.log("app", App.room.name(), App.room.user());
                Room.quit(App.room);
              })));
      }
    }
    return m("div.container", view);
  }
};

var OnTheFly = {
  controller: function () {
    var roomName = Room.fetch('roomName'),
        userName = Room.fetch('userName');
    sessionStorage.clear();
    App.room = new Room(roomName, userName);
  },
  view: function (ctl) {
    var view = [Views.room.errorDisplay(App)];
    if (App.room.user()) {
      Room.connect(App.room);
    }
    else {
      view.push(Views.room.onTheFlyJoin(App, function () {
        whenUserValid(App.room, function () {
          Room.connect(App.room);
        });
      }));
    }
    
    return m("div.container", view);
  }
};

var Index = {
  controller: function () {    
    App.reconnect = false;
    App.room = App.room ? App.room : new Room();
    console.log(App.room.name(), App.room.user());
    this.rooms = new RoomList();
  },
  view: function (ctl) {
    var body = document.getElementsByTagName("body")[0];
    body.classList.remove("full_height");
    body.classList.add("auto_height");
    console.log(App);
    
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
              console.log("room", room);
              Room.connect(room);
            });
          });
        })
    ]);
  }
};

var target = document.getElementById('app');

m.route.mode = "pathname";

m.route(target, "/pando", {
    "/pando": Index  
  , "/pando/:roomName": OnTheFly
  , "/pando/:roomName/:userName": Room.conversation
});
