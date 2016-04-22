var m = require('../mithril/mithril');
var common = require('./common');
var exports = module.exports = {};

exports.renderMessage = function (thisUser) {
  return function (message) {
    var userDiv, messageUser = message.userName;

    if (thisUser == messageUser)
      userDiv = m("div.message.username.medium_text.this_user", messageUser + ":");
    else
      userDiv = m("div.message.username.medium_text", messageUser + ":");
    return m("div.message",
             [userDiv,
              m("div.message.body.small_text",
                message.message.split("\n").map(function (l) { return m("p", l); }))]);
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
  return m("div#messages", ctl.messages().map(exports.renderMessage(ctl.user())));
};

exports.formView = function (room, roomList, connectCallback) {
  return m("div#roomFormHolder.interactionHolder",
           m("form#roomForm",
             [common.textInput("User Name:", "userName", room.user),
              m("br"),
              common.textInput("Create a new room ...", "roomName", room.name),
              m("br"),
              common.label("... or select an existing room", "roomName"),
              m("br"),
              roomList.data().list.map(common.modelNameRadio(room)),
              m("br"),
              common.button("Connect", "#connect", function () {connectCallback(room, roomList);})]));
};

exports.audioPrompt = function (app, enableCallback, cancelCallback) {
  return m("div.popup.interactionHolder",
           [m("p.medium_text", "You need to enable web audio to continue"),
            m("div.buttonRow",
              [m("button.button",
                 { onclick: function () { return enableCallback(); } },
                 "Enable"),
               m("button.button",
                 { onclick: function () { return cancelCallback(); } },
                 "Cancel & Leave")])]);
};
                
exports.onTheFlyJoin = function (app, clickCallback) {
  return m("div#roomFormHolder.interactionHolder",
           [common.textInput("User name:", "userName", app.room.user),
            m("br"),
            common.button("Join", "#connect", function () {
              m.redraw.strategy("none");
              clickCallback(); })]);
};
