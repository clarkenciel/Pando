var exports = module.exports = {};

exports.audioCtx = new AudioContext();

exports.Sound = function (fundamental, dimensions, coord) {
  this._coord = coord;
  this._dimensions = dimensions;
  this.gain = exports.audioCtx.createGain();
  this.osc = exports.audioCtx.createOscillator();
  this.isStarted = false;
  this.start =  function () { if (!this.isStarted) this.osc.start(); };
  this.stop =  function () { if (!this.isStarted) this.osc.stop(); };
  this.updateFreq = function (fundamental) {
    this.osc.frequency.value = Utils.coordToFrequency(fundamental, this._dimensions, this._coord);
  };

  this.gain.gain.value = 0.3;
  this.updateFreq(fundamental);
  this.gain.connect(exports.audioCtx.destination);
  this.osc.connect(out.gain);
  return out;
};
