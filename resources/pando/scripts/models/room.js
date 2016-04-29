var m = require('../mithril/mithril');
var X = module.exports = {};

X.room = function (data) {
  this.name = m.prop(data['room-name']);
  this.dimensions = m.prop(data.dimensions);
  this.root = m.prop(data.root);
};

X.get = function (roomName) {
  return m.request({
    method: "GET",
    url: '/pando/api/rooms/info/room/'+roomName,
    type: X.room
  });
};

X.list = function () {
  return m.request({
    method: "GET",
    url: "/pando/api/rooms/list",
    type: X.room
  });
};
