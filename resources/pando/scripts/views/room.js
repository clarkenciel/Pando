var m = require('../mithril/mithril');
var common = require('./common');
var exports = module.exports = {};

exports.renderMessage = function (thisUser) {
  return function (message) {
    var userDiv, messageUser = message.userName;
    console.log(thisUser, messageUser);
    if (thisUser == messageUser)
      userDiv = m("div.message.username.medium_text.this_user", messageUser + ":");
    else
      userDiv = m("div.message.username.medium_text", messageUser + ":");
    return m("div.message",
             [userDiv,
              m("div.message.body.small_text",
                m("p",message.message))]);
  };
};

exports.participantView = function (ctl, formCallback) {
  return m("div.container",[
    m("div#messages", ctl.messages().map(exports.renderMessage(ctl.user()))),
    m("div#messageForm", [
      m("form", [
        m("textarea#messageBody.medium_text",
          { oninput: m.withAttr("value", ctl.currentMessage) },
          ctl.currentMessage()),
        common.button(m("div.imageHolder",
                        m("img[src='/pando/img/send.svg']")),
                      "#messageSend", formCallback)])])]);
};

exports.observerView = function (ctl) {
  return m("div.container",m("div#messages", ctl.messages().map(exports.renderMessage)));
};

exports.formView = function (room, roomList, connectCallback) {
  return m("div#roomFormHolder",
           m("form#roomForm",
             [common.textInput("User Name:", "userName", room.user),
              common.textInput("Create a new room ...", "roomName", room.name),
              common.label("... or select an existing room", "roomName"),
              roomList.data().list.map(common.modelNameRadio(room)),
              common.button("Connect", "#connect", function () {connectCallback(room, roomList);})]));
};
