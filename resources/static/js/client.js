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
Utils.getSocketEndpoint = function (app, messageTarget) {
  return function (x) {
    var socketAddr = JSON.parse(x.responseText).socketAddress;
    app.socket = new WebSocket(socketAddr);
    app.socket.onmessage = Utils.insertMessage(messageTarget);
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
  
