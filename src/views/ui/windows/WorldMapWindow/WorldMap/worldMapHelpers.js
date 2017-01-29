var ICON_DIAMETER = require('./worldMapConstants').ICON_DIAMETER;
var Vector2       = require('./Vector2.js');


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To order two vectors 2
 */
exports.positionOrdering = function (a, b) {
	var yDiff = a.y - b.y;
	if (yDiff === 0) {
		return a.x - b.x;
	}
	return yDiff;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To order two clusters
 */
exports.clusterOrdering = function (a, b) {
	var posA = a.position;
	var posB = b.position;
	var yDiff = posA.y - posB.y;
	if (yDiff === 0) {
		return posA.x - posB.x;
	}
	return yDiff;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To compute the relative positions of the visible icons with respect to the position of their cluster.
 * Their relative positions will depend on the number of visible icons of the cluster.
 * Icons will be placed on a circle centered around the position of the cluster.
 */
var relativeIconPositionsPerNumberOfVisibleIcons = [];
exports.computeRelativePositions = function (nVisibleIcons) {
	var relativeIconPositions = [];
	var radius = (nVisibleIcons <= 1) ? 0 : ICON_DIAMETER / (2 * Math.sin(Math.PI / nVisibleIcons));
	for (var i = 0; i < nVisibleIcons; i += 1) {
		var angle = 2 * Math.PI * i / nVisibleIcons;
		relativeIconPositions[i] = new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
	}
	relativeIconPositions.sort(exports.positionOrdering);
	relativeIconPositions.push(new Vector2(0, 0)); // Position for icons out of visible range

	relativeIconPositionsPerNumberOfVisibleIcons[nVisibleIcons] = relativeIconPositions;
	return relativeIconPositions;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To get the relative positions of the visible icons with respect to the position of their cluster.
 */
exports.getRelativePositions = function (nVisibleIcons) {
	var relativeIconPositions = relativeIconPositionsPerNumberOfVisibleIcons[nVisibleIcons];
	if (relativeIconPositions === undefined) {
		// Relative positions for given size not computed yet
		// Computing now
		relativeIconPositions = exports.computeRelativePositions(nVisibleIcons);
	}

	return relativeIconPositions;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/WorldMap/worldMapHelpers.js
 ** module id = 848
 ** module chunks = 0
 **/