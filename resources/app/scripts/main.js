var m = require('mithril');
//var rooms = require('./components/room');
var target = document.getElementById('app');

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

var Room = function (roomName, userName) {
  this.name = m.prop(roomName || "");
  this.user = m.prop(userName || "");
  this.socket = m.prop(null);
  this.errors = m.prop([]);
};

Room.join = function (room) {
  m.request({ method: "POST",
              url: "/api/rooms/join",
              data: { "room-name": room.name(),
                      "user-name": room.user() }}).
    then(function (data) {      
      var redirect = "/rooms/" + data.roomName + "/" + data.userName;
      m.route(redirect);
    }).
    catch(function (error) {
      room.errors().push(error.message);
    });
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
                      { onclick: function () { Room.join(room); }},
                     "Join"))));
};

Room.conversation = {
  controller: function () {
    this.room = new Room(m.route.param("roomName"),
                         m.route.param("userName"));
    console.log("Room.conversation ", this.room.name(), this.room.user());
  },
  view: function (ctl) {
    return m("h1", "hi " + ctl.room.user() + "!");
  }
};

var Index = {
  controller: function () {
    this.rooms = new RoomList();
    this.room = new Room();
    console.log("Index controller ", this.rooms);
  },
  view: function (ctl) {
    return m("div.container", [
      displayErrors(ctl.room),
      Room.formView(ctl.room, ctl.rooms)]);      
  }
};

m.route(target, "/", {
  "/": Index,
  "/rooms/:roomName/:userName": Room.conversation
});
