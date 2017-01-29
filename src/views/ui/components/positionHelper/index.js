var dimensions = require('dimensionsHelper').dimensions;

/**
 * Position an element next to a selected target.
 * The target can be anywhere "around the screen border"
 *  @param {WuiDom} element - the WuiDom element to be positioned.
 *  @param {WuiDom} target - the WuiDom element that will be the target of position calculation.
 *  @param {object} [options] - positioning options. Only padding is now taken into account.
 *  @param {number} [options.padding] - the value in pixel of a desire padding.
 */
exports.positionNextTo = function (element, target, options) {
	// we need the element to be visible so that getBoundingClientRect returns correct data
	element.setStyle('opacity', 0);
	element.show();
	var targetBound = target.rootElement.getBoundingClientRect(); //NB: getBoundingClientRect may return float values
	var elemBound = element.rootElement.getBoundingClientRect();

	var left = 0, top = 0;

	if (options && options.padding) {
		var padding = options.padding;
		elemBound.width += padding * 2;
		elemBound.height += padding * 2;
	}

	if (targetBound.left > elemBound.width) {
		left = targetBound.left - elemBound.width; //notif on the left of target
	} else if (dimensions.screenWidth - targetBound.right > elemBound.width) {
		left = targetBound.left + targetBound.width; //notif on the right on target
	}

	if (dimensions.screenHeight - targetBound.bottom + targetBound.height > elemBound.height) {
		top = targetBound.top; //notif top aligned to target top
	} else if (targetBound.top + targetBound.height > elemBound.height) {
		top = targetBound.top + targetBound.height - elemBound.height; //notif bottom aligned to target bottom
	} else {
		top = dimensions.screenHeight - elemBound.height; //notif aligned to screen bottom
	}
	// finally we can move and show the element
	element.setStyles({ left: Math.round(left) + 'px', top: Math.round(top) + 'px' });
	element.setStyle('opacity', 1);
};

// added offset so that we always give position around our finger, not exactly under our finger
var EXTRA_OFFSET = 42; // in px
var EXTRA_OFFSET_HALF = EXTRA_OFFSET / 2;
var OFFSET_FROM_SCREEN = 10;

/**
 * Computes an x,y position for a tooltip or menu. Goal is to avoid a given area as much as possible.
 * @param {number} eltWidth - width of the tooltip or menu etc. we will position
 * @param {number} eltHeight - height of the tooltip or menu etc. we will position
 * @param {number} xMin - "left" of the rectangle to avoid
 * @param {number} xMax - "right" of the rectangle to avoid
 * @param {number} yMin - "top" of the rectangle to avoid
 * @return {object} - {x: {number},y: {number}}
 */
function getPosition(eltWidth, eltHeight, xMin, xMax, yMin) {
	// Try on the left of the target
	var x = xMin - eltWidth;
	if (x < OFFSET_FROM_SCREEN) {
		x = xMax;
		// If tooltip/menu would reach the right edge of screen, bring it back to the left
		// (only useful when area to avoid is very wide)
		if (x + eltWidth > dimensions.screenWidth) {
			x = Math.max(0, dimensions.screenWidth - eltWidth);
		}
	}

	// For y the rules are simpler: try to put it above target, but not higher than the top of screen
	var y = Math.max(yMin - eltHeight, OFFSET_FROM_SCREEN);

	return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Gives the closest position to place an element with given coordinates.
 * Used by tooltips and contextual menus by default
 * @param {WuiDom} element
 * @param {number} x
 * @param {number} y
 * @returns {Object} - {x: {number},y: {number}}
 */
exports.getElementPositionAt = function (element, x, y) {
	return getPosition(
		element.rootElement.clientWidth,
		element.rootElement.clientHeight,
		x - EXTRA_OFFSET_HALF,
		x + EXTRA_OFFSET_HALF,
		y - EXTRA_OFFSET_HALF
	);
};

var DEFAULT_VERTICAL_MARGIN = 60;

/**
 * Compute the position of an element (menu, tooltip, etc.) from position on the screen (usually a tap position).
 * @param {WuiDom} element
 * @param {number} xOrigin - it is recommended to pass the tap position OR the center of the object tapped on
 * @param {number} yOrigin - it is recommended to pass the tap position OR the center of the object tapped on
 * @param {Object} options
 * @param {number} options.verticalMargin - distance wanted between (xOrigin, yOrigin) and the element
 * @returns {Object} - {x: {number},y: {number}}
 */
exports.getElementPositionCenteredAt = function (element, xOrigin, yOrigin, options) {
	options = options || {};
	var eltWidth = element.rootElement.clientWidth;
	var eltHeight = element.rootElement.clientHeight;

	var x = xOrigin - eltWidth / 2;
	if (x < OFFSET_FROM_SCREEN) {
		x = OFFSET_FROM_SCREEN;
	} else if (x + eltWidth > dimensions.screenWidth - OFFSET_FROM_SCREEN) {
		x = dimensions.screenWidth - OFFSET_FROM_SCREEN - eltWidth;
	}

	var yMargin = options.verticalMargin !== undefined ? options.verticalMargin : DEFAULT_VERTICAL_MARGIN;
	var y = yOrigin - eltHeight - yMargin;
	if (y < OFFSET_FROM_SCREEN) {
		y = yOrigin + yMargin;
	}

	return { x: Math.round(x), y: Math.round(y) };
};

/**
 * Gives the closest coordinates to position an element around a target.
 * Used by tooltips and contextual menus by default
 * @param {WuiDom} element
 * @param {WuiDom} target
 * @returns {Object} - {x: {number},y: {number}}
 */
exports.getElementPositionAround = function (element, target) {
	var targetElement = target.rootElement.getBoundingClientRect();

	var halfWidth = targetElement.width / 2;
	var halfHeight = targetElement.height / 2;

	var centerX = targetElement.left + halfWidth;
	var centerY = targetElement.top + halfHeight;

	halfWidth = halfWidth < EXTRA_OFFSET_HALF ? EXTRA_OFFSET_HALF : halfWidth;
	halfHeight = halfHeight < EXTRA_OFFSET_HALF ? EXTRA_OFFSET_HALF : halfHeight;

	return getPosition(
		element.rootElement.clientWidth,
		element.rootElement.clientHeight,
		centerX - halfWidth,
		centerX + halfWidth,
		centerY - halfHeight
	);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/positionHelper/index.js
 ** module id = 202
 ** module chunks = 0
 **/