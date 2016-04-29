var X = module.exports = {};

X.makeStore = function () {
  return {};
};

X.toId = function () {
  return [].slice.call(arguments).join('-');
};

X.getTimeout = function (store, id) {
  var targetKey = Object.keys(store).find(function (i) { return i === id; });
  if (targetKey) return store[targetKey];
  else return null;
};

X.setTimeout = function (store, id, socketTimeout, callback) {
  var cbArgs = [].slice.call(arguments[3,-1]),
      timeout = X.getTimeout(store, id);
  if (timeout !== null && typeof timeout !== 'undefined' )
    window.clearTimeout(timeout);
  store[id] = window.setTimeout(callback.apply([], cbArgs), socketTimeout);
};
