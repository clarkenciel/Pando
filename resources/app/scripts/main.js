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

var displayError = function (error) {
  return m("div.error", error);
};

var displayErrors = function (model) {
  return m("div#notifications",
           { style: (function () {
             if (model.errors().length > 0) return "display: block";
             else return "display: none"; })()
           },
           model.errors().splice(0,model.errors().length).map(displayError));
};

var label = function (labelText, dataName) {
  return [m("br"),
          m("label", { for: dataName }, labelText),
          m("br")];
};

var button = function (buttonText, buttonCss, onClick) {
  return [m("div.button" + buttonCss,
            { onclick: onClick },
            buttonText),
         m("br")];
};

var textInput = function (labelName, dataName, attr) {
  return label(labelName, dataName).
    concat([m("input", { type: "text",
                         name: dataName,
                         oninput: m.withAttr("value", attr),
                         value: attr() })]);
};

var modelNameRadio = function (model) {
  return function (room) {
    console.log(room);
    return [m("div.roomRadio",
              m("input",
                { type: "radio",
                  name: "roomName",
                  onclick: m.withAttr("value", model.name),
                  value: room.roomName }),
              "Room: " + room.roomName + ", user count: " + room.userCount)];
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

  console.log(socketAddr);
  
  App.socket = new WebSocket(socketAddr);
  App.socket.onmessage = function (message) {
    App.room.messages().push(JSON.parse(message.data));
    m.redraw();
    var messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;    
  };
  App.socket.onopen = function (x) {
    m.route("/rooms/"+App.room.name());
  };
  App.socket.onerror = function (e) {
    App.socket = null;
    m.route("/");
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
  return m("div#roomFormHolder",
           m("form#roomForm",
             [textInput("User Name:", "userName", room.user),
              textInput("Create a new room ...", "roomName", room.name),
              label("... or select an existing room", "roomName"),
              roomList.data().list.map(modelNameRadio(room)),
              button("Connect", "#connect",
                     function () {
                       if (room.user() == "observer" &&
                           !roomList.data().list.some(function (v) {                             
                             return v.roomName == room.name(); })) {
                         room.errors().push("You can only observe a room with at least one member");
                         m.route("/");
                       }
                       else if (room.name() == "" || room.user() == "") {
                         room.errors().push("Please provide both a room name and a user name");
                         m.route("/");
                       }
                       else
                         Room.connect(room);
                     })]));
};

Room.renderMessage = function (message) {
  return m("div.message", [
    m("div.message.username", message.userName + ":"),
    m("div.message.body",
      m("p",message.message))]);
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
  },
  
  view: function (ctl) {
    if (App.room.user() != "observer") {
      return m("div.container",[
        m("div#messages", App.room.messages().map(Room.renderMessage)),
        m("div#messageForm", [
          m("form", [
            m("textarea#messageBody",
              { oninput: m.withAttr("value", App.room.currentMessage) },
              App.room.currentMessage()),
            button(m("div.imageHolder",
                     m("img[src='../img/send.svg']")),
                   "#messageSend", Room.sendMessage(App))])])]);
    }
    else
      return m("div.container",m("div#messages", App.room.messages().map(Room.renderMessage)));
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
      m("div#appTitle", "Pando"),
      displayErrors(App.room),
      Room.formView(App.room, ctl.rooms)]);      
  }
};

m.route(target, "/", {
  "/": Index,
  "/rooms/:roomName": Room.conversation
});
