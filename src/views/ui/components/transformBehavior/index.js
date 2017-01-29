var getPosition = require('tapHelper').getPosition;
var interactionHandler = require('interactionHandler');
var isDevice = require('deviceInfo').isDevice;

var WHEEL_ZOOM_RATIO = 1.2;

// Translate threshold: 2 thresholds below are COMBINED (e.g. 150% of a threshold + 50% of the other is enough)
var DISTANCE_THRESHOLD = 40;  // Minimum number of px
var TIME_THRESHOLD = 100; // Minimum number of ms

// Scale transformation threshold
var DISTANCE_VARIATION_THRESHOLD = 10;  // Minimum number of distance variation (px)


/** This behavior handles "translation" and "scale" transformations (e.g. slide and pinch).
 *  If sensitivity is 'HIGH', we trigger the behavior more easily.
 *  For example, a clumsy, "fat" and slow finger touch will still trigger the behavior.
 *  If sensitivity is 'LOW', this behavior will be triggered less easily
 *  (i.e. giving more chances to other behaviors like "tap")
 */
function transformBehavior(element, sensitivity) {
	if (element._transformBehavior) { return; }
	element._transformBehavior = true;

	element.allowDomEvents();

	var cancelled = false,
		initiated = false,
		started = false;

	var boundingBox, previousCenter, previousDistance, initTouches, initTime;

	if (!isDevice) {
		element.on('dom.wheel', function (event) {
			if (!interactionHandler.requestInteractionHandle(element)) { return; }
			boundingBox = element.rootElement.getBoundingClientRect();
			var zoomRatio = (event.wheelDeltaY > 0 ? WHEEL_ZOOM_RATIO : 1 / WHEEL_ZOOM_RATIO);
			element.emit('transform', event.x - boundingBox.left, event.y - boundingBox.top, 0, 0, zoomRatio);
		});
	}

	function getDistance(touch1, touch2) {
		return Math.sqrt(Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2));
	}

	element.isTransforming = false;

	var lockTranslate = false;
	element.setTranslationEnable = function (enable) {
		lockTranslate = !enable;
	};

	// We add 2 threshold ratios, hence "2" below (200%); "HIGH" sensitivity is 3 times more sensitive
	var combinedMoveTreshold = 2 / (sensitivity === 'HIGH' ? 3 : 1);

	function canBehaviorStart(touch1, touch2) {
		var initTouch1 = initTouches[0];

		// Check for translation
		if (!lockTranslate) {
			var distance = getDistance(touch1, initTouch1);
			var delay = Date.now() - initTime;
			if (distance / DISTANCE_THRESHOLD + delay / TIME_THRESHOLD >= combinedMoveTreshold) {
				return true;
			}
		}

		// Check for scale
		if (!touch2) { return false; }
		var initTouch2 = initTouches[1];
		if (!initTouch2) {
			initTouch2 = initTouches[1] = touch2;
		}
		var distanceVariation = Math.abs(getDistance(initTouch1, initTouch2) - getDistance(touch1, touch2));
		return distanceVariation > DISTANCE_VARIATION_THRESHOLD;
	}

	function onMove(event) {
		var touch = getPosition(event);
		var touch1 = touch.touches[0];
		var touch2 = touch.touches[1];

		if (!started) {
			if (!canBehaviorStart(touch1, touch2)) { return; }

			if (!interactionHandler.requestInteractionHandle(element)) {
				element.cancelTransform();
			} else {
				started = true;
				element.isTransforming = true;
				element.emit('transformStart', touch, initTouches);
			}
			return;
		}

		var center = touch1;
		var scale = 1;

		if (touch2) {
			center = {
				x: (touch1.x + touch2.x) / 2,
				y: (touch1.y + touch2.y) / 2
			};

			var distance = getDistance(touch1, touch2);
			if (previousDistance) {
				scale = distance / previousDistance;
			}
			previousDistance = distance;
		}

		center.x -= boundingBox.left;
		center.y -= boundingBox.top;

		previousCenter = previousCenter || center;

		var translateX = lockTranslate ? 0 : center.x - previousCenter.x;
		var translateY = lockTranslate ? 0 : center.y - previousCenter.y;
		element.emit('transform', center.x, center.y, translateX, translateY, scale, touch);

		previousCenter = center;
	}

	element.cancelTransform = function () {
		if (!initiated) { return; }
		cancelled = true;
		previousCenter = previousDistance = null;
		initiated = false;
		element.removeListener('dom.touchmove', onMove);
		element.isTransforming = false;
		if (started) {
			element.emit('transformEnd');
		}
	};

	element.on('dom.touchstart', function (event) {
		previousCenter = previousDistance = null;
		if (initiated || cancelled) { return; }

		var touch = getPosition(event);
		if ((lockTranslate && touch.touchCount !== 2) || touch.touchCount > 2) { return; }

		boundingBox = element.rootElement.getBoundingClientRect();
		initiated = true;
		started = false;
		initTouches = touch.touches;
		initTime = Date.now();
		element.on('dom.touchmove', onMove);
	});

	element.on('dom.touchend', function (event) {
		previousCenter = previousDistance = null;
		var touch = getPosition(event);
		if (cancelled || touch.touchCount !== 0) {
			cancelled = false;
			return;
		}

		element.removeListener('dom.touchmove', onMove);
		initiated = false;
		if (!started) { return; }
		element.isTransforming = false;
		element.emit('transformEnd', touch);
	});
}
module.exports = transformBehavior;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/transformBehavior/index.js
 ** module id = 285
 ** module chunks = 0
 **/