require('./styles.less');
var dimensions = require('dimensionsHelper').dimensions;
var tapHelper = require('tapHelper');
var getPosition = tapHelper.getPosition;
var requestInteractionHandle = require('interactionHandler').requestInteractionHandle;

var WINDOW_MIN_WIDTH = 300; // (pixels)
var WINDOW_MIN_HEIGHT = 300; // (pixels)

function resizeBehavior(element, options) {
	options = options || {};

	var minWidth = options.minWidth || WINDOW_MIN_WIDTH;
	var minHeight = options.minHeight || WINDOW_MIN_HEIGHT;

	element.resizeHandle = element.createChild('div', { className: 'resizeHandle' });
	element.resizeHandle.allowDomEvents();

	var resizing = false;
	var initialSize = { w: null, h: null };
	var initialPosition = { x: null, y: null };
	var currentSize = { w: null, h: null };

	function onResizeStart(e) {
		if (resizing || !requestInteractionHandle(element)) {
			return;
		}
		resizing = true;

		initialSize.w = currentSize.w = element.rootElement.clientWidth;
		initialSize.h = currentSize.h = element.rootElement.clientHeight;

		var touch = getPosition(e);
		initialPosition.x = touch.x;
		initialPosition.y = touch.y;

		element.emit('resizeStart');

		window.gui.wBody.once('dom.touchend', onResizeEnd);
		window.gui.wBody.on('dom.touchmove', onResize);
		onResize(e);
	}

	function onResize(e) {
		var touch = getPosition(e);

		var deltaW = touch.x - initialPosition.x;
		var deltaH = touch.y - initialPosition.y;

		currentSize.w = initialSize.w + deltaW;
		currentSize.h = initialSize.h + deltaH;
		currentSize.w = Math.min(Math.max(currentSize.w, minWidth), dimensions.windowFullScreenWidth);
		currentSize.h = Math.min(Math.max(currentSize.h, minHeight), dimensions.windowFullScreenHeight);

		element.setStyles({ width: currentSize.w + 'px', height: currentSize.h + 'px' });
	}

	function onResizeEnd() {
		window.gui.wBody.removeListener('dom.touchmove', onResize);
		resizing = false;
		element.windowWidth = currentSize.w;
		element.windowHeight = currentSize.h;
		element.emit('resize');
	}

	element.resizeHandle.on('dom.touchstart', onResizeStart);
}

module.exports = resizeBehavior;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/resizeBehavior/index.js
 ** module id = 457
 ** module chunks = 0
 **/