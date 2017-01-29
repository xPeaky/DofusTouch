var getPosition = require('tapHelper').getPosition;
var requestInteractionHandle = require('interactionHandler').requestInteractionHandle;

var SLIDE_THRESHOLD = 5;

function swiped(slideDelta, timeDelta) {
	var distance = Math.abs(slideDelta);
	return distance > 10 && distance / timeDelta > 0.65;
}

function slideBehavior(element, direction) {
	if (element._slideBehavior) { return; }
	element._slideBehavior = true;

	element.allowDomEvents();

	var axis, init, slideInitiated, slideStarted, startTime, boundingBox, slideOut;
	var lock = false;
	var touch = {};

	function setDirection(slideDirection) {
		axis = slideDirection === 'vertical' ? 'y' : 'x';
	}

	if (direction) { setDirection(direction); }
	element.setSlideDirection = setDirection;

	function updateTouch(e) {
		touch = getPosition(e);
		touch.x -= boundingBox.left;
		touch.y -= boundingBox.top;
	}

	element.isSliding = false;
	element.slideOut = false;

	element.lockSlide = function (shouldLock) {
		lock = shouldLock;
	};

	function touchMove(e) {
		updateTouch(e);
		if (slideStarted) {
			if (touch.touchCount !== 1) { return; }

			element.emit('slide', touch);
			element.slideOut = touch.x < 0 || touch.x > boundingBox.width || touch.y < 0 || touch.y > boundingBox.height;
			if (element.slideOut) {
				if (!slideOut) {
					slideOut = true;
					element.emit('slideOut', touch);
				}
			} else {
				element.emit('slideIn', touch);
				slideOut = false;
			}
			return;
		}

		var deltaX = touch.x - init.x;
		var deltaY = touch.y - init.y;
		var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
		if (distance < SLIDE_THRESHOLD) {
			return;
		}

		if (Math.abs(deltaY) > Math.abs(deltaX)) {
			if ((!axis || axis === 'y') && requestInteractionHandle(element)) {
				slideStarted = true;
				element.isSliding = true;
				element.emit('slideStart', touch, boundingBox);
			} else {
				element.cancelSlide();
			}
			return;
		}

		if ((!axis || axis === 'x') && requestInteractionHandle(element)) {
			slideStarted = true;
			element.isSliding = true;
			element.emit('slideStart', touch, boundingBox);
		} else {
			element.cancelSlide();
		}
	}

	function touchEnd(e) {
		updateTouch(e);

		if (touch.touchCount > 0) {
			return;
		}

		if (slideStarted) {
			element.isSliding = false;
			var timeDelta = Date.now() - startTime;
			var swipe;
			if (axis) {
				swipe = swiped(touch[axis] - init[axis], timeDelta);
			} else {
				swipe = swiped(touch.x - init.x, timeDelta) && 'x' || swiped(touch.y - init.y, timeDelta) && 'y';
			}
			element.emit('slideEnd', touch, init, swipe);
		}

		slideInitiated = slideStarted = false;
		window.gui.wBody.removeListener('dom.touchmove', touchMove);
		window.gui.wBody.removeListener('dom.touchend', touchEnd);
		window.gui.wBody.removeListener('dom.touchcancel', cancel);
	}

	function cancel() {
		element.isSliding = false;
		if (slideStarted) {
			element.emit('slideCancel', touch, init, false);
		}
		slideInitiated = slideStarted = false;
		window.gui.wBody.removeListener('dom.touchmove', touchMove);
		window.gui.wBody.removeListener('dom.touchend', touchEnd);
		window.gui.wBody.removeListener('dom.touchcancel', cancel);
	}
	element.cancelSlide = cancel;

	element.on('dom.touchstart', function (e) {
		if (slideInitiated || lock) { return; }
		boundingBox = element.rootElement.getBoundingClientRect();
		updateTouch(e);

		startTime = Date.now();
		element.slideOut = false;
		slideInitiated = true;
		init = {
			x: touch.x,
			y: touch.y
		};

		window.gui.wBody.on('dom.touchmove', touchMove);
		window.gui.wBody.on('dom.touchend', touchEnd);
		window.gui.wBody.on('dom.touchcancel', cancel);
	});
}
module.exports = slideBehavior;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/slideBehavior/index.js
 ** module id = 48
 ** module chunks = 0
 **/