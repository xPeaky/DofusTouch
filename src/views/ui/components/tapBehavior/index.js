var getPosition = require('tapHelper').getPosition;
var inactivityMonitor = require('inactivityMonitor');
var interactionHandler = require('interactionHandler');

var longTapTime = 400;
var DELAY_DOUBLETAP = 200;

var current, wBody;

function enable() { this.setEnable(true); }
function disable() { this.setEnable(false); }
function tap() {
	if (this.isEnable()) {
		this.emit('tapstart');
		this.emit('tapend');
		this.emit('tap');
	}
}

/**
 * tapBehavior
 * @param {WuiDom} wElement - target of the behavior
 */
function tapBehavior(wElement, options) {
	if (wElement._tapBehavior) { return; }
	options = options || {};

	wElement._tapBehavior = true;

	wElement.allowDomEvents();

	var doubletapTimeout = options.doubletapTimeout || DELAY_DOUBLETAP,
		longTapTimeout,
		startCoord,
		boundingBox,
		previousTapTime = 0,
		isEnable = true,
		cancelled = false,
		repeatInterval,
		repeatDelay = options.repeatDelay;

	/**
	 * @param {boolean} enable - (should not be undefined)
	 */
	wElement.setEnable = function (enable) {
		if (typeof enable !== 'boolean') {
			console.error(new Error('tapBehavior: setEnable has been called with an undefined param'));
		}
		isEnable = enable;
		wElement.emit('enable', enable);
	};

	wElement.isEnable = function () {
		return isEnable;
	};

	wElement.enable = enable;
	wElement.disable = disable;
	wElement.tap = tap;

	function reset() {
		current = null;
		window.clearTimeout(longTapTimeout);
		clearInterval(repeatInterval);
		wBody.removeListener('dom.touchmove', tapMove);
		wBody.removeListener('dom.touchend', tapEnd);
	}

	function cancel(touch) {
		if (current === wElement) {
			cancelled = true;
			wElement.emit('tapend', touch);
		}

		reset();
	}

	wElement.cancelTap = cancel;

	function repeatTap(timeout) {
		repeatInterval = setInterval(function () {
			wElement.emit('tap');
		}, timeout);
	}

	function tapMove(e) {
		var touchDetails = getPosition(e);
		if (touchDetails.x < boundingBox.left ||
			touchDetails.x > boundingBox.left + boundingBox.width ||
			touchDetails.y < boundingBox.top ||
			touchDetails.y > boundingBox.top + boundingBox.height) {
			cancel(touchDetails);
		}
	}

	function tapStart(e) {
		repeatInterval = null;

		startCoord = getPosition(e);
		if (current || !isEnable || startCoord.touchCount > 1) { return; }
		current = wElement;
		cancelled = false;

		boundingBox = wElement.rootElement.getBoundingClientRect();
		wElement.emit('tapstart', startCoord, boundingBox);

		window.clearTimeout(longTapTimeout);
		longTapTimeout = window.setTimeout(function () {
			// if still tapping and repeat interval enabled, repeat action until end tap
			if (repeatDelay) {
				repeatTap(repeatDelay);
			} else {
				wElement.emit('longtap', startCoord);
			}
		}, longTapTime);

		wBody.on('dom.touchmove', tapMove);
		wBody.on('dom.touchend', tapEnd);

		inactivityMonitor.recordActivity();
	}

	function tapEnd(e) {
		if (cancelled) {
			return;
		}

		var differentTarget = wElement !== current;
		reset();

		if (differentTarget) {
			return;
		}

		var touchDetails = getPosition(e);
		wElement.emit('tapend', touchDetails);

		if (repeatInterval) {
			return;
		}

		var now = Date.now();
		// NOTE: repeatable buttons do not doubletap
		if (!repeatDelay && previousTapTime && doubletapTimeout >= now - previousTapTime) {
			wElement.emit('doubletap', touchDetails);
		} else {
			wElement.emit('tap', touchDetails);
		}

		previousTapTime = now; // save the current time for a possible double tap
	}

	wElement.on('dom.touchstart', tapStart);
}

module.exports = tapBehavior;

tapBehavior.initialize = function (body) {
	wBody = body;
	interactionHandler.on('handleTaken', function () {
		if (current) {
			current.cancelTap();
		}
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/tapBehavior/index.js
 ** module id = 32
 ** module chunks = 0
 **/