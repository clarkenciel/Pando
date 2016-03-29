// ------------- Dealing with the WebAudio API

// ---- Main Interface
var Sound = Sound ? Sound : new Object();
Sound.init = function () {
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext();
  } catch(e) {
    alert('Web Audio API is not supported in this browser');
  };
};

// ----- Experiments
Sound.init();

// simple FM
var master = Sound.context.createGain();
master.connect(Sound.context.destination);
master.gain.value = 0.3;

var carrier = Sound.context.createOscillator();
carrier.frequency.value = 200;
carrier.connect(master);
carrier.start();
carrier.stop();

var mod = Sound.context.createOscillator();
var modGain = Sound.context.createGain();
modGain.gain.value = 100;
mod.frequency.value = 395;

mod.connect(modGain);
modGain.connect(carrier.frequency);
mod.start();

// end
carrier.stop();
mod.stop();
mod = modGain = carrier = master = null;

