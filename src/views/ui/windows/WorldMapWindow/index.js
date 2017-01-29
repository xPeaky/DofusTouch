require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var inherits = require('util').inherits;
var WorldMap = require('WorldMapWindow/WorldMap');
var Poi = require('./poi.js');
var Window = require('Window');
var getText = require('getText').getText;
var Button = require('Button');
var dimensions = require('dimensionsHelper').dimensions;
var windowsManager = require('windowsManager');
var resizeBehavior = require('resizeBehavior');
var ConquestController = require('./ConquestController.js');

var WINDOW_MIN_SIZE = 216; // (pixels)

// categories from database
var hintFilter = {
	temples: 1,
	markets: 2,
	workshops: 3,
	miscellaneous: 4,
	dungeons: 6,
	possessions: 7
};

/**
 * @class WorldMapWindow
 * @desc  Window for world map. To try different maps: `moveto incarnam`, `kano`, `moveto 2,36`...
 * @this Window
 * @extends {Window}
 */
function WorldMapWindow() {
	Window.call(this, {
		className: 'WorldMapWindow',
		plusButton: true,
		minusButton: true,
		positionInfo: { width: 'w', height: 'h', isDefault: true },
		title: getText('ui.cartography.title')
	});

	this.status = {
		// is the world map component auto-updating at every frame?
		isWorldMapRefreshing: false,
		// is the world map component loading?
		isLoading: false,
		// used to store the latest opening param
		// (to handle multiple open-close-open with different params while still loading)
		lastOpenCoord: {},
		// store latest window information outside of full screen mode
		lastWindowInfo: { x: null, y: null, w: null, h: null }
	};

	// world map renderer
	this._worldMap = null;
	this._conquestController = new ConquestController();
	// poi manager
	this._poi = null;

	// option buttons panel
	this._buttonBox = null;
	this._optionButtons = null;

	// maximum content (inner boundaries) size
	this._maxContentSize = null;

	// Will be enabled at DOM creation
	this.minusButton.hide();
	this.plusButton.hide();

	// When an element in the code is calling windowsManager.open('myWindow'), the `open` event is emitted by myWindow
	// even if it was already opened and there is no way to detect automatically if it was already opened before.
	// TODO: in windowsManager, move `thisWindow.openState = true;` after the `show()` and emit('open')
	this._isOpened = false;

	this.once('open', function (coords) {
		this._addSpinner();

		var initialSizeAndPosition = {
			x: dimensions.mapLeft,
			y: dimensions.mapTop,
			width: Math.round(dimensions.mapWidth / 2),
			height: Math.round(dimensions.mapHeight / 2)
		};
		windowsManager.positionWindow(this.id, initialSizeAndPosition);

		// save initial window size/position
		this.status.lastWindowInfo.x = this.position.x;
		this.status.lastWindowInfo.y = this.position.y;
		this.status.lastWindowInfo.w = this.position.width;
		this.status.lastWindowInfo.h = this.position.height;

		// create and prepare world map component
		var self = this;
		this._createWorldMap(function (error) {
			if (error) {
				self._removeSpinner();
				return console.error(error);
			}

			self._createDom();
			self._setEvents();
			self._poi = new Poi(self._worldMap);

			// if the window has been resized with a double tap on the title bar while the WorldMap component was created
			self._cropWorldMapToWindow();

			self.on('open', self._onOpen);

			if (self.openState) {
				self._onOpen(coords);
			}
		});
	});

	this.on('close', this._onClose);
}

inherits(WorldMapWindow, Window);
module.exports = WorldMapWindow;

WorldMapWindow.prototype._onClose = function () {
	// stop canvas refreshing
	if (this.status.isWorldMapRefreshing) {
		this._worldMap.stopRefreshing();
	}
	// hide option buttons panel
	if (this._buttonBox) {
		this._buttonBox.addClassNames('hidden');
	}
	this._isOpened = false;
};

WorldMapWindow.prototype._onOpen = function (coords) {
	var self = this;
	var gui = window.gui;

	// default coordinate: player position
	var engineCoords = {
		posX: gui.playerData.position.coordinates.posX,
		posY: gui.playerData.position.coordinates.posY
	};

	if (coords && coords.x !== undefined && coords.y !== undefined) {
		engineCoords.posX = coords.x;
		engineCoords.posY = coords.y;
	}

	// remember last requested coord
	this.status.lastOpenCoord = engineCoords;

	// if the window was already opened we only want to update the position
	if (this._isOpened) {
		self._worldMap.centerToPosition(self.status.lastOpenCoord);
		return;
	}

	if (this.status.isLoading) { return; }
	this.status.isLoading = true;

	this._addSpinner();

	this._worldMap.initialize(engineCoords, function () {
		self.status.isWorldMapRefreshing = true;
		self._removeSpinner();
		self.status.isLoading = false;
		self._isOpened = true;

		if (!self.openState) {
			// the window has been closed before the loading was finished
			return self._onClose();
		}

		// center the camera on the latest requested coordinate
		self._worldMap.centerToPosition(self.status.lastOpenCoord);

		// update player flag position
		var playerCoordinate = gui.playerData.position.coordinates;
		self._worldMap.setIconPosition('userPosition', playerCoordinate.posX, playerCoordinate.posY);

		// update POIs
		self._poi.update();
		self._conquestController.setWorldMap(self._worldMap);
	});
};

