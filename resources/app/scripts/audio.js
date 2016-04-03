// ------------- Dealing with the WebAudio API

// ---- Main Interface

var Sound = function (freq, gain) {
  if (typeof freq === "undefined") freq = 0;
  if (typeof gain === "undefined") gain = 0;
  try {
    // initialize audio context
    window.AudioContext = window.AudioContext;
    this.context = new AudioContext();

    // set up sound chain
    this.frequency = freq;
    this.volume = gain;
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
    this.initialized = true;
    this.playing = false;
    this.resetOscillator();    
  } catch(e) {
    alert('Web Audio API is not supported in this browser');
  };
  
  return this;
};

Sound.prototype.resetOscillator = function () {
  if (this.initialized) {
    this.carrier = this.context.createOscillator();
    this.carrier.frequency.value = this.frequency;
    this.carrier.connect(this.master);
  };
  return this;
};

Sound.prototype.setFrequency = function (freq) {
  if (this.initialized) {
    this.frequency = freq;
    this.carrier.frequency.value = freq;
  };
  return this;
};

Sound.prototype.setVolume = function (gain) {
  if (this.initialized) {
    this.volume = gain;
    this.master.gain.value = gain;
  };
  return this;
};

Sound.prototype.play = function (when) {
  if (typeof when === "undefined") when = 0;
  if (this.initialized) {
    this.carrier.start(when);
  };
  this.playing = true;
  return this;
};

Sound.prototype.stop = function (when) {
  if (typeof when === "undefined") when = 0;
  if (this.initialized) {
    this.carrier.stop(this.context.currentTime + when);
    this.resetOscillator();
  };
  this.playing = false;
  return this;
};

// ----- Experiments
/*Sound.init(220, 0.5);
Sound.play();
Sound.setFrequency(1500);
Sound.setVolume(0.2);
Sound.stop(3);*/

var context = new AudioContext();
var node = context.createBufferSource();
var buffer = context.createBuffer(1, 4096, context.sampleRate);
var data = buffer.getChannelData(0);

for (var i = 0; i < 4096; i++) {
  data[i] = Math.random();
}
node.buffer = buffer;
node.loop = true;
node.disconnect(context.destination);
node.start(0);
node.stop();
node.playbackRate.value = 0;

var amp = context.createGain();
var amp2 = context.createGain();
var master = context.createGain();
var sine = context.createOscillator();

node.connect(amp);
amp.connect(master.gain);
sine.connect(master);
sine.connect(amp2);
amp2.connect(node.playbackRate);
master.connect(context.destination);

sine.start();
amp2.gain.value = 0.05;
master.gain.value = 0.5;
amp.gain.value = 0.5;

