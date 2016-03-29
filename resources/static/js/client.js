// ------------- functions used across clients
var Utils = Utils ? Utils : new Object();

// ------ AJAX Stuff
Utils._jsonAjaxFactory = function (action_type) {
  return function (end_point, json_object, callback) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4) {
        callback(xmlhttp);
      }
    };

    xmlhttp.open(action_type, end_point);
    xmlhttp.setRequestHeader("Content-Type",
                             "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify(json_object));
  };
};
Utils.postJSONAjax = Utils._jsonAjaxFactory("POST");
Utils.getJSONAjax = Utils._jsonAjaxFactory("GET");

// ----- Sockets
Utils.getSocketEndpoint = function (app, callback) {
  return function (x) {
    var socketAddr = JSON.parse(x.responseText).socketAddress;
    app.socket = new WebSocket(socketAddr);
    app.socket.onmessage = callback;
    console.log(app.socket);
  };
};

// ----- Site Info
Utils.getSiteInfo = function (ele) {
  return JSON.parse(ele.getAttribute('site-data'));
};

// ----- Message display
Utils.formatMessage = function (m) {
  var bigHolder = document.createElement("div");
  var userNameHolder = document.createElement("div");
  var messageHolder = document.createElement("div");

  userNameHolder.innerText = m.userName;
  messageHolder.innerText = m.message;
  bigHolder.appendChild(userNameHolder);
  bigHolder.appendChild(messageHolder);
  
  return bigHolder;
};

Utils.insertMessage = function (ele) {
  return function (m) {
    var messageHolder = Utils.formatMessage(JSON.parse(m.data));
    ele.appendChild(messageHolder);
  };
};

// ----- Frequency calculation
Utils.constrainFrequency = function (frequency) {
  if (typeof frequency === "undefined") return 0;
  if (!isFinite(frequency)) return 0;
  while (frequency >= 15000) frequency *= 0.5;
  while (frequency <= 200) frequency *= 2;
  return frequency;
};

Utils.coordToFrequency = function (frequency, dimensions, coord) {
  var product = 1;
  for (var i = 0; i < dimensions.length; i++)
    product *= Math.pow(dimensions[i], coord[i]);
  return Utils.constrainFrequency(Math.abs(frequency * product));
};
