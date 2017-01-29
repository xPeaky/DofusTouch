var constants = require('constants');
var gameOptions = require('gameOptions');

// in px, max thickness of sidebar
var MAX_SIDEBAR_NARROW = 175;
var MAX_SIDEBAR_WIDE = 210;

/**
 * Most common dimensions are: (all in px)
 *  dimensions.screenWidth: total width of viewport
 *  dimensions.screenHeight: total height of viewport
 *  dimensions.physicalScreenWidth: actual width of physical screen
 *  dimensions.physicalScreenHeight: actual height of physical screen
 *  dimensions.mapLeft: offset of left side of map. >0 if a "black stripe" is on the left of the map canvas
 *  dimensions.mapTop: offset of top side of map. >0 if a "black stripe" is on the top of the map canvas
 *  dimensions.mapWidth: width of map canvas area
 *  dimensions.mapHeight: height of map canvas area
 *  dimensions.mapRight: offset of right side of map canvas (= mapLeft + mapWidth)
 *  dimensions.mapBottom: offset of bottom side of map canvas (= mapTop + mapHeight)
 *  dimensions.windowFullScreenHeight: maximum height of windows
 *  dimensions.windowFullScreenWidth: maximum width of windows
 *  NB: we could add more constants for windows, e.g. when we want them to overlap the menubar
 */
var dimensions = {
	// In landscape, screen.height can correspond to the screen's width depending on the platform
	physicalScreenWidth: Math.max(window.screen.width, window.screen.height),
	physicalScreenHeight: Math.min(window.screen.width, window.screen.height)
};


function updateScreen(screenWidth, screenHeight) {
	dimensions.screenWidth = screenWidth || document.documentElement.clientWidth;
	dimensions.screenHeight = screenHeight || document.documentElement.clientHeight;
	dimensions.physicalToViewportRatio = dimensions.screenWidth / dimensions.physicalScreenWidth;
}
updateScreen(); // init is needed for screens like login screen to have a chance to look good

function computeMapSize(mapHeight) {
	var fittingRatio = mapHeight / constants.MAP_SCENE_HEIGHT;
	dimensions.mapWidth = ~~(constants.MAP_SCENE_WIDTH * fittingRatio);
	dimensions.mapHeight = ~~(constants.MAP_SCENE_HEIGHT * fittingRatio);
	dimensions.zoom = constants.PIXEL_RATIO * fittingRatio;

	dimensions.sideBarWidth = dimensions.screenWidth - dimensions.mapWidth;
	dimensions.bottomBarHeight = dimensions.screenHeight - dimensions.mapHeight;
}

function computeBestSizeForUi(mode, isFighting) {
	var totalBarSize, chatBtnSize, pingEmoteSize;
	if (mode === 'narrow') { // = "iPad mode"
		totalBarSize = dimensions.screenWidth;
		chatBtnSize = constants.CHAT_BTN_MIN_WIDTH;
		dimensions.mainControlBarSize = 132; // we can add space for 1 more icon here later
		pingEmoteSize = constants.PING_EMOTE_BTN_NARROW_MIN_WIDTH;
	} else {
		totalBarSize = dimensions.screenHeight;
		chatBtnSize = constants.CHAT_BTN_MIN_HEIGHT;
		dimensions.mainControlBarSize = 72;
		pingEmoteSize = constants.PING_EMOTE_BTN_WIDE_MIN_HEIGHT;
	}

	// start adding icon bars from the corner
	var cur = 0;
	if (mode === 'narrow') { // = "iPad mode"
		dimensions.posChatBtn = cur;
		cur += chatBtnSize;

		dimensions.pingEmoteBtnSize = pingEmoteSize;
		dimensions.posPingEmoteBtn = cur;
		cur += pingEmoteSize;
	} else {
		dimensions.pingEmoteBtnSize = pingEmoteSize;
		pingEmoteSize = 0;
	}

	dimensions.posMainControlBar = cur;
	cur += dimensions.mainControlBarSize;

	// --- Find the best size for shortcut bar and menu bar
	var shortcutBar = window.gui.shortcutBar;
	var menuBar = window.gui.menuBar;
	// compute available size for (menu bar + shortcut bar)
	var availableSize = totalBarSize - dimensions.mainControlBarSize - chatBtnSize;
	// then the minimum size of menu bar from size (in number of icons) requested by user
	var menuBarSizeInIcons = isFighting ? gameOptions.menubarSizeInFight : gameOptions.menubarSize;
	var minSizeForMenuBar = menuBar.computeMinimumSize(menuBarSizeInIcons, mode);
	// from this we can tell how much is left for shortcut bar, and compute "net size" for both
	var tentativeShortcutBarSize = ~~(availableSize - minSizeForMenuBar - pingEmoteSize);
	var shortcutBarSize = shortcutBar.computeBestSize(tentativeShortcutBarSize, mode);

	// finally, give the remaining pixels to menuBar - we want the shortcut bar to be "pixel perfect"
	var remaining = availableSize - shortcutBarSize - pingEmoteSize - minSizeForMenuBar;
	dimensions.menuBarSize = minSizeForMenuBar + remaining;
	dimensions.shortcutBarSize = shortcutBarSize;

	dimensions.posShortcutBar = cur;
	cur += dimensions.shortcutBarSize;
	dimensions.posMenuBar = cur;
	cur += dimensions.menuBarSize;
	if (mode === 'wide') {
		dimensions.posChatBtn = cur;
		dimensions.posPingEmoteBtn = cur;
	}
}

