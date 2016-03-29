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
Utils.getSocketEndpoint = function () {};

// ----- Site Info
Utils.getSiteInfo = function (ele) {
  return JSON.parse(ele.getAttribute('site-data'));
};
  
