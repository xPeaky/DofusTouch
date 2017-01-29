var tapHelper = require('tapHelper');
var tapEvents = tapHelper.events;
var getTouch = tapHelper.getPosition;
var EventEmitter = require('events.js').EventEmitter;

/**
 * This module is used to control the different behaviors in the game. When a user is touching the screen,
 * his fingers can be above a button, within a scrolling component, within the sliding one. The first behavior
 * which will call the requestInteractionHandle method will get a handle until every fingers it released from the
 * screen. So if a slide is initiated (At list 5px distance), it will request the handle, and the tapBehavior and
 * the scroll will be cancelled.
 */

var handle, touching;
var handler = module.exports = new EventEmitter();

document.body.addEventListener(tapEvents.start, function () {
	if (touching) { return; }
	touching = true;
	handle = null;
}, true); // reset on the beginning of the capture phase

document.body.addEventListener(tapEvents.start, function () {
	if (handle) {
		handler.emit('handleTaken', handle);
	}
}, false); // emit at the end of the bubble phase

document.body.addEventListener(tapEvents.end, function (e) {
	if (getTouch(e).touchCount === 0) {
		handle = null;
		touching = false;
	}
});

handler.isHandleFree = function () {
	return handle === null;
};

handler.hasHandle = function (element) {
	return handle === element;
};

/**
 * Tries to get the handle.
 * @param {WuiDom} element - the element that currently has the handle.
 * @returns {boolean} - returns true if the given element holds the handle.
 */
handler.requestInteractionHandle = function (element) {
	if (handle) { return handle === element; }
	handle = element;
	handler.emit('handleTaken', handle);
	return true;
};

handler.abortInteraction = function () {
	handle = null;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/interactionHandler/index.js
 ** module id = 47
 ** module chunks = 0
 **/