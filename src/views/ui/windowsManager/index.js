require('./styles.less');
var dimensions = require('dimensionsHelper').dimensions;
var EventEmitter = require('events.js').EventEmitter;
var tweener = require('tweener');
var tapBehavior = require('tapBehavior');
var slideBehavior = require('slideBehavior');

var MIN_WIN_TOP_VISIBILITY = 40; //px - how much of the top of a window should be made visible so user can grab it

var windowsManager = new EventEmitter();

var windows = {};
var currentDialog = null;
var focusedWindow = null;
var lastClosedId = null;


/** This is called when a window DOES finish closing which happens in 2 cases:
 * either the closing tweener completed OR we cancelled it because the window is reopening RIGHT-NOW */
function finishClosingWindow(thisWindow, params) {
	/*
	This line should be on the top in case of chained windows
	if on the window's closed event we call open on windowsManager.open:
	if closingTweener is still present, finishClosingWindow function is
	call again (infinite  loop)
	*/
	delete thisWindow.closingTweener;

	thisWindow.hide();
	thisWindow.emit('closed', params);
	windowsManager.emit('closed', { id: thisWindow.id });
}

/** This is called when a window DOES finish opening which happens in 2 cases:
 * either the opening tweener completed OR we cancelled it because the window is closing RIGHT-NOW
 *  @param {WuiDom} thisWindow - the window which is opening
 *  @param {map} [params] - opening parameters (passed by the caller to WindowsManager)
 *  @param {boolean} [aborted] - true if the window is closing before finishing the open sequence
 *         ...in which case we will not send the 'opened' events.
 */
function finishOpeningWindow(thisWindow, params, aborted) {
	if (!aborted) {
		thisWindow.emit('opened', params);
		windowsManager.emit('opened', { id: thisWindow.id });
	}
	delete thisWindow.openingTweener;
}

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @method closeWindow
 *  @desc   close a window.
 *  @private
 *
 * @param {String} id      - window id.
 * @param {Mixed} [params] - optional params to send with 'close' event
 */
function closeWindow(id, params) {
	var thisWindow = windows[id];
	if (!thisWindow) {
		return console.error('Invalid window: ' + id);
	}

	if (!thisWindow.openState) { // window was not open
		return;
	}
	if (thisWindow.openingTweener) {
		thisWindow.openingTweener.cancel();
		finishOpeningWindow(thisWindow, null, /*aborted=*/true);
	}

	if (thisWindow === focusedWindow) {
		focusedWindow = null;
	}

	thisWindow.openState = false;
	lastClosedId = id;

	thisWindow.emit('close', params);
	windowsManager.emit('close', { id: id });

	var position = thisWindow.position;
	thisWindow.closingTweener = tweener.tween(
		thisWindow,
		{ opacity: 0, webkitTransform: 'translate3d(' + position.x + 'px,' + position.y + 'px,0) scale(0.8)' },
		{ time: 150, delay: 0, easing: 'ease-out' },
		function () { finishClosingWindow(thisWindow, params); }
	);
}

function closeDialog() {
	if (!currentDialog) {
		return;
	}

	for (var i = 0, len = currentDialog.length; i < len; i += 1) {
		closeWindow(currentDialog[i]);
	}

	currentDialog = null;
	window.foreground.unlock('windowsManagerDialog');
}


