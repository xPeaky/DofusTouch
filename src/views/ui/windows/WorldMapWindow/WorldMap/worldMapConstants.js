exports.WORLDMAP_PATH = require('constants').WORLDMAP_PATH;

// Sub area overlay image constants
exports.SUBAREA_COLOR = [16 / 255, 186 / 255, 105 / 255, 0.25]; // See "CartographyUI.as", color is 0x10BA69

// Margin added to the boundaries of the scene view when determining which chunks to load
// It allows to preemptively load adjacent chunk and reduce asset loading requests
exports.VIEW_MARGIN  = 1.1; // Corresponds to 10%

// Dimension of a chunk image
exports.CHUNK_WIDTH  = 250;
exports.CHUNK_HEIGHT = 250;

exports.ICON_DIAMETER = 28;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/WorldMap/worldMapConstants.js
 ** module id = 845
 ** module chunks = 0
 **/