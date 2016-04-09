var target = document.getElementById('app');

var Room = function (roomName, userName) {
  return {
    name: m.prop(roomName || ""),
    user: m.prop(userName || ""),
    socket: m.prop(null),
    errors: m.prop([]),
    messages: m.prop([]),
    currentMessage: m.prop("")
  };
};

var App =  {
  socket: null,
  room: null,
  reconnect: false
};

var makeElement = function (ele, label) {
  return function (x) { return m(ele, label + x); };
};

var displayError = function (error) {
  return m("div.error", error);
};

var displayErrors = function (model) {
  return m("div#messages",
           { style: (function () {
             if (model.errors().length > 0) return "display: block";
             else return "display: none"; })()
           },
           model.errors().splice(0,model.errors().length).map(displayError));
};

var modelNameRadio = function (model) {
  return function (room) {
    console.log(room);
    return m("div.roomRadio",
             m("input",
               { type: "radio",
                 name: "roomName",
                 onclick: m.withAttr("value", model.name),
                 value: room.roomName }),
             "Room: " + room.roomName + ", user count: " + room.userCount);
  };
};

var RoomList = function () {
  var self = this;
  this.data = m.request({ method: "GET", url: "/api/rooms/list" }).
    then(function (data) {
      console.log("RoomList constructor ", data.rooms);
      return {
        count: data.roomCount,
        list: data.rooms
      };
    });
};

Room.connect = function (room) {
  var socketAddr;
  if (!App.reconnect)
    socketAddr = 'ws://' + window.location.host + '/api/connect/' + room.name() + '/' + room.user();
  else
    socketAddr = 'ws://' + window.location.host + '/api/reconnect/' + room.name() + '/' + room.user();
  App.socket = new WebSocket(socketAddr);
  App.socket.onmessage = function (message) {
    App.room.messages().push(JSON.parse(message.data));
    m.redraw();
    console.log("socket callback ", message, App.room.messages());
  };
  App.socket.onclose = function (x) {
    console.log("closing socket", x);
  };
  App.socket.onerror = function (e) {
    console.log("socket error", e);
    App.room.errors().push(e.message);
    m.route("/");
  };
  App.socket.onopen = function (x) {
    console.log("open socket", x);
    m.route("/rooms/"+App.room.name());
  };
};

Room.quit = function (room) {
  m.request({ method: "DELETE",
              url: "/api/quit",
              data: { "user-name": room.user(),
                      "room-name": room.name() }}).
    then(function () { console.log("successfully logged out"); }).
    catch(function (e) { console.log("log out error:", e.message); });
};

Room.formView = function (room, roomList) {
  return m("div#roomForm",
           m("form", [
             m("label", { for: "userName" }, "User Name:"),
             m("input", { type: "text",
                          name: "userName",
                          oninput: m.withAttr("value", room.user),
                          value: room.user() }),
             m("br"),
             m("label", { for: "roomName" }, "Create a new room ..."),
             m("input", { type: "text",
                          name: "roomName",
                          oninput: m.withAttr("value", room.name),
                          value: room.name() }),
             m("br"),
             m("label", { for: "roomName" }, "... or select an existing room"),
             m("br")].
             concat(roomList.data().list.map(modelNameRadio(room))).
             concat(m("br")).
             concat(m("div#button",
                      { onclick: function () { Room.connect(room); }},
                     "Connect"))));
};

Room.renderMessage = function (message) {
  return m("div.message", [
    m("div.message.username", message.userName),
    m("div.message.body", message.message)]);
};

Room.conversation = {
  controller: function () {

    // store data if the page refreshes and allow reconnect
    window.onbeforeunload = function (e) {
      var navType = window.performance.navigation.type;
      console.log("navtype:", navType);
      if (navType == 1 || navType == 0) {
        sessionStorage.setItem('room-name', App.room.name());
        sessionStorage.setItem('user-name', App.room.user());
        sessionStorage.setItem('reconnect', JSON.stringify(true));
        console.log("refresh detected, stored:", sessionStorage.getItem('room'));
      };
    };

    // handle back button navigation as a log out
    window.onpopstate = function (e) {
      console.log("Back navigation detected, logging out", e);      
      App.reconnect = false;
      App.socket.close();
      m.route("/");
    };
    
    // restore from storage
    if (App.room === null || typeof App.room === "undefined") {
      var storedRoom = new Room(sessionStorage.getItem('room-name'),
                                sessionStorage.getItem('user-name'));
      App.reconnect = JSON.parse(sessionStorage.getItem('reconnect'));
      console.log("sored room", storedRoom);                                  
      if (storedRoom !== null) {
        App.room = storedRoom;
      }
      else {
        m.route("/");
      };
    };
    if (App.socket === null || typeof App.socket === "undefined")
      Room.connect(App.room);
    sessionStorage.clear();
    console.log(App);
  },
  
  view: function (ctl) {
    return m("div.container",[
      m("div#messages", App.room.messages().map(Room.renderMessage)),
      m("div#messageForm", [
        m("form", [
          m("textarea#messageBody",
            { oninput: m.withAttr("value", App.room.currentMessage) },
            App.room.currentMessage()),
          m("div.button",
            {onclick: function () {
              var out = {
                "message": App.room.currentMessage,
                "userName": App.room.user,
                "roomName": App.room.name,
                "frequency": 0
              };    
              App.socket.send(JSON.stringify(out));
              App.room.currentMessage("");
            }},
            "Send")])])]);
  }
};

var Index = {
  controller: function () {    
    App.room = App.room || new Room();
    App.reconnect = false;
    this.rooms = new RoomList();
    console.log("Index controller ", this.rooms);
  },
  view: function (ctl) {
    return m("div.container", [
      displayErrors(App.room),
      Room.formView(App.room, ctl.rooms)]);      
  }
};

m.route(target, "/", {
  "/": Index,
  "/rooms/:roomName": Room.conversation
});
