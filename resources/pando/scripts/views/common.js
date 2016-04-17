var m = require('../mithril/mithril');
var exports = module.exports = {};

exports.displayError = function (error) {
  return m("div.error", error);
};

exports.displayErrors = function (model) {
  return m("div#notifications",
           { style: (function () {
             if (model.errors().length > 0) return "display: block";
             else return "display: none"; })()
           },
           model.errors().splice(0,model.errors().length).map(exports.displayError));
};

exports.label = function (labelText, dataName) {
  return [m("br"),
          m("label.big_text", { for: dataName }, labelText),
          m("br")];
};

exports.button = function (buttonText, buttonCss, onClick) {
  return [m("div.button" + buttonCss,
            { onclick: onClick },
            buttonText),
         m("br")];
};

exports.textInput = function (labelName, dataName, attr) {
  return exports.label(labelName, dataName).
    concat([m("input.big_text", { type: "text",
                                  name: dataName,
                                  oninput: m.withAttr("value", attr),
                                  value: attr() })]);
};

exports.modelNameRadio = function (model) {
  return function (room) {
    return [m("div.roomRadio",
              m("input",
                { type: "radio",
                  name: "roomName",
                  onclick: m.withAttr("value", model.name),
                  value: room.roomName }),
              "Room: " + room.roomName + ", user count: " + room.userCount)];
  };
};
