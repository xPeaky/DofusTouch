/** @module constants */
var deviceInfo = require('deviceInfo');

// path constants for assets
exports.MAP_PATH          = 'maps/';
exports.IMG_PATH          = 'gfx/world/';
exports.SKIN_PATH         = 'skins/';
exports.BONE_PATH         = 'bones/';
exports.ICON_PATH         = 'gfx/icons/';
exports.ORNAMENT_PATH     = 'gfx/ornaments/';
exports.EMBEDDED_PATH     = 'ui/embedded/';
exports.BACKGROUND_PATH   = 'backgrounds/';
exports.FOREGROUND_PATH   = 'foregrounds/';
exports.BITMAP_FONTS      = 'ui/bitmapFonts/';
exports.WORLDMAP_PATH     = 'gfx/maps/';
exports.LOADER_PATH       = 'ui/loader/';
exports.MISSING_ANIM_PATH = 'bones/missingAnimList.json';
exports.CDV_PATH          = 'cdvfile://localhost/persistent/data/assets'; // Cordova local file path

exports.ITEM_DIR = '/gfx/items/';

// constants from dofus game
exports.MAP_SCENE_WIDTH_IN_CELLS  = 14.5;
exports.MAP_SCENE_HEIGHT_IN_CELLS = 20.5;
exports.CELL_WIDTH  = 86;
exports.CELL_HEIGHT = 43;
exports.CELL_SIDE = Math.sqrt(2 * exports.CELL_HEIGHT * exports.CELL_HEIGHT);
exports.NB_CELLS = 560;

// rendering parameters
exports.HORIZONTAL_OFFSET = 53;
exports.VERTICAL_OFFSET   = 15;
exports.WIDTH_PADDING  = 20;
exports.HEIGHT_PADDING = -16;

exports.MAP_BORDER_H = 30;
exports.MAP_BORDER_V = 20;
exports.GRID_ALTITUDE_OFFSET = 22;

// UI constants
exports.ICONBAR_CORNER_HEIGHT = 19; // height of icon bars corner "arrow"
exports.ICONBAR_CORNER_WIDTH = 36;  // width  of icon bars corner "arrow"
exports.ICONBAR_TAB_WIDTH   = 42; //1 tab button inside an icon bar
exports.ICONBAR_TAB_HEIGHT  = 35;
exports.SHORTCUT_ICON_SIZE  = 50;
exports.MENU_ICON_SIZE      = 42;
exports.SHORTCUT_GAUGE_SIZE = 13; //"thickness" of gauge inside shortcut bar
// Special for narrow layout (iPad)
exports.CHAT_BTN_MIN_WIDTH = 68;
// Special for wide layout (Android)
exports.CHAT_BTN_MIN_HEIGHT = 50;

// PING/Emote BUTTON
// Special for narrow layout (iPad)
exports.PING_EMOTE_BTN_NARROW_MIN_WIDTH = 50;
// Special for wide layout (Android)
exports.PING_EMOTE_BTN_WIDE_MIN_HEIGHT = 50;
exports.PING_EMOTE_BTN_WIDE_MIN_WIDTH = 40;

exports.MAP_SCENE_WIDTH  = (exports.CELL_WIDTH  * exports.MAP_SCENE_WIDTH_IN_CELLS)  + exports.WIDTH_PADDING;
exports.MAP_SCENE_HEIGHT = (exports.CELL_HEIGHT * exports.MAP_SCENE_HEIGHT_IN_CELLS) + exports.HEIGHT_PADDING;

exports.PIXEL_RATIO = (window.devicePixelRatio || 1);

// number of customizable colors on a character
exports.CHARACTER_COLORS = 5;

// Tweening parameters
exports.FPS = 60;
exports.TIME_UNITS_PER_SECOND = 25;

// Animation parameters
exports.ANIM_SYMETRY = [false, false, false, true, true, false, false, true];
exports.ANIM_SYMBOLS = [0, 1, 2, 1, 0, 5, 6, 5];
exports.ANGLE_PER_DIRECTION = [
	0,
	Math.PI / 8,
	Math.PI / 2,
	Math.PI - Math.PI / 8,
	Math.PI,
	Math.PI + Math.PI / 8,
	-Math.PI / 2,
	-Math.PI / 8
];

// Default texure image (1px * 1px pink)
exports.MISSING_TEXTURE_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAOAv/wAAACwAAAAAAQABAAACAkQBADs=';
exports.EMPTY_IMAGE = new Image();
exports.EMPTY_IMAGE.src = exports.MISSING_TEXTURE_IMAGE_SRC;
exports.EMPTY_JSON = {};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Layer positions of roleplay scene elements
exports.MAP_LAYER_BACKGROUND       = -1;
exports.MAP_LAYER_PLAYGROUND       = 0; // Actors / interactives are here
exports.MAP_LAYER_FOREGROUND       = 1;
exports.MAP_LAYER_TRANSPARENT      = 2;
exports.MAP_LAYER_ICONS            = 3;
exports.MAP_LAYER_POINT_LABELS     = 4;
exports.MAP_LAYER_TAP_FEEDBACK     = 5;
exports.MAP_LAYER_TARGET_INDICATOR = 6;