WorldMapWindow.prototype._addSpinner = function () {
	this.windowBodyWrapper.addClassNames('spinner');
};

WorldMapWindow.prototype._removeSpinner = function () {
	this.windowBodyWrapper.delClassNames('spinner');
};

// Determine and return maximum window's inner boundaries when in full screen mode without having to be actually in
// full screen mode. Used to set world map component (canvas) size. DOM still need be already rendered.
WorldMapWindow.prototype._getMaxContentSize = function () {
	if (!this._maxContentSize) {
		var currentInnerBoundaries = this._getCurrentInnerBoundaries();
		this._maxContentSize = {
			width: dimensions.windowFullScreenWidth - (this.position.width - currentInnerBoundaries.width),
			height: dimensions.windowFullScreenHeight - (this.position.height - currentInnerBoundaries.height)
		};
	}
	return this._maxContentSize;
};

// get current window's inner boundaries
WorldMapWindow.prototype._getCurrentInnerBoundaries = function () {
	var innerBoundaries = this.windowBody.getComputedStyles('width', 'height');
	return {
		width: parseInt(innerBoundaries.width, 10),
		height: parseInt(innerBoundaries.height, 10)
	};
};

// tells the world map component which part of the canvas should be refreshed
WorldMapWindow.prototype._cropWorldMapToWindow = function () {
	var worldMapMaxSize = this._getMaxContentSize();
	var currentInnerBoundaries = this._getCurrentInnerBoundaries();
	this._worldMap.crop(
		(worldMapMaxSize.width - currentInnerBoundaries.width) / 2,
		(worldMapMaxSize.height - currentInnerBoundaries.height) / 2,
		currentInnerBoundaries.width,
		currentInnerBoundaries.height
	);
};

WorldMapWindow.prototype._exitFullScreen = function () {
	// restore window style visually
	this.setStyles({
		width: this.status.lastWindowInfo.w + 'px',
		height: this.status.lastWindowInfo.h + 'px',
		webkitTransform: 'translate3d(' + this.status.lastWindowInfo.x + 'px,' + this.status.lastWindowInfo.y + 'px,0)'
	});

	// restore window style data
	this.position.x = this.status.lastWindowInfo.x;
	this.position.y = this.status.lastWindowInfo.y;
	this.position.width = this.status.lastWindowInfo.w;
	this.position.height = this.status.lastWindowInfo.h;

	this.emit('resize');
};

WorldMapWindow.prototype._setEvents = function () {
	var self = this;
	var gui = window.gui;

	// player changed map
	gui.playerData.position.on('mapUpdate', function (/*msg*/) {
		if (!self.openState) { return; }
		if (self._worldMap.isLoading()) {
			var i = this.coordinates.posX;
			var j = this.coordinates.posY;
			self._worldMap.once('loaded', function () {
				self._worldMap.setIconPosition('userPosition', i, j);
				self._worldMap.centerToMyPosition();
			});
		} else {
			self._worldMap.setIconPosition('userPosition', this.coordinates.posX, this.coordinates.posY);
			self._worldMap.centerToMyPosition();
		}

		if (self.status.isLoading) {
			self.status.lastOpenCoord = this.coordinates;
		}
	});

	// triggered after the window went full screen (by double tapping the title bar or by pushing the "plus" button)
	this.on('repositioned', function () {
		self.emit('resize', /*isMaximized=*/true);
	});

	// after the window has been moved around
	this.on('positioned', function () {
		self.status.lastWindowInfo.x = self.position.x;
		self.status.lastWindowInfo.y = self.position.y;
		self._updateMySize();
	});

	// when the world changed (Incarnam, Astrub, dungeon...)
	gui.playerData.position.on('worldMapUpdate', function () {
		self._onOpen();
		self._poi.update();
	});

	gui.on('disconnect', function () {
		self._conquestController.clear();
		self._worldMap.clear();
		self._resetOptionsButtons();
		self.close();
	});
};

// DOM creation helper
WorldMapWindow.prototype._createToggleButton = function (optionName, defaultSelected, tooltip, fn) {
	var button = new Button({ className: ['mapBtn', optionName] }, function () {
		button.selected = !button.selected;
		button.toggleClassName('selected', this.selected);
		fn.call(this);
	});

	if (defaultSelected) {
		button.selected = true;
		button.addClassNames('selected');
	} else {
		button.selected = false;
	}
	button.defaultSelected = defaultSelected;

	this._optionButtons[optionName] = button;

	addTooltip(button, tooltip);
	return button;
};

