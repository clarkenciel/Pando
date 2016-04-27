var m = require('../mithril/mithril');
var Touch = require('../mithril-touch/mithril-touch');
var exports = module.exports = {};

var hide = function (e) { this.classList.add("hidden"); };

exports.displayError = function (error) {
  return m("div.error.popup.medium_text.bold_text",           
           " - " + error);
};

exports.displayErrors = function (model) {
  return m("div#notifications.popup.container",
           { onclick: hide,
             config: Touch.touchHelper({ tap: hide }) },
           model.errors().splice(0,model.errors().length).map(exports.displayError));
};

exports.label = function (labelText, dataName) {
  return [m("br"),
          m("label.big_text.bold", { for: dataName }, labelText),
          m("br")];
};

exports.button = function (buttonText, buttonCss, onClick) {
  return [m("div.buttonRow",
            m("button.button.big_text" + buttonCss,
              { onclick: onClick,
                config: Touch.touchHelper({
                  tap: onClick })},
              buttonText)),
          m("br")];
};

exports.textInput = function (labelName, dataName, attr) {
  return exports.label(labelName, dataName).
    concat([m("input.big_text",
              { type: "text",
                name: dataName,
                onkeyup: m.withAttr("value",
                                       function (value) {
                                         attr(value);
                                         m.redraw.strategy("none");
                                       }),
                value: attr() })]);
};

exports.modelNameRadio = function (model) {
  return function (room) {
    return [m("div.roomRadio",
              m("input",
                { type: "radio",
                  name: "roomName",
                  onclick: m.withAttr("value", model.name),
                  config: Touch.touchHelper({
                    tap: function (event) {
                      //console.log('event', model.user(), model.name(), event.srcElement.value);
                      event.preventDefault();                      
                      model.name(event.srcElement.value);
                      return event.srcElement.value;
                    }
                  }),
                  value: room.roomName }),
              m("div.radio_label.medium_text",
                room.roomName + ", users: " + room.userCount))];
  };
};

exports.overlay = function (contents) {
  return m("div.overlay_backdrop",
           m("div.overlay_container",
             contents()));
};
