var m = require('../mithril/mithril');
var Touch = require('../mithril-touch/mithril-touch');
var exports = module.exports = {};

var hide = function (e) { this.classList.add("hidden"); };

exports.displayError = function (error) {
  return m("div.error.medium_text",
           { onclick: hide,
             config: Touch.touchHelper({ tap: hide }) },
           " - " + error);
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
          m("label.big_text.bold", { for: dataName }, labelText),
          m("br")];
};

exports.button = function (buttonText, buttonCss, onClick) {
  return [m("div.button.big_text" + buttonCss,
            { onclick: onClick,
              config: Touch.touchHelper({ tap: onClick }) },
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

exports.overlay = function (contents) {
  return m("div.overlay_backdrop",
           m("div.overlay_container",
             contents()));
};
