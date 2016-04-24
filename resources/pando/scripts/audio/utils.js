var exports = module.exports = {};

exports.constrainFrequency = function (lo, hi, frequency) {
  if (typeof frequency === "undefined") return 0;
  if (!isFinite(frequency)) return 0;
  while (frequency < lo || hi < frequency) {
    if (frequency < lo) frequency *= 2;
    if (frequency > hi) frequency *= 0.5;
  };
  return frequency;
};

exports.coordToFrequency = function (frequency, dimensions, coord) {
  var product = 1;
  for (var i = 0; i < dimensions.length; i++)
    product *= Math.pow(dimensions[i], coord[i]);
  return exports.constrainFrequency(
    400, 1200,
    Math.abs(frequency * product));
};
