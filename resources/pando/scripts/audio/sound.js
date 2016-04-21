var Utils = require('./utils');
var exports = module.exports = {};

var getContext = function () {
  if ('AudioContext' in window) return new AudioContext();
  else return new webkitAudioContext();
};

var audioCtx = null;

exports.Sound = function (fundamental, dimensions, coord) {
  audioCtx = audioCtx ? audioCtx : getContext();
  this._coord = coord;
  this._dimensions = dimensions;
  this.gain = audioCtx.createGain();
  this.osc = audioCtx.createOscillator();
  this.isStarted = false;
  this.start =  function () {
    if (!this.isStarted) {
      this.osc.start(0);
      this.isStarted = true;
    };
  };
  this.stop =  function () {
    if (this.isStarted) {
      this.osc.stop(0);
      this.osc.disconnect(this.gain);
      this.osc = audioCtx.createOscillator();
      this.osc.connect(this.gain);
      this.isStarted = false;
    };
  };
  this.updateFreq = function (fundamental) {
    this.osc.frequency.value = Utils.coordToFrequency(fundamental, this._dimensions, this._coord);
  };

  this.gain.gain.value = 0.3;
  this.updateFreq(fundamental);
  this.gain.connect(audioCtx.destination);
  this.osc.connect(this.gain);
};
