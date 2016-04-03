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
Utils.getSocket = function (callback) {
  var socketAddr = 'ws://' + window.location.host + '/message';
  var sock = new WebSocket(socketAddr);
  sock.onmessage = callback;
  return sock;
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

Utils.insertMessage = function (ele, m) {
  var messageHolder = Utils.formatMessage(m);
  ele.appendChild(messageHolder);
};

// ----- Frequency calculation
Utils.constrainFrequency = function (lo, hi, frequency) {
  if (typeof frequency === "undefined") return 0;
  if (!isFinite(frequency)) return 0;
  while (frequency < lo || hi < frequency) {
    if (frequency < lo) frequency *= 2;
    if (frequency > hi) frequency *= 0.5;
  };
  return frequency;
};

Utils.coordToFrequency = function (frequency, dimensions, coord) {
  var product = 1;
  for (var i = 0; i < dimensions.length; i++)
    product *= Math.pow(dimensions[i], coord[i]);
  return Utils.constrainFrequency(
    400, 1200,
    Math.abs(frequency * product));
};