windowsManager.makeMovable = function (thisWindow, grip) {
	grip = grip || thisWindow.windowHeadWrapper;
	slideBehavior(grip);
	var posX, posY, startX, startY, winWidth, minHeight;

	grip.on('slideStart', function (touch, headerBox) {
		if (!thisWindow.openState) {
			return grip.cancelSlide(); // blocks slide while window closing anim is playing
		}
		var winRect = thisWindow.rootElement.getBoundingClientRect();
		var offsetX  = headerBox.left - winRect.left;
		var offsetY  = headerBox.top - winRect.top;
		winWidth = winRect.width;
		minHeight = headerBox.height + offsetY;
		startX = touch.x - headerBox.left + offsetX;
		startY = touch.y - headerBox.top + offsetY;
		posX = thisWindow.position.x;
		posY = thisWindow.position.y;
	});

	grip.on('slideEnd', function () {
		thisWindow.position.x = posX;
		thisWindow.position.y = posY;
		thisWindow.emit('positioned');
	});

	grip.on('slideCancel', function () {
		thisWindow.setStyle('webkitTransform',
			'translate3d(' + thisWindow.position.x + 'px,' + thisWindow.position.y + 'px,0)');
	});

	grip.on('slide', function (touch) {
		posX = touch.x - startX;
		posY = touch.y - startY;

		if (posX < 0) {
			posX = 0;
		} else if (posX + winWidth > dimensions.windowFullScreenWidth) {
			posX = dimensions.windowFullScreenWidth - winWidth;
		}

		if (posY < 0) {
			posY = 0;
		} else if (posY + minHeight > dimensions.windowFullScreenHeight) {
			posY = dimensions.windowFullScreenHeight - minHeight;
		}

		thisWindow.setStyle('webkitTransform', 'translate3d(' + posX + 'px, ' + posY + 'px, 0)');
	});
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @method initialize
 *  @desc   Initialize windowManager.
 *
 * @param {Object} gui - reference to gui.
 */
windowsManager.initialize = function (gui) {
	gui.on('disconnect', function () {
		currentDialog = null;
		lastClosedId = null;
	});

	/** @event module:protocol/roleplay.client_ExchangeLeaveMessage */
	gui.on('ExchangeLeaveMessage', closeDialog);
	/** @event module:protocol/roleplay.client_LeaveDialogMessage */
	gui.on('LeaveDialogMessage', closeDialog);
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @method addWindow
 *  @desc   Add a new window in the pool.
 *
 * @param {String} id           - window id
 * @param {WuiDom} windowObject - window itself
 * @param {Object} [options]    - options parameters
 * @param {String} options.group     - if window is a group
 * @param {String} options.className - window style
 * @param {WuiDom} options.container - the container to append the window to: gui.windowContainer by default
 */
windowsManager.addWindow = function (id, windowObject, options) {
	options = options || {};

	windows[id] = windowObject;

	windowObject.id = id;
	if (options.group) {
		windowObject.group = options.group;
	}
	windowObject.hide();
	windowObject.openState = false;
	var container = options.container || window.gui.windowsContainer;
	container.appendChild(windowObject);

	// force the focus of the window when being touched.
	function focusWindow() {
		windowsManager.focusWindow(id);
	}

	windowObject.allowDomEvents();
	windowObject.on('dom.touchstart', focusWindow);

	tapBehavior(windowObject.header);
	windowObject.header.on('doubletap', function () {
		windowsManager.positionWindow(id);
	});

	if (!options.fixed) {
		windowsManager.makeMovable(windowObject);
	}
};

/** Helper for responsive size (width or height) computing.
 *  @param {string|number} value - '[-]n[px|%]' e.g. "20px" or "20%" or "-20px" or "-20%" or 20 or -20
 *                          NB: "" is valid and returns 0
 *  @return {number} the computed value, e.g. 255 or 255.6666 etc. */
function percentOrPixels(value, canvasSize) {
	if (typeof value === 'number') {
		return value;
	}

	var len = value.length;
	if (value[len - 1] === '%') {
		// proportional to canvas size
		return canvasSize * value.substr(0, len - 1) / 100;
	} else {
		// absolute
		if (value.substr(len - 2) === 'px') {
			value = value.substr(0, len - 2);
		}
		value *= 1; // converts to number (int or float we don't want to know)
		return value;
	}
}

function getDimensionValue(value, offset, canvasSize) {
	value = value.substr(1);
	if (!value) {
		return offset;
	}
	return offset + percentOrPixels(value, canvasSize);
}

function getCenterValue(value, canvasSize, size) {
	var centered = (canvasSize - size) / 2;
	return getDimensionValue(value, centered, canvasSize);
}


/** Helper for responsive position (left or top) computing.
 *  @param {string} value - '[c][+|-]n[px|%]' e.g. "c-20px" or "c+20%" or "-20px" or "-20%" or 20 or -20
 *  @return {number} the computed value, e.g. 255 or 255.6666 etc. */
function getPositionValue(value, canvasSize, size) {
	switch (value[0]) {
		case 'c':
			return getCenterValue(value, canvasSize, size);
		case 'w':
			return getDimensionValue(value, canvasSize, canvasSize);
		case 'h':
			return getDimensionValue(value, canvasSize, canvasSize);
		default:
			return percentOrPixels(value, canvasSize);
	}
}

/** Builds a style map from a style string description
 *  @param {string} positionInfo - e.g. "40px 20px 320px -100px" or "25% 17% 50% 67%" or "c c-20px 450px 300px"
 *  @return {object} e.g. { left: "10px", top: "50px", width: "200px", height: "200px" } */
function buildWindowStyleFromInfo(positionInfo) {
	var width = 0, height = 0, left = 0, top = 0;
	var viewportWidth = dimensions.windowFullScreenWidth || dimensions.screenWidth;
	var viewportHeight = dimensions.windowFullScreenHeight || dimensions.screenHeight;

	// NB: being full screen is now the default *except* for iOS-size layout, so this "isFullScreen" flag is only
	// needed until we decide to allow windows to hide the toolbar in iOS too.
	if (positionInfo.isFullScreen) {
		viewportWidth = dimensions.screenWidth;
		viewportHeight = dimensions.screenHeight;
	}

	if (positionInfo.mustAvoidToolbar) {
		viewportWidth = dimensions.screenExceptToolbar.width;
		viewportHeight = dimensions.screenExceptToolbar.height;
	}

	if (positionInfo.width) {
		width = getPositionValue(positionInfo.width, viewportWidth);

		var maxWidth = positionInfo.maxWidth || viewportWidth;
		width = maxWidth && maxWidth < width ? maxWidth : width;
	}

	if (positionInfo.height) {
		height = getPositionValue(positionInfo.height, viewportHeight);

		var maxHeight = Math.min(positionInfo.maxHeight || viewportHeight, viewportHeight);
		height = Math.min(height, maxHeight);
	}

	if (positionInfo.minHeight) {
		var minHeight = getPositionValue(positionInfo.minHeight, viewportHeight);
		height = Math.max(minHeight, height);
	}

	if (positionInfo.minWidth) {
		var minWidth = getPositionValue(positionInfo.minWidth, viewportHeight);
		width = Math.max(minWidth, width);
	}

	var hasLeft = positionInfo.hasOwnProperty('left');
	if (hasLeft || positionInfo.hasOwnProperty('x')) {
		left = getPositionValue(hasLeft ? positionInfo.left : positionInfo.x, viewportWidth, width);
	}

	if (positionInfo.hasOwnProperty('right')) {
		var right = getPositionValue(positionInfo.right, viewportWidth, width);

		if (!width) { // width not defined implies there is both a left and a right defined
			width = viewportWidth - right - left;
		} else {
			left = viewportWidth - right - width;
		}
	}

	var hasTop = positionInfo.hasOwnProperty('top');
	if (hasTop || positionInfo.hasOwnProperty('y')) {
		top = getPositionValue(hasTop ? positionInfo.top : positionInfo.y, viewportHeight, height);
	}

	if (positionInfo.bottom) {
		var bottom = getPositionValue(positionInfo.bottom, viewportHeight, height);

		if (!height) { // height not defined implies there is both a top and a bottom defined
			height = viewportHeight - bottom - top;
		} else {
			top = viewportHeight - bottom - height;
		}
	}

	// Finally, make SURE the top-right corner of any window is visible - where the [X] button is!
	left = Math.min(viewportWidth - width, Math.max(0, left));
	top = Math.max(0, Math.min(viewportHeight - height, top));

	return {
		x: Math.round(left),
		y: Math.round(top),
		width: Math.round(width),
		height: Math.round(height)
	};
}

//

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Opens a window.
 * If window is already opened, all happens "again" just like we reopen it.
 * This allows Windows to have a single "entry point" by listening to "open" (or opened) event, which
 * receives the "params" argument.
 *
 * @param {String} id - window id
 * @param {Object} params
 */
windowsManager.open = function (id, params) {
	params = params || {};

	var thisWindow = windows[id];
	if (!thisWindow) {
		return console.error('Invalid window: ' + id);
	}

	if (thisWindow.closingTweener) {
		thisWindow.closingTweener.cancel();
		finishClosingWindow(thisWindow);
	}

	// close windows of the same group
	var group = thisWindow.group;
	if (group) {
		for (var key in windows) {
			var w = windows[key];

			// continue if different group, not open or is the same window
			if (group !== w.group || !w.openState || id === key) {
				continue;
			}

			this.close(key);
		}
	}

	var positionInfo = thisWindow.positionInfo;
	var position = thisWindow.position;
	if (positionInfo && !position) {
		thisWindow.position = position = buildWindowStyleFromInfo(positionInfo);
		thisWindow.setStyles({
			webkitTransform: 'translate3d(' + position.x + 'px,' + position.y + 'px,0) scale(0.8)',
			width: position.width + 'px',
			height: position.height + 'px',
			opacity: 0
		});
	}
	if ((positionInfo && positionInfo.isModal) || params.isModal) {
		thisWindow.addClassNames('modal');
		var overlay = window.gui.windowsContainer.createChild('div', { className: 'modalWindowOverlay' });
		thisWindow.once('close', function () { overlay.destroy(); });
	}

	thisWindow.openState = true;
	thisWindow.show();

	this.emit('open', { id: id });
	thisWindow.emit('open', params);
	windowsManager.focusWindow(id);

	position = thisWindow.position; // take position value again because the window can modify it inside "open" event

	// If default size & pos are not available, keep initial pos & size (some windows compute these in 'open')
	var hasDefault = positionInfo && positionInfo.isDefault;
	if (!hasDefault && !thisWindow.initialPosition) {
		thisWindow.initialPosition = {
			x: position.x, y: position.y, width: position.width, height: position.height
		};
	}

	// If a window goes "out of screen" for any reason (including a bug), title bar & [x] button must be visible
	position.x = Math.min(dimensions.windowFullScreenWidth - position.width, Math.max(0, position.x));
	position.y = Math.max(0, Math.min(dimensions.windowFullScreenHeight - MIN_WIN_TOP_VISIBILITY, position.y));

	// opening animation.
	// NB: because we do a "show" just above, the transition is skipped most of the time.
	// We did not find an acceptable solution to solve this yet. Leaving this for today...
	// We tried:
	// - a timeout here (50ms at least; really not great)
	// - using "visibility: hidden" instead of "display: none" (may impact CPU)
	thisWindow.openingTweener = tweener.tween(
		thisWindow,
		{ opacity: 1, webkitTransform: 'translate3d(' + position.x + 'px,' + position.y + 'px,0)  scale(1)' },
		{ time: 150, delay: 0, easing: 'ease-out' },
		function () { finishOpeningWindow(thisWindow, params); }
	);

	window.gui.splashScreen.hide(); // whenever our first window is ready we hide the splashscreen - if present
	return thisWindow;
};

windowsManager.focusWindow = function (id) {
	var thisWindow = windows[id];

	if (!thisWindow.openState || focusedWindow === thisWindow) {
		return;
	}

	focusedWindow = thisWindow;
	thisWindow.getParent().appendChild(thisWindow);
	thisWindow.emit('focus');
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Positions / resizes a window
 *
 * @param {String} id - window's id
 * @param {Object} [newPositionInfo] - pos & size; if not given, window goes back to its default pos & size
 */
windowsManager.positionWindow = function (id, newPositionInfo) {
	var thisWindow = windows[id];
	var position;
	if (newPositionInfo) {
		position = buildWindowStyleFromInfo(newPositionInfo);
	} else if (thisWindow.initialPosition) {
		var def = thisWindow.initialPosition;
		position = { x: def.x, y: def.y, width: def.width, height: def.height };
	} else {
		position = buildWindowStyleFromInfo(thisWindow.positionInfo);
	}
	thisWindow.position = position;

	thisWindow.setStyles({
		width: position.width + 'px',
		height: position.height + 'px',
		webkitTransform: 'translate3d(' + position.x + 'px,' + position.y + 'px,0) scale(1)'
	});

	if (newPositionInfo) {
		thisWindow.emit('positioned');
	} else {
		thisWindow.emit('repositioned');
	}
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @method openDialog
 *  @desc   open a window as dialog.
 *
 * @param {string|Array} ids - window id to open as dialog
 * @param {Object} [params]  - optional params to send to the window in the 'open' event
 */
windowsManager.openDialog = function (ids, params) {
	if (currentDialog) {
		return;
	}

	if (!Array.isArray(ids)) {
		ids = [ids];
	}
	currentDialog = ids;

	for (var i = 0, len = ids.length; i < len; i += 1) {
		windowsManager.open(ids[i], params);
	}
	window.foreground.lock('windowsManagerDialog');
};


windowsManager.continueDialog = function (ids, params) {
	currentDialog = null;
	this.openDialog(ids, params);
};

windowsManager.isDialogActive = function () {
	return !!currentDialog;
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @method close
 *  @desc   close a window.
 *
 * @param {String} id      - window id to close
 * @param {Object} params  - a parameter to give to the close event
 */
windowsManager.close = function (id, params) {
	var shouldKeeDialog = (params && params.keepDialog);
	if (!shouldKeeDialog && currentDialog && currentDialog.indexOf(id) !== -1) {
		window.dofus.sendMessage('LeaveDialogRequestMessage', null);
		return closeDialog();
	}

	closeWindow(id, params);
};

/**
 * Force-close a window.
 * @private
 */
windowsManager._forceClose = function (id) {
	if (currentDialog && currentDialog.indexOf(id) !== -1) {
		if (window.gui.isConnected) { window.dofus.sendMessage('LeaveDialogRequestMessage', null); }
		return closeDialog();
	}
	closeWindow(id);
};

/**
 * Closes all windows.
 */
windowsManager.closeAll = function () {
	for (var key in windows) {
		// TODO if we add more logic/exceptions in the future like below, we could instead
		// TODO create window attributes - in this case "popup" and "global" could become 'system' windows
		if (key === 'popup') { // popup usually show system errors and important messages
			continue;
		}

		if (!windows[key].openState) {
			continue;
		}

		this._forceClose(key);
	}
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @method switch
 *  @desc   Toggle a window from opened to closed or vice versa.
 *
 * @param {String} id - window id
 */
windowsManager.switch = function (id, params) {
	var thisWindow = windows[id];
	if (thisWindow.openState) {
		if (thisWindow === focusedWindow) {
			this.close(id);
		} else {
			windowsManager.focusWindow(id);
		}
	} else {
		this.open(id, params);
	}
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @method getWindow
 *  @desc   Get window object by its id.
 *
 * @param {String} id - window id
 */
windowsManager.getWindow = function (id) {
	return windows[id];
};

/** Moves and/or resizes a window "smoothly"
 *  @param {string} id - window to move and/or resize
 *  @param {int} x - new "left" value (or null/undefined to keep current value)
 *  @param {int} y - new "right" value (or null/undefined to keep current value)
 *  @param {int} newWidth - new "width" value (or null/undefined to keep current value)
 *  @param {int} newHeight - new "height" value (or null/undefined to keep current value)
 */
windowsManager.moveAndResizeWindow = function (id, x, y, newWidth, newHeight) {
	var win = windowsManager.getWindow(id);

	var left = win.position.x;
	var top = win.position.y;
	var width = win.position.width;
	var height = win.position.height;

	if (x === null || x === undefined) { x = left; }
	if (y === null || y === undefined) { y = top; }
	if (newWidth === null || newWidth === undefined) { newWidth = width; }
	if (newHeight === null || newHeight === undefined) { newHeight = height; }

	var transition = 'translate3d(' + x + 'px, ' + y + 'px,0)';
	tweener.tween(win,
		{ webkitTransform: transition, width: newWidth + 'px', height: newHeight + 'px' },
		{ time: 150, delay: 0, easing: 'ease-out' },
		function () {
			windowsManager.positionWindow(id, { left: x, top: y, width: newWidth, height: newHeight });
		}
	);
};

/** Helps arranging an opening #1 window next to another #2 window (#2 must be already open)
 *  @param {string} id - window's ID
 *  @param {map} where - position info e.g. {leftOf: id2} or {rightOf: id2, sameHeight: true}
 */
windowsManager.arrangeOpeningWindow = function (id, where) {
	var id2 = where.leftOf || where.rightOf;
	var win1 = windowsManager.getWindow(id);
	var win2 = windowsManager.getWindow(id2);
	if (!win1 || !win2.openState) { return; }

	var win1Width = win1.position.width;
	var win2Width = win2.position.width;
	var win2Left = win2.position.x;
	var win1Left, newHeight, newTop, win2NewLeft = win2Left;
	if (where.leftOf) {
		win1Left = win2Left - win1Width;
		if (win1Left < 0) {
			// if not enough space on the left, we push win2 toward the right
			win1Left = 0;
			win2NewLeft = Math.min(win1Width, dimensions.screenWidth - win2Width);
		}
	} else if (where.rightOf) {
		win1Left = win2Left + win2Width;
		if (win1Left + win1Width > dimensions.screenWidth) {
			// if not enough space on the right, we push win2 toward the left
			win1Left = dimensions.screenWidth - win1Width;
			win2NewLeft = Math.max(0, win1Left - win2Width);
		}
	}
	if (where.sameHeight) {
		newHeight = win1.position.height;
		newTop = win1.position.y;
	}
	win1.position.x = win1Left;
	if (where.height) { win1.position.height = where.height; }

	windowsManager.positionWindow(id, win1.position);

	if (win2NewLeft !== win2Left || newHeight) {
		windowsManager.moveAndResizeWindow(id2, win2NewLeft, newTop, null, newHeight);
	}
};

// Similar to arrangeOpeningWindow but for vertical arranging
windowsManager.arrangeOpeningWindowVertically = function (id, where) {
	var id2 = where.below;
	var win1 = windowsManager.getWindow(id);
	var win2 = windowsManager.getWindow(id2);
	if (!win1 || !win2.openState) { return; }

	var win1Top;

	if (where.below) {
		win1Top = win2.position.y + win2.position.height;
		if (where.fullHeight) { win1.position.height = dimensions.windowFullScreenHeight - win1Top; }
	} // NB: we can add where.above if needs arises

	win1.position.x = win2.position.x;
	win1.position.y = win1Top;
	if (where.height) { win1.position.height = where.height; }

	windowsManager.positionWindow(id, win1.position);
};

/**
 * Use to identify more easily where the errors come from
 * @return {Array} - List of the currently opened window's ids
 */
windowsManager.getOpenWindows = function () {
	var openedWindows = [];
	for (var key in windows) {
		if (key === 'popup') { // popup usually show system errors and important messages
			continue;
		}

		if (!windows[key].openState) {
			continue;
		}

		// get the tab inside the window, for grimoire we just see grimoire but we need to know which tab inside grimoire
		// grimoire and social window have the function getOpenedTabId
		if (typeof windows[key].getOpenedTabId === 'function') {
			openedWindows.push(key + ' > ' + windows[key].getOpenedTabId());
		} else {
			openedWindows.push(key);
		}
	}
	return openedWindows;
};

windowsManager.getLastClosedWindow = function () {
	return lastClosedId;
};

module.exports = windowsManager;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windowsManager/index.js
 ** module id = 22
 ** module chunks = 0
 **/