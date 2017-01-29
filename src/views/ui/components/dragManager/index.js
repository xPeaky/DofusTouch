require('./styles.less');
var eventHandler = require('./eventHandler.js');
var EventEmitter = require('events.js').EventEmitter;
var hoverBehavior = require('hoverBehavior');
var tweener = require('tweener');
var WuiDom = require('wuidom');

var dragManager = new EventEmitter();
var lock = false;

dragManager.isDragging = false;
var dropZone = null;

// dragged data
var sourceElement = null;
var sourceData = null;

var originalCoordinates = { x: 0, y: 0 };
var originalSylePosition = { left: 0, top: 0 };

var startCoordinates = { x: 0, y: 0 };
var dropCoordinates = { x: 0, y: 0 };

var offsetX, offsetY;

// dragged UI
var dragElement;
var dragElementParent;
var defaultDragElement;
var iconInfo;

function reset() {
	lock = false;
	sourceElement = sourceData = null;
	dragElement = dragElementParent = iconInfo = null;
}

dragManager.init = function (container) {
	defaultDragElement = new WuiDom('div', { className: 'dragElement' });
	defaultDragElement.icon = defaultDragElement.createChild('div', { className: 'icon' });
	container.appendChild(defaultDragElement);
	defaultDragElement.hide();

	// didn't drop on a dropZone
	window.gui.wBody.on('dom.drop', function () {
		tweener.tween(dragElement,
			{ webkitTransform: 'translate3d(0,0,0) scale(1)' },
			{ time: 100, easing: 'ease-out' }, function () {
				if (iconInfo.onDragClassName) {
					dragElement.delClassNames(iconInfo.onDragClassName);
				}

				dragManager.isLostDrop = true;

				if (dragElement !== defaultDragElement) {
					dragElementParent.appendChild(dragElement);
					dragElement.delClassNames('customDragElement');
					dragElement.setStyles(originalSylePosition);
					dragElement.emit('dragEnd', dropCoordinates.x, dropCoordinates.y);
				} else {
					defaultDragElement.hide();
					sourceElement.emit('dragEnd', dropCoordinates.x, dropCoordinates.y);
				}
				dragManager.emit('dragEnd', sourceElement, sourceElement._dragManager.source, sourceData);
				defaultDragElement.hide();
				reset();
			}
		);
	});
};

function placeDragElement(x, y) {
	var scale = 1.5;
	var extraXOffset = 0;
	var extraYOffset = 0;
	var extraRotation = 0;
	if (dragElement.customScale !== undefined && dragElement.customScale !== null) {
		scale = dragElement.customScale;
	}
	if (dragElement.customXOffset !== undefined && dragElement.customXOffset !== null) {
		extraXOffset = dragElement.customXOffset;
	}
	if (dragElement.customYOffset !== undefined && dragElement.customYOffset !== null) {
		extraYOffset = dragElement.customYOffset;
	}
	if (dragElement.customRotation !== undefined && dragElement.customRotation !== null) {
		extraRotation = dragElement.customRotation;
	}
	var posX = x - startCoordinates.x - offsetX + extraXOffset;
	var posY = y - startCoordinates.y - offsetY + extraYOffset;
	dragElement.setStyle(
		'webkitTransform',
		'translate3d(' + posX + 'px, ' + posY + 'px, 0) scale(' + scale + ') rotateZ(' + extraRotation + 'deg)'
	);
}

function onDragEnd(x, y) {
	eventHandler.removeListener('dragMove', placeDragElement);
	dragManager.isDragging = false;
	if (dropZone) {
		dropZone.delClassNames('dragOver', 'notAllowed');
		dropZone = null;
	}

	dropCoordinates.x = x;
	dropCoordinates.y = y;

	// retrieve the dom element at the drop location, the dragElement need to be hidden
	var touchedElement = document.elementFromPoint(x, y);

	if (touchedElement) {
		var event = document.createEvent('Event');
		event.initEvent('drop', true, true);
		touchedElement.dispatchEvent(event); // make this element emit 'drop'
	}

	hoverBehavior.stop();
}

dragManager.setElementSource = function (wElement, source) {
	if (!wElement._dragManager) { return; }

	wElement._dragManager.source = source;
};

/** Returns true if the element was given the draggable behavior (with setDraggable) */
dragManager.isDraggable = function (wElement) {
	return wElement._dragManager && wElement._dragManager.draggable;
};