// NB: To decide if we are "fighting", we use the "real" flag, to avoid too much map resizing.
// If this resize operation was triggered by option change or toolbar edit, we can leave the
// toolbar thickness as it is.
function computeSideBarThickness(mode) {
	var numRows;
	if (mode === 'narrow') {
		numRows = window.gui.playerData.isFighting ? gameOptions.toolbarThicknessInFight : 1;
	} else {
		numRows = 3; // always 3 rows thick in wide mode
	}
	return numRows * constants.SHORTCUT_ICON_SIZE + constants.SHORTCUT_GAUGE_SIZE + 5;
}

/** A "narrow" screen is like on iPad, with sidebar on the bottom */
function resizeNarrowScreen(isFighting) {
	var mode = 'narrow';
	var mapHeight = dimensions.screenHeight - computeSideBarThickness(mode);
	var zoom = mapHeight / constants.MAP_SCENE_HEIGHT;
	var mapWidth = ~~(constants.MAP_SCENE_WIDTH * zoom);
	// if resulting width would exceed the screen, reduce zoom
	if (mapWidth > dimensions.screenWidth) {
		zoom = dimensions.screenWidth / constants.MAP_SCENE_WIDTH;
		mapHeight = ~~(constants.MAP_SCENE_HEIGHT * zoom);
	}

	computeMapSize(mapHeight);
	dimensions.bottomBarHeight = Math.min(dimensions.bottomBarHeight, MAX_SIDEBAR_NARROW);
	computeBestSizeForUi(mode, isFighting);

	dimensions.mapLeft = Math.round(dimensions.sideBarWidth / 2);
	dimensions.mapTop = dimensions.screenHeight - dimensions.bottomBarHeight - dimensions.mapHeight;
	dimensions.mapRight = dimensions.mapLeft + dimensions.mapWidth;
	dimensions.mapBottom = dimensions.mapTop + dimensions.mapHeight;

	dimensions.windowFullScreenWidth = dimensions.screenWidth;
	dimensions.windowFullScreenHeight = dimensions.mapBottom; // on iPad we leave the menu bars always visible for now

	dimensions.screenExceptToolbar = {
		left: 0,
		top: 0,
		width: dimensions.screenWidth,
		height: dimensions.screenHeight - dimensions.bottomBarHeight
	};
}

/** A "wide" screen is like most androids, with sidebar on the right side */
function resizeWideScreen(isFighting) {
	var mode = 'wide';
	var mapWidth = dimensions.screenWidth - computeSideBarThickness(mode);
	var zoom = mapWidth / constants.MAP_SCENE_WIDTH;
	var mapHeight = ~~(constants.MAP_SCENE_HEIGHT * zoom);

	computeMapSize(Math.min(mapHeight, dimensions.screenHeight));
	dimensions.sideBarWidth = Math.min(dimensions.sideBarWidth, MAX_SIDEBAR_WIDE);
	computeBestSizeForUi(mode, isFighting);

	dimensions.mapLeft = dimensions.screenWidth - dimensions.sideBarWidth - dimensions.mapWidth;
	dimensions.mapTop = Math.round(dimensions.bottomBarHeight / 2);
	dimensions.mapRight = dimensions.mapLeft + dimensions.mapWidth;
	dimensions.mapBottom = dimensions.mapTop + dimensions.mapHeight;

	dimensions.windowFullScreenWidth = dimensions.screenWidth;
	dimensions.windowFullScreenHeight = dimensions.screenHeight;

	dimensions.screenExceptToolbar = {
		left: 0,
		top: 0,
		width: dimensions.screenWidth - dimensions.sideBarWidth,
		height: dimensions.screenHeight
	};
}

exports.dimensions = dimensions;
exports.updateScreen = updateScreen;
exports.resizeWideScreen = resizeWideScreen;
exports.resizeNarrowScreen = resizeNarrowScreen;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/dimensionsHelper/index.js
 ** module id = 24
 ** module chunks = 0
 **/