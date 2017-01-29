
var EventEmitter = function () {
	this.eventHandlers = {};
};
EventEmitter.EventEmitter = EventEmitter;
module.exports = EventEmitter;

EventEmitter.listenerCount = function (emitter, evt) {
	var eventHandlers = emitter.eventHandlers[evt];
	return eventHandlers ? eventHandlers.length : 0;
};

EventEmitter.prototype.on = function (evt, fn) {
	if (typeof fn !== 'function') {
		console.warn('Tried to register non-function', fn, 'as event handler for event:', evt);
		return this;
	}

	this.emit('newListener', evt, fn);

	var allHandlers = this.eventHandlers;
	var evtHandlers = allHandlers[evt];
	if (evtHandlers === undefined) {
		// first event handler for this event type
		allHandlers[evt] = [fn];
		return this;
	}

	evtHandlers.push(fn);
	return this;
};

EventEmitter.prototype.addListener = EventEmitter.prototype.on;

EventEmitter.prototype.once = function (evt, fn) {
	if (!fn.once) {
		fn.once = 1;
	} else {
		fn.once += 1;
	}

	return this.on(evt, fn);
};

EventEmitter.prototype.setMaxListeners = function () {
	console.warn('Method setMaxListeners not supported, there is no limit to the number of listeners');
};

EventEmitter.prototype.removeListener = function (evt, handler) {
	// like node.js, we only remove a single listener at a time, even if it occurs multiple times

	var handlers = this.eventHandlers[evt];
	if (handlers !== undefined) {
		var index = handlers.indexOf(handler);
		if (index !== -1) {
			handlers.splice(index, 1);
			this.emit('removeListener', evt, handler);
			if (handlers.length === 0) {
				delete this.eventHandlers[evt];
			}
		}
	}
	return this;
};

EventEmitter.prototype.removeAllListeners = function (evt) {
	if (evt) {
		delete this.eventHandlers[evt];
	} else {
		this.eventHandlers = {};
	}
	return this;
};

EventEmitter.prototype.hasListeners = function (evt) {
	return (this.eventHandlers[evt] !== undefined);
};

EventEmitter.prototype.listeners = function (evt) {
	var handlers = this.eventHandlers[evt];
	if (handlers !== undefined) {
		return handlers.slice();
	}

	return [];
};

var slice = Array.prototype.slice;
EventEmitter.prototype.emit = function (evt) {

	var handlers = this.eventHandlers[evt];
	if (handlers === undefined) {
		return false;
	}

	// copy handlers into a new array, so that handler removal doesn't affect array length
	handlers = handlers.slice();

	var hadListener = false;
	var args = slice.call(arguments, 1);
	for (var i = 0, len = handlers.length; i < len; i++) {
		var handler = handlers[i];
		if (handler === undefined) {
			continue;
		}

		handler.apply(this, args);
		hadListener = true;

		if (handler.once) {
			if (handler.once > 1) {
				handler.once--;
			} else {
				delete handler.once;
			}

			this.removeListener(evt, handler);
		}
	}

	return hadListener;
};


/*****************
 ** WEBPACK FOOTER
 ** ./~/events.js/index.js
 ** module id = 16
 ** module chunks = 0
 **/