// create and setup world map component
WorldMapWindow.prototype._createWorldMap = function (cb) {
	var worldMap = this._worldMap = this.windowBody.appendChild(new WorldMap());
	worldMap.setupUI(this);
	var worldMapMaxSize = this._getMaxContentSize();
	worldMap.setDimensions(worldMapMaxSize.width, worldMapMaxSize.height);
	this._cropWorldMapToWindow();
	this._worldMap.addClassNames('centerMap');
	this._worldMap.preloadGenericAssets(cb);
};

WorldMapWindow.prototype._createOptionsButtons = function () {
	var self = this;
	var worldMap = this._worldMap;
	this._optionButtons = {};

	// container (panel)
	var buttonsSpace = this._buttonBox = this.windowBody.createChild('div', { className: ['buttonsSpace', 'hidden'] });

	function createMapIconsToggleButton(hint, tooltip) {
		return self._createToggleButton(hint, true, tooltip, function () {
			worldMap.setVisibilityOfIconType(hintFilter[hint], this.selected);
		});
	}

	buttonsSpace.appendChild(self._createToggleButton('grid', false, getText('ui.option.displayGrid'), function () {
		worldMap.setGridVisibility(this.selected);
	}));

	buttonsSpace.appendChild(self._createToggleButton('landmarks', true, getText('ui.cartography.flags'), function () {
		worldMap.setVisibilityOfIconType('customFlag', this.selected);
		worldMap.setVisibilityOfIconType('userPosition', this.selected);
		worldMap.setVisibilityOfIconType('questObjective', this.selected);
		worldMap.setVisibilityOfIconType('hint', this.selected);
	}));

	buttonsSpace.appendChild(
		createMapIconsToggleButton('possessions', true, getText('ui.common.possessions'), function () {
			// TODO: tax collectors should appear on the map, with information about how many kamas,
			// experience points etc. have been collected.
		})
	);

	buttonsSpace.appendChild(createMapIconsToggleButton('temples', getText('ui.map.temple')));
	buttonsSpace.appendChild(createMapIconsToggleButton('markets', getText('ui.map.bidHouse')));
	buttonsSpace.appendChild(createMapIconsToggleButton('workshops', getText('ui.map.craftHouse')));
	buttonsSpace.appendChild(createMapIconsToggleButton('miscellaneous', getText('ui.common.misc')));

	buttonsSpace.appendChild(self._createToggleButton('conquests', true, getText('ui.map.conquest'), function () {
		worldMap.setVisibilityOfIconType('prisms', this.selected);
	}));

	buttonsSpace.appendChild(createMapIconsToggleButton('dungeons', getText('ui.map.dungeon')));

	// button to open the panel
	this.optionButton = new Button({ className: 'optionButton', scaleOnPress: true }, function () {
		buttonsSpace.toggleClassName('hidden');
	});
	this.optionButton.insertBefore(this.windowTitle);
};

WorldMapWindow.prototype._createDom = function () {
	var self = this;

	// option buttons panel
	this._createOptionsButtons();

	// button to center the map on player position
	this.centerButton = new Button({ className: 'centerButton', scaleOnPress: true }, function () {
		self._worldMap.centerToMyPosition();
	});
	addTooltip(this.centerButton, getText('ui.map.player'));
	this.centerButton.insertBefore(this.windowTitle);

	// resize handle
	resizeBehavior(this, { minWidth: WINDOW_MIN_SIZE, minHeight: WINDOW_MIN_SIZE });

	this.on('resizeStart', function () {
		var maxSize = self._getMaxContentSize();
		self._worldMap.crop(0, 0, maxSize.width, maxSize.height);
	});

	this.on('resize', function (isMaximized) {
		self._cropWorldMapToWindow();
		self._updateMySize(isMaximized);
	});

	// expand button
	this.plusButton.on('tap', function () {
		// reset window to current positionInfo and trigger `repositioned`
		windowsManager.positionWindow('worldMap');
	});
	this.plusButton.show();

	// minimize button
	this.minusButton.on('tap', function () {
		self._exitFullScreen();
	});
};

WorldMapWindow.prototype._updateMySize = function (isMaximized) {
	this.plusButton.toggleDisplay(!isMaximized);
	this.minusButton.toggleDisplay(!!isMaximized);

	if (isMaximized) { return; } // no need to save size when maximized

	var width = parseInt(this.getStyle('width'), 10);
	var height = parseInt(this.getStyle('height'), 10);
	if (width > dimensions.windowFullScreenWidth * 0.9 && height > dimensions.windowFullScreenHeight * 0.9) {
		return; // no need to save size if we are really close to full screen
	}
	this.status.lastWindowInfo.w = this.position.width = width;
	this.status.lastWindowInfo.h = this.position.height = height;
};

WorldMapWindow.prototype._resetOptionsButtons = function () {
	for (var optionName in this._optionButtons) {
		var button = this._optionButtons[optionName];
		button.selected = button.defaultSelected;
		button.toggleClassName('selected', button.selected);
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/index.js
 ** module id = 833
 ** module chunks = 0
 **/