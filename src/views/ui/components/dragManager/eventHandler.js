var EventEmitter = require('events.js').EventEmitter;
var getTouch = require('tapHelper').getPosition;
var interactionHandler = require('interactionHandler');

var eventHandler = module.exports = new EventEmitter();

var DRAG_SENSITIVITY = 5; //how much we need to move for a drag to start
var isDragging = false, isListening = false;
var startX, startY, currentElement;
var sensitivity = DRAG_SENSITIVITY;


function reset() {
	isDragging = false;
	currentElement = null;
}

function onDragMove(e) {
	var touch = getTouch(e);

	if (!isDragging) {
		if (Math.abs(touch.x - startX) < sensitivity && Math.abs(touch.y - startY) < sensitivity) {
			return;
		}

		if (!interactionHandler.requestInteractionHandle(eventHandler)) { return eventHandler.cancel(); }

		isDragging = true;
		currentElement.emit('_dragStart', touch.x, touch.y);
	}
	currentElement.emit('dragMove', touch.x, touch.y);
	eventHandler.emit('dragMove', touch.x, touch.y);
}


var onDragEnd;
function startListening() {
	if (isListening) { return; }
	isListening = true;
	window.gui.wBody.on('dom.touchmove', onDragMove);
	window.gui.wBody.on('dom.touchend', onDragEnd);
}

function stopListening() {
	if (!isListening) { return; }
	isListening = false;
	window.gui.wBody.removeListener('dom.touchmove', onDragMove);
	window.gui.wBody.removeListener('dom.touchend', onDragEnd);
}

onDragEnd = function (e) {
	var touch = getTouch(e);
	stopListening();
	if (!isDragging) { return; }
	reset();
	eventHandler.emit('dragEnd', touch.x, touch.y);
};

eventHandler.cancel = function () {
	stopListening();
	if (!isDragging) { return; }
	reset();
	eventHandler.emit('dragEnd', 0, 0);
	interactionHandler.abortInteraction();
};

eventHandler.initializeListeners = function (wElement, options) {
	wElement.allowDomEvents();
	var elementSensitivity = options.hasOwnProperty('sensitivity') ? options.sensitiviy : DRAG_SENSITIVITY;
	wElement.on('dom.touchstart', function (e) {
		if (!wElement._dragManager.enable || isListening) {
			return;
		}

		sensitivity = elementSensitivity;
		var touch = getTouch(e);
		startX = touch.x;
		startY = touch.y;
		startListening();
		currentElement = wElement;
		if (options.dragOnTouchstart) {
			sensitivity = 0;
			onDragMove(e);
		}
	});

	wElement._dragManager.enable = true;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/dragManager/eventHandler.js
 ** module id = 187
 ** module chunks = 0
 **/