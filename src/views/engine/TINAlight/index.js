'use strict';

var inherit         = require('util').inherits;
var constants       = require('constants');
var easingFunctions = require('./easing');
var DoublyList      = require('container-doublylist');

// Using performance.now, beyond giving better precision,
// its avoids a bug that happens once in a million sessions:
// Data.now is based on a clock that is synchronized by a few milliseconds
// every 15-20 mins and could cause the timer to go backward in time.
// (legend or true fact? not sure, but I think I noticed it once)
// see: http://updates.html5rocks.com/2012/08/When-milliseconds-are-not-enough-performance-now
var clock = window.performance ? window.performance : Date;

/**
 *
 * @classdesc Tween Manager
 * It manages all the tweeners. Its speed is computed from the time units per second (tups)
 * and the duration since the previous call to its update method.
 *
 * @param {number} tups Time units per gigananosecond (NB: 1 gigananosecond = 1 second)
 *
 */
var TINAlight = {
	tups: constants.TIME_UNITS_PER_SECOND,
	easing: easingFunctions,
	_startingTime: clock.now(),
	_previousTime: clock.now(),

	_playables:  new DoublyList(),
	_addList:    [],
	_removeList: [],

	_silent: true,
	_debug: false,

	restart: function () {
		this._startingTime = clock.now();
		this._previousTime = clock.now();
	},

	getFramesSinceStart: function () {
		return Math.floor((clock.now() - this._startingTime) * this.tups / 1000);
	},

	update: function () {
		var currentTime = clock.now();

		var speed = (currentTime - this._previousTime) * this.tups / 1000;
		this._previousTime = currentTime;

		// Add playable in add list
		while (this._addList.length > 0) {
			var playable = this._addList.pop();
			playable.reference = this._playables.add(playable);
		}

		// Update every attached tween
		for (var playableRef = this._playables.first; playableRef !== null; playableRef = playableRef.next) {
			playableRef.object.update(speed);
		}

		// Removing playable in remove list
		while (this._removeList.length > 0) {
			this._playables.removeByReference(this._removeList.pop().reference);
		}
	},

	start: function (playable) {
		playable.start(this);
	},

	_add: function (playable) {
		// If the playable is already being added
		// it is not added again
		var idx = this._addList.indexOf(playable);
		if (idx !== -1) {
			return;
		}

		idx = this._removeList.indexOf(playable);
		if (idx !== -1) {
			// If the playable was being removed
			// taking it out of the remove list
			this._removeList.splice(idx, 1);
		} else {
			// otherwise adding it to the list of playable to add
			this._addList.push(playable);
		}
	},

	_remove: function (playable) {
		// If the playable is already being removed
		// it is not added again
		var idx = this._removeList.indexOf(playable);
		if (idx !== -1) {
			return;
		}


		idx = this._addList.indexOf(playable);
		if (idx !== -1) {
			// If the playable was being added
			// taking it out of the add list
			this._addList.splice(idx, 1);
		} else {
			// otherwise adding it to the list of playables to remove
			this._removeList.push(playable);
		}
	},

	stop: function () {
		for (var playableRef = this._playables.first; playableRef !== null; playableRef = playableRef.next) {
			playableRef.object._stopped();
		}
		this._playables.clear();
	},

	silent: function (silent) {
		this._silent = silent || false;
	},

	debug: function (debug) {
		this._debug = debug || false;
	},

	_warn: function (warning) {
		if (this._silent === false) {
			console.warn(warning);
		}

		// if (this._debug) {
		// 	debugger;
		// }
	}
};
module.exports = TINAlight;

/** @class */
function Playable() {
	this._time = 0;
	this._duration = 0;

	this.playing  = false;
	this.stopping = false;
	this.starting = false;

	this._iterations = 0;

	this._onStart  = null;
	this._onStop   = null;
	this._onFinish = null;
	this._onUpdate = null;

	this._onceFinish = null;

	this.reference = null;
}

