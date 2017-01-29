require('./styles.less');
var dimensions = require('dimensionsHelper').dimensions;
var slideBehavior = require('slideBehavior');
var tapBehavior = require('tapBehavior');


/**
 * Allows an element to be dragged around.
 * @param {WuiDom} element - what user can move around using the grip
 * @param {object} [options]
 * @param {WuiDom} [options.grip] - if omitted, a grip bar is added on top of the element
 * @param {boolean} [options.isFullScreen] - if omitted, the element can be moved around the map, not outside it
 * @param {boolean} [options.isCollapsable] - if true, element will be sent 'collapse' events
 */
function gripBehavior(element, options) {
	options = options || {};
	var leftLimit, rightLimit, topLimit, bottomLimit;

	function updateLimits() {
		if (options.isFullScreen) {
			leftLimit = 0;
			topLimit = 0;
			rightLimit = dimensions.screenWidth;
			bottomLimit = dimensions.screenHeight;
		} else {
			leftLimit = dimensions.mapLeft;
			topLimit = dimensions.mapTop;
			rightLimit = dimensions.mapRight;
			bottomLimit = dimensions.mapBottom;
		}
		enforceDragLimits();
	}

	var grip = options.grip || element.createChild('div', { className: 'gripHandler' });
	slideBehavior(grip);

	var touchStartX, touchStartY, elementStartX, elementStartY, posX, posY, maxX, maxY;
	var isMagnetLeft, isMagnetTop, isMagnetRight, isMagnetBottom;

	function enforceLimits() {
		posX = Math.max(leftLimit, Math.min(maxX, posX));
		posY = Math.max(topLimit, Math.min(maxY, posY));
		checkMagnet();
	}

	function checkMagnet() {
		isMagnetLeft =   posX === leftLimit;
		isMagnetTop =    posY === topLimit;
		isMagnetRight =  posX === maxX;
		isMagnetBottom = posY === maxY;
		element.toggleClassName('magnetLeft', isMagnetLeft);
		element.toggleClassName('magnetTop', isMagnetTop);
		element.toggleClassName('magnetRight', isMagnetRight);
		element.toggleClassName('magnetBottom', isMagnetBottom);
		element.toggleClassName('magnetFloating', !isMagnetLeft && !isMagnetTop && !isMagnetRight && !isMagnetBottom);
	}

	function applyMagnet() {
		if (isMagnetLeft)   { posX = leftLimit; }
		if (isMagnetTop)    { posY = topLimit; }
		if (isMagnetRight)  { posX = maxX; }
		if (isMagnetBottom) { posY = maxY; }
	}

	function setElementPos() {
		element.setStyles({
			webkitTransform: '',
			left: posX + 'px',
			top:  posY + 'px',
			right: 'initial',
			bottom: 'initial'
		});
		checkMagnet();
	}

	// Reads and keep current position / limits of the element
	function storePosAndLimits() {
		var elementWidth = element.rootElement.clientWidth;
		var elementHeight = element.rootElement.clientHeight;
		if (!elementWidth || !elementHeight) { return false; }
		posX = element.rootElement.offsetLeft;
		posY = element.rootElement.offsetTop;
		maxX = rightLimit - elementWidth;
		maxY = bottomLimit - elementHeight;
		return true;
	}

	grip.on('slideStart', function (touch) { // NB: second param is boundingBox of the grip; not used here
		touchStartX = touch.x;
		touchStartY = touch.y;

		storePosAndLimits();
		elementStartX = posX;
		elementStartY = posY;

		element.addClassNames('dragging');
		element.emit('dragStart');
	});

	grip.on('slide', function (touch) {
		posX = elementStartX + touch.x - touchStartX;
		posY = elementStartY + touch.y - touchStartY;
		enforceLimits();
		var deltaX = posX - elementStartX;
		var deltaY = posY - elementStartY;

		element.setStyle('webkitTransform', 'translate3d(' + deltaX + 'px, ' + deltaY + 'px, 0)');
	});

	grip.on('slideEnd', function () {
		setElementPos();
		element.delClassNames('dragging');
		element.emit('dragEnd');
	});

	var mustEnforceLimits = false;

	// Move element to a "legal" position
	function enforceDragLimits() {
		mustEnforceLimits = false;
		if (!storePosAndLimits()) { return; }
		enforceLimits();
		applyMagnet();
		setElementPos();
	}

	updateLimits();

	window.gui.on('resize', updateLimits);

	if (options.isCollapsable) {
		grip.createChild('div', { className: 'collapseBtn' });
		tapBehavior(grip);
		grip.on('tap', function () { element.collapse(!element.isCollapsed); });

		element.isCollapsed = false;

		element.collapse = function (isCollapsed, isSilent) { // if isSilent we don't emit 'collapsed' event
			element.isCollapsed = isCollapsed;
			element.toggleClassName('collapsed', isCollapsed);
			mustEnforceLimits = true;
			if (!isSilent) {
				element.emit('collapse', isCollapsed); // in response, element might emit 'resized' event - OR NOT
			}
			if (mustEnforceLimits) { enforceDragLimits(); } // if element did not emit 'resized', we enforce limits now
		};
	}
	element.on('resized', enforceDragLimits);
}

module.exports = gripBehavior;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/gripBehavior/index.js
 ** module id = 437
 ** module chunks = 0
 **/