exports.TRANSPARENT_MODE_ALPHA = 0.725;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Memory management constants

// ********* //
// Heuristic //
// ********* //
// If we are on desktop/laptop, we want to allow the application to use tons of memory (up to 512MB)
// If we are on iOS, we want to allow the use of 50% the total memory capacity
// If we are on Android, we want to allow the use of only 40% of the total memory capacity

// Out of the total amount of memory allowed, we want to allocate 30% of it to sounds, textures and animation data

// For animation data and sounds we need a basic heuristic to approximate their memory usage:
	// 1 seconds of sound =~ 150KB
	// 1 animation =~ 1MB
var bytesPerSecond   = 150 * 1024;
var bytesPeAnimation = 1000 * 1024;

// The weight of one sprite in the buffer is 120 bytes
var spriteBytes = 120;

// The allocation will use the following ratios:
	// 0.43 to sounds

	// 0.25 to map textures
	// 0.10 to worldmap textures
	// 0.05 to ui characters textures

	// 0.04  to map sprite buffer
	// 0.005 to worldmap sprite buffer
	// 0.005 to ui characters sprite buffer

	// 0.12 to animations

// There should be some minumum memory allocation for sprite buffers:
// TODO: find a way to avoid having to specify minimum memory allocations for sprite buffers
	// 20000 minimum sprites in map buffer
	// 2500 minimum sprites in worldmap buffer
	// 4000 minimum sprites in ui characters buffer

if (deviceInfo.isPhoneGap) {
	var capacity = deviceInfo.capacity || 512 * 1024 * 1024; // If no specified capacity we suppose a capacity of 512MB
	var allocationRatio = deviceInfo.isAndroid ? 0.3 : 0.5;
	var maxAllocation = capacity * allocationRatio * 0.4;

	// Maximum memory allocated to music and sfx (in seconds)
	exports.MAX_MUSIC_SFX_MEMORY = Math.round(0.43 * maxAllocation / bytesPerSecond); // in seconds

	// Maximum memory taken by textures (in bytes)
	// Retina screen devices should have enough memory to hold texture of higher resolution
	exports.MAX_TEXTURE_MEMORY_MAP               = Math.round(0.25 * maxAllocation);
	exports.MAX_TEXTURE_MEMORY_WORLDMAP          = Math.round(0.10 * maxAllocation);
	exports.MAX_TEXTURE_MEMORY_CHARACTER_DISPLAY = Math.round(0.05 * maxAllocation);

	// Maximum number of sprites that can be held by the vertex buffer
	exports.MAX_SPRITES_BUFFER_MAP               = Math.max(Math.round(0.04  * maxAllocation / spriteBytes), 20000);
	exports.MAX_SPRITES_BUFFER_WORLDMAP          = Math.max(Math.round(0.005 * maxAllocation / spriteBytes), 2500);
	exports.MAX_SPRITES_BUFFER_CHARACTER_DISPLAY = Math.max(Math.round(0.005 * maxAllocation / spriteBytes), 4000);

	exports.MAX_ANIMATIONS = Math.round(0.12 * maxAllocation / bytesPeAnimation);
} else {
	// We are in browser, memory party!
	// Maximum memory allocated to music and sfx (in seconds)
	exports.MAX_MUSIC_SFX_MEMORY = 1000;

	// Maximum memory taken by textures (in bytes)
	// Retina screen devices should have enough memory to hold texture of higher resolution
	exports.MAX_TEXTURE_MEMORY_MAP               = 1024 * 1024 * 100;
	exports.MAX_TEXTURE_MEMORY_WORLDMAP          = 1024 * 1024 * 50;
	exports.MAX_TEXTURE_MEMORY_CHARACTER_DISPLAY = 1024 * 1024 * 20;

	// Maximum number of sprites that can be hold by the vertex buffer
	exports.MAX_SPRITES_BUFFER_MAP               = 80000;
	exports.MAX_SPRITES_BUFFER_WORLDMAP          = 4000;
	exports.MAX_SPRITES_BUFFER_CHARACTER_DISPLAY = 9000;

	exports.MAX_ANIMATIONS = 30;
}

// Maximum zoom level
exports.MAX_ZOOM_MAP = 1.1;

// Prerendering ratio of texture dynamically created
// TODO: use device performance to compute prerender ratio quality
// i.e the lower the performance of the device the smaller the prerendering quality
exports.PRERENDER_RATIO_MAP               = exports.PIXEL_RATIO;
exports.PRERENDER_RATIO_WORLDMAP          = exports.PIXEL_RATIO;
exports.PRERENDER_RATIO_CHARACTER_DISPLAY = 2 * exports.PIXEL_RATIO;




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/constants/index.js
 ** module id = 6
 ** module chunks = 0
 **/