Playable.prototype.start = function (iterations) {
	this._iterations = (iterations === true) ? Infinity : (iterations ? iterations : 1);

	if (this._iterations === 0) {
		TINAlight._warn('[Playable.start] playable is required to run 0 times');
		return this;
	}

	if (this.starting) {
		TINAlight._warn('[Playable.start] playable is already starting');
		return this;
	}

	if (this.playing && !this.stopping) {
		TINAlight._warn('[Playable.start] playable is already playing');
		return this;
	}

	this.starting = true;
	TINAlight._add(this);
	return this;
};

Playable.prototype.stop = function () {
	if (this.stopping) {
		TINAlight._warn('[Playable.stop] playable is already stopping');
		return this;
	}

	if (!this.playing && !this.starting) {
		TINAlight._warn('[Playable.stop] playable is not playing');
		return this;
	}

	this.stopping = true;
	this.starting = false;
	TINAlight._remove(this);
	return this;
};

Playable.prototype.fastForwardToEnd = function () {
	this._time = this._duration;
};

Playable.prototype._stopped = function () {
	this.stopping = false;
	this.playing  = false;
	if (this._onStop !== null) {
		this._onStop();
	}
};

Playable.prototype._started = function () {
	this.starting = false;
	this.playing  = true;
	if (this._onStart !== null) {
		this._onStart();
	}
};

Playable.prototype._finished = function () {
	this.playing  = false;
	TINAlight._remove(this);

	// Copying onceFinish array to ensure that
	// calls to onFinish or callbacks within onceFinish
	// can safely add new onFinish and onceFinish callbacks to this tween
	if (this._onceFinish !== null) {
		var onceFinishArray = this._onceFinish.slice();
		this._onceFinish = null;
		for (var f = 0; f < onceFinishArray.length; f += 1) {
			onceFinishArray[f]();
		}
	}

	if (this._onFinish !== null) {
		this._onFinish();
	}
};

Playable.prototype._reset = function () {
	this._time = 0;
};

// Update method, returns true if playable stops playing
Playable.prototype.update = function (speed) {
	if (this.stopping) {
		this._stopped();
		if (!this.starting) {
			return;
		}
	}

	if (this.starting) {
		this._time = 0;
		this._update();
		this._started();
	} else {
		var t = this._time + speed;
		if (t >= this._duration) {
			if (this._iterations === 1) {
				this._time = this._duration;
				this._update();
				if (this._onUpdate !== null) {
					this._onUpdate();
				}
				this._finished();
			} else {
				this._time = t % this._duration;
				this._update();
				if (this._onUpdate !== null) {
					this._onUpdate();
				}
				this._iterations -= 1;
			}
		} else {
			this._time = t;
			this._update();
			if (this._onUpdate !== null) {
				this._onUpdate();
			}
		}
	}
};

Playable.prototype.onUpdate = function (onUpdate) {
	this._onUpdate = onUpdate || null;
	return this;
};

Playable.prototype.onStart = function (onStart) {
	this._onStart = onStart || null;
	return this;
};

Playable.prototype.onStop = function (onStop) {
	this._onStop = onStop || null;
	return this;
};

Playable.prototype.onFinish = function (onFinish) {
	this._onFinish = onFinish || null;
	return this;
};

Playable.prototype.onceFinish = function (onceFinish) {
	if (this._onceFinish === null) {
		this._onceFinish = [onceFinish];
	} else {
		this._onceFinish.push(onceFinish);
	}
	return this;
};

Playable.prototype.removeOnFinish = function () {
	this._onFinish   = null;
	this._onceFinish = null;
	return this;
};

Playable.prototype.removeOnUpdate = function () {
	this._onUpdate = null;
	return this;
};

Playable.prototype.removeOnStart = function () {
	this._onStart = null;
	return this;
};

Playable.prototype.removeOnStop = function () {
	this._onStop = null;
	return this;
};

Playable.prototype.getElapsedTime = function () {
	return this._time;
};

Playable.prototype.getRemainingTime = function () {
	return this._duration - this._time;
};