dragManager.setDraggable = function (wElement, uiInfo, source, data, options) {
	wElement._dragManager = wElement._dragManager || {};
	if (wElement._dragManager.draggable) { return; }
	wElement._dragManager.draggable = true;
	wElement._dragManager.source = source;

	options = options || {};
	uiInfo = uiInfo || {};

	eventHandler.initializeListeners(wElement, options);

	wElement.on('_dragStart', function (x, y) {
		dragElement = options.dragElement ? wElement : defaultDragElement;
		if (lock) { return; }
		if (uiInfo.prepareForDrag && !uiInfo.prepareForDrag(data, dragElement)) { return; }
		lock = true;
		dragManager.isDragging = true;
		sourceElement = wElement;
		sourceData = data;
		iconInfo = uiInfo;

		var clientRect = wElement.rootElement.getBoundingClientRect();
		var rect = { // clientRect is read only
			left: clientRect.left,
			top: clientRect.top,
			width: options.containerWidth || clientRect.width,
			height: options.containerHeight || clientRect.height
		};
		originalCoordinates.x = rect.left;
		originalCoordinates.y = rect.top;

		if (options.dragElement) {
			dragElementParent = wElement.getParent();
			window.gui.gameGuiContainer.appendChild(wElement);

			originalSylePosition.left = wElement.getStyle('left');
			originalSylePosition.top = wElement.getStyle('top');

			dragElement.setStyles({
				left: rect.left + 'px',
				top: rect.top + 'px',
				webkitTransform: 'translate3d(0,0,0)'
			});

			dragElement.addClassNames('customDragElement');
		} else {
			originalSylePosition.left = originalSylePosition.top = 0;

			dragElement.setStyles({
				left: rect.left + 'px',
				top: rect.top + 'px',
				width: rect.width + 'px',
				height: rect.height + 'px',
				webkitTransform: 'translate3d(0,0,0)'
			});

			var styles = iconInfo.styles || {};
			styles.backgroundImage = iconInfo.backgroundImage || styles.backgroundImage || 'none';
			dragElement.icon.setStyles(styles);
		}

		if (iconInfo.onDragClassName) {
			dragElement.addClassNames(iconInfo.onDragClassName);
		}

		dragElement.show();
		offsetX = rect.left + Math.floor(rect.width / 2) - x;
		offsetY = rect.top + Math.floor(rect.height / 2) - y;

		startCoordinates.x = x;
		startCoordinates.y = y;

		tweener.tween(
			dragElement,
			{ webkitTransform: 'translate3d(' + -offsetX + 'px,' + -offsetY + 'px,0) scale(1.5)' },
			{ time: 100, easing: 'ease-out' },
			function () {
				eventHandler.on('dragMove', placeDragElement);
				if (!options.noHover) {
					hoverBehavior.start();
				}
				wElement.emit('dragStart');
				dragManager.emit('dragStart', sourceElement, sourceElement._dragManager.source, sourceData);
			}
		);

		eventHandler.once('dragEnd', onDragEnd);
	});
};

dragManager.setDragEnable = function (wElement, enable) {
	if (!wElement._dragManager) { return; }

	wElement._dragManager.enable = enable;
};

dragManager.enableDrag = function (wElement) {
	dragManager.setDragEnable(wElement, true);
};

dragManager.disableDrag = function (wElement) {
	dragManager.setDragEnable(wElement, false);
};

dragManager.cancelDragFromSource = function (source) {
	if (!sourceElement || source !== sourceElement._dragManager.source) {
		return;
	}
	dragManager.cancelDrag();
};

dragManager.cancelDrag = function () {
	if (iconInfo && iconInfo.onDragClassName) {
		dragElement.delClassNames(iconInfo.onDragClassName);
	}
	eventHandler.cancel();
};

dragManager.setDroppable = function (wElement, allowedSources, options) {
	wElement._dragManager = wElement._dragManager || {};
	if (wElement._dragManager.droppable) { return; }
	wElement._dragManager.droppable = true;

	options = options || {};

	hoverBehavior(wElement);

	function isAllowed() {
		var optionalAllowedFunc = options.isAllowed;
		var optionalIsAllowed = true;
		if (optionalAllowedFunc) {
			optionalIsAllowed = optionalAllowedFunc();
		}
		return allowedSources.indexOf(sourceElement._dragManager.source) !== -1 && optionalIsAllowed;
	}

	wElement.on('touchenter', function () {     // hover behavior
		if (!dragManager.isDragging || !isAllowed()) {
			return;
		}

		dropZone = wElement;
		wElement.addClassNames('dragOver');
		wElement.emit('dragEnter', sourceElement, sourceElement._dragManager.source, sourceData);
	});

	wElement.on('touchleave', function () {     // hover behavior
		if (!dragManager.isDragging || !isAllowed()) {
			return;
		}

		dropZone = null;
		wElement.delClassNames('dragOver');
		wElement.emit('dragLeave');
	});

	wElement.on('dom.drop', function (event) {
		if (!isAllowed()) { return; }
		event.stopPropagation();

		var posX, posY;
		if (options.matchPositionOnDrop) {
			var rect = wElement.rootElement.getBoundingClientRect();
			posX = rect.left - startCoordinates.x + Math.floor(rect.width / 2) - offsetX;
			posY = rect.top - startCoordinates.y + Math.floor(rect.height / 2) - offsetY;
		} else {
			posX = dropCoordinates.x - startCoordinates.x;
			posY = dropCoordinates.y - startCoordinates.y;
		}
		wElement.emit('beforeDragEnd');
		tweener.tween(
			dragElement,
			{ webkitTransform: 'translate3d(' + posX + 'px,' + posY + 'px,0) scale(1)' },
			{ time: 100, easing: 'ease-out' },
			function () {
				sourceData = sourceData || {};
				sourceData.x = dropCoordinates.x;
				sourceData.y = dropCoordinates.y;

				if (iconInfo.onDragClassName) {
					dragElement.delClassNames(iconInfo.onDragClassName);
				}

				if (dragElement !== defaultDragElement) {
					dragElementParent.appendChild(dragElement);
					dragElement.delClassNames('customDragElement');
					dragElement.setStyles({
						left: originalSylePosition.left,
						top: originalSylePosition.top,
						webkitTransform:
							'translate3d(' +
							0 + 'px,' +
							0 + 'px, 0)'
					});
					dragElement.emit('dragEnd', posX, posY);
				} else {
					sourceElement.emit('dragEnd', posX, posY);
				}
				dragManager.isLostDrop = false;
				dragManager.emit('dragEnd', sourceElement, sourceElement._dragManager.source, sourceData);
				wElement.delClassNames('dragOver');
				wElement.emit('drop', sourceElement, sourceElement._dragManager.source, sourceData);
				defaultDragElement.hide();
				reset();
			}
		);
	});
};

module.exports = dragManager;




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/dragManager/index.js
 ** module id = 185
 ** module chunks = 0
 **/