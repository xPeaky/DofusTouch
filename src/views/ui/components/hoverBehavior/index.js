var getTouch = require('tapHelper').getPosition;

var isListening;
var curPosX, curPosY;

var lastTouchedElements;
var currentTouchedElements;
var topElement;
var lastTouchedDom;
var wBody;

var current = {
	x: 0,
	y: 0,
	touchCount: 0,
	topElement: null,
	touchedElements: null
};

var wasHandled = false;


function updateTouchPosition(domEvent) {
	var touch = getTouch(domEvent);
	curPosX = current.x = touch.x;
	curPosY = current.y = touch.y;
	current.touchCount = touch.touchCount;
}

function touchOnSameElement() {
	wasHandled = true;
}

function touching() {
	if (!wasHandled) {
		return;
	}
	wasHandled = false;

	// retrieve the dom element at the touched location
	var touchedDomElement = document.elementFromPoint(curPosX, curPosY);
	if (!touchedDomElement) {
		wasHandled = true;
		return;
	}

	if (touchedDomElement === lastTouchedDom) { // we touched the same element => bypass the event emitting system
		touchOnSameElement();
		return;
	}

	lastTouchedDom = touchedDomElement;
	currentTouchedElements = current.touchedElements = [];

	var event = document.createEvent('Event');
	event.initEvent('touching', true, true);
	touchedDomElement.dispatchEvent(event); // make this element emit 'touching'
}

var lastStepX = 0, lastStepY = 0, lastTimestamp = 0;
function touchMove(e) {
	updateTouchPosition(e);
	if (Math.abs(curPosX - lastStepX) > 15 || Math.abs(curPosY - lastStepY) > 15 || e.timeStamp - lastTimestamp > 50) {
		lastStepX = curPosX;
		lastStepY = curPosY;
		touching();
	}
	lastTimestamp = e.timeStamp;
}

var stopListening;

function touchEnd(e) {
	var touch = getTouch(e);
	current.touchCount = touch.touchCount;
	if (touch.touchCount === 0) {
		stopListening();
	}
}



/**
 * we loop through the elements ordered by lower hierarchy.
 * if a element and his same-level predecessor are different, we know all its children are different from their
 * respective same-level predecessor.
 *
 */
function handleTouch() {
	currentTouchedElements.push(wBody);
	topElement = current.topElement = currentTouchedElements[0];

	var currentIndex = currentTouchedElements.length - 1;
	var lastIndex = lastTouchedElements.length - 1;

	for (var i = Math.max(currentIndex, lastIndex); i >= 0; i -= 1) {
		var lastElement = lastTouchedElements[lastIndex];
		var currentElement = currentTouchedElements[currentIndex];

		if (lastElement !== currentElement) {
			if (lastElement) {
				lastElement.emit('touchleave', current);    //TODO: rename to hover.touchleave / enter
			}

			if (currentElement) {
				currentElement.emit('touchenter', current);
			}
		}

		lastIndex -= 1;
		currentIndex -= 1;
	}

	lastTouchedElements = currentTouchedElements;
	wasHandled = true;
}

function startListening() {
	if (isListening) { return; }
	isListening = true;

	lastTouchedElements = [];
	currentTouchedElements = [];
	lastTouchedDom = null;
	topElement = null;
	wasHandled = true;
	wBody.on('dom.touchmove', touchMove);
	wBody.on('dom.touchend', touchEnd);
}

stopListening = function () {
	if (!isListening) { return; }
	isListening = false;
	wBody.removeListener('dom.touchend', touchEnd);
	wBody.removeListener('dom.touchmove', touchMove);
};


/**
 * Emits touchenter and touchleave on the target element.
 * @param {WuiDom} target - the WuiDom object to add the touchable behavior to.
 */
function hoverBehavior(target) {
	if (target._hoverBehavior) { return; }
	target._hoverBehavior = true;

	target.allowDomEvents();
	target.on('dom.touching', function (event) {
		if (topElement === target && !currentTouchedElements.length) { // the top element is the same.
			event.stopPropagation();
			return touchOnSameElement();
		}

		currentTouchedElements.push(target);
	});
}
module.exports = hoverBehavior;

hoverBehavior.start = startListening;
hoverBehavior.stop = stopListening;

/**
 *
 * Initialises the hoverBehavior.
 * @param {WuiDom} [body] - the WuiDom of the body
 */
hoverBehavior.initialize = function (body) {
	if (window._hoverBehavior) { return console.error('hover behavior initialised more than one time.'); }
	window._hoverBehavior = true;

	wBody = body;
	wBody.on('dom.touching', handleTouch);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/hoverBehavior/index.js
 ** module id = 188
 ** module chunks = 0
 **/