/**
 *
 * @classdesc Delay
 * Execute a callback after a given amount of time has passed
 *
 * @param {number}   duration - Duration of the delay
 * @param {function} onFinish - Callback to execute at the end of the delay
 *
 */

function Delay(duration, onFinish) {
	if ((this instanceof Delay) === false) {
		return new Delay(duration, onFinish);
	}

	Playable.call(this);

	this._duration = duration;
	this.onFinish(onFinish);
}
inherit(Delay, Playable);
TINAlight.Delay = Delay;

Delay.prototype.reset = function (duration, onFinish) {
	this._duration = duration;
	this.removeOnFinish();
	this.onFinish(onFinish);
};

Delay.prototype._update = function () {};

/**
 *
 * @classdesc Transition
 * Holds parameters to handle a transition
 *
 * @param {object} fromObject   - Starting values of the properties of the transition
 * @param {object} toObject     - Ending values of the properties of the transition
 * @param {number} startingTime - Starting time of the transition
 * @param {number} duration     - Duration of the transition
 * @param {function} easing     - Easing method of the transition
 * @param {object} easingParam  - Parameters of the easing
 *
 */
function Transition(fromObject, toObject, startingTime, duration, easing, easingParam) {
	// Time information
	this.start    = startingTime;
	this.end      = startingTime + duration;
	this.duration = duration;

	// Property values information
	this.fromObject = fromObject;
	this.toObject   = toObject;

	// Easing information
	this.easing      = easing;
	this.easingParam = easingParam;
}

/**
 *
 * @classdesc Tween
 * Manages transition of object properties in absolute values
 *
 * @param {object} element    - Object to tween
 * @param {string} properties - Properties to tween
 *
 */

function Tween(element, properties) {
	if ((this instanceof Tween) === false) {
		return new Tween(element, properties);
	}

	Playable.call(this);

	if (!element) {
		console.error(new Error('Invalid tween element: ' + element));

		// Makes the tween harmless by avoiding future crash
		element = {};
	}

	this._element = element;
	this._properties = properties;

	this._transitions = [];
	this._currentTransitionIndex = 0;
	this._duration = 0;
	this._from = null;
}
inherit(Tween, Playable);
TINAlight.Tween = Tween;

Tween.prototype.reset = function () {
	this._from = null;
	this._duration = 0;
	this._currentTransitionIndex = 0;
	this._transitions = [];
	this._reset();

	return this;
};

Tween.prototype.from = function (fromObject) {
	this._from = fromObject;

	if (this._transitions.length > 0) {
		this._transitions[0].from = fromObject;
	}

	return this;
};

Tween.prototype._setFrom = function () {
	// Copying properties of tweened object
	this._from = {};
	for (var p = 0; p < this._properties.length; p += 1) {
		var property = this._properties[p];
		this._from[property] = this._element[property];
	}

	return this._from;
};

Tween.prototype._getLastTransitionEnding = function () {
	if (this._transitions.length > 0) {
		return this._transitions[this._transitions.length - 1].toObject;
	} else {
		return (this._from === null) ? this._setFrom() : this._from;
	}
};

Tween.prototype.to = function (toObject, duration, easing, easingParam) {
	if (easing === undefined) {
		easing = easingFunctions.linear;
	}

	// Getting previous transition ending as the beginning for the new transition
	var fromObject = this._getLastTransitionEnding();
	this._transitions.push(new Transition(fromObject, toObject, this._duration, duration, easing, easingParam));
	this._duration += duration;

	return this;
};

Tween.prototype.wait = function (duration) {
	if (duration === 0) {
		return this;
	}

	// Getting previous transition ending as the beginning AND ending for the waiting transition
	var fromObject = this._getLastTransitionEnding();
	this._transitions.push(new Transition(fromObject, fromObject, this._duration, duration, easingFunctions.linear, null));
	this._duration += duration;

	return this;
};

Tween.prototype._update = function () {
	while (this._time < this._transitions[this._currentTransitionIndex].start) { this._currentTransitionIndex--; }
	while (this._time > this._transitions[this._currentTransitionIndex].end)   { this._currentTransitionIndex++; }

	var transition = this._transitions[this._currentTransitionIndex];
	var t = transition.easing((this._time - transition.start) / transition.duration, transition.easingParam);
	var fromObject = transition.fromObject;
	var toObject   = transition.toObject;
	for (var p = 0; p < this._properties.length; p++) {
		var property = this._properties[p];
		this._element[property] = fromObject[property] * (1 - t) + toObject[property] * t;
	}
};


/**
 *
 * @classdesc RelativeTween
 * Manages transition of object properties in relative values
 *
 * @param {object} element    - Object to tween
 * @param {string} properties - Properties to tween
 *
 */

function RelativeTween(element, properties) {
	if ((this instanceof RelativeTween) === false) {
		return new RelativeTween(element, properties);
	}

	Playable.call(this);

	if (!element) {
		console.error(new Error('Invalid tween element: ' + element));

		// Makes the tween harmless by avoiding future crash
		element = {};
	}

	this._element = element;
	this._properties = properties;
	this._previousValues = {};
	for (var p = 0; p < this._properties.length; p += 1) {
		this._previousValues[this._properties[p]] = 0;
	}

	this._transitions = [];
	this._currentTransitionIndex = 0;
	this._duration = 0;
	this._from = null;
}
inherit(RelativeTween, Playable);
TINAlight.RelativeTween = RelativeTween;

RelativeTween.prototype.reset = function () {
	this._from = null;
	this._duration = 0;
	this._currentTransitionIndex = 0;
	this._transitions = [];
	this._reset();
	this._previousValues = {};
	for (var p = 0; p < this._properties.length; p += 1) {
		this._previousValues[this._properties[p]] = 0;
	}

	return this;
};

RelativeTween.prototype.from = function (fromObject) {
	this._from = fromObject;

	if (this._transitions.length > 0) {
		this._transitions[0].from = fromObject;
	}

	return this;
};

RelativeTween.prototype._setFrom = function () {
	// Copying properties of tweened object
	this._from = {};
	for (var p = 0; p < this._properties.length; p += 1) {
		this._from[this._properties[p]] = 0;
	}

	return this._from;
};

RelativeTween.prototype._getLastTransitionEnding = function () {
	if (this._transitions.length > 0) {
		return this._setFrom();
	} else {
		return (this._from === null) ? this._setFrom() : this._from;
	}
};

RelativeTween.prototype.to = function (toObject, duration, easing, easingParam) {
	if (easing === undefined) {
		easing = easingFunctions.linear;
	}

	// Getting previous transition ending as the beginning for the new transition
	var fromObject = this._getLastTransitionEnding();
	this._transitions.push(new Transition(fromObject, toObject, this._duration, duration, easing, easingParam));
	this._duration += duration;

	return this;
};

RelativeTween.prototype.wait = function (duration) {
	if (duration === 0) {
		return this;
	}

	// Getting previous transition ending as the beginning AND ending for the waiting transition
	var fromObject = this._getLastTransitionEnding();
	this._transitions.push(new Transition(fromObject, fromObject, this._duration, duration, easingFunctions.linear, null));
	this._duration += duration;

	return this;
};

RelativeTween.prototype._update = function () {
	while (this._time < this._transitions[this._currentTransitionIndex].start) { this._currentTransitionIndex--; }
	while (this._time > this._transitions[this._currentTransitionIndex].end)   { this._currentTransitionIndex++; }

	var transition = this._transitions[this._currentTransitionIndex];
	var t = transition.easing((this._time - transition.start) / transition.duration, transition.easingParam);
	var fromObject = transition.fromObject;
	var toObject   = transition.toObject;
	for (var p = 0; p < this._properties.length; p++) {
		var property = this._properties[p];
		var now = fromObject[property] * (1 - t) + toObject[property] * t;
		this._element[property] += now - this._previousValues[property];
		this._previousValues[property] = now;
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/TINAlight/index.js
 ** module id = 260
 ** module chunks = 0
 **/