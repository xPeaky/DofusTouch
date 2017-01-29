var constants = require('./worldMapConstants.js');
var CHUNK_WIDTH = constants.CHUNK_WIDTH;
var CHUNK_HEIGHT = constants.CHUNK_HEIGHT;

// N.B In the file:
// (x,y) is used as scene coordinates (the scene contains the sprites visible on screen)
// (i,j) is used as grid coordinates (the grid contains the roleplay maps)
// (k,l) is used as chunk coordinates (each chunk is a part of the image of the world map for a given zoom level)
// cc    is used for compressed coordinates of coordinates (i,j), see "MapCoordinates.as"


// A Scene is used to display the world map, it is ordered by layers:
// layer -1: full world map asset
// layer 0: chunk assets
// layer 1: areas
// layer 2: grid
// layer 3: zone highlight
// layer 4: icons
// layer 5: flags (TODO)

function ChunkParams(k, l, zoom, id, path, texture, scene, distanceToViewCenter) {
	// Computing chunk position on the scene
	var chunkWidth  = CHUNK_WIDTH  / zoom;
	var chunkHeight = CHUNK_HEIGHT / zoom;

	this.x = k * chunkWidth;
	this.y = l * chunkHeight;

	this.w = chunkWidth;
	this.h = chunkHeight;

	this.id   = id;
	this.path = path;

	this.texture = texture;
	this.scene   = scene;

	this.distToViewCenter = distanceToViewCenter;
}
module.exports = ChunkParams;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/WorldMap/ChunkParams.js
 ** module id = 844
 ** module chunks = 0
 **/