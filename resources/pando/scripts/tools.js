var exports = module.exports = {};

exports.when = function (val, callback) {
  if (val !== null && typeof val !== "undefined") return callback();
  else return null;
};

exports.any = function (vals, test) { return vals.map(test).indexOf(true) > -1; };
