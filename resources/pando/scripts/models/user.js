var m = require('../mithril/mithril');
var X = module.exports = {};

X.user = function (data) {
  this.name = m.prop(data.userName);
  this.coord = m.prop(data.coord);
  this.frequency = m.prop(data.frequency);
};

X.get = function (roomName, userName) {
  return m.request({
    method: "GET",
    url: '/pando/api/rooms/info/user/'+roomName+'/'+userName,
    type: X.user
  });
};

X.list = function (roomName) {
  return m.request({
    method: 'GET',
    url: '/pando/api/rooms/info/users/'+roomName,
    type: X.user
  });
};
