/** @module spellShape */
// jscs:disable disallowQuotedKeysInObjects
var CellInfo        = require('CellInfo');
var mapPoint        = require('mapPoint');
var transformStates = require('transformStates');

var INFINITE_RANGE = 39;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Returns the range of a ring shaped area.
 *  cell in result range are ordered by distance to the center, ascending.
 *
 * @param {number} x - x coordinate of center
 * @param {number} y - y coordinate of center
 * @param {number} radiusMin - radius of inner limit of ring
 * @param {number} radiusMax - radius of outter limit of ring
 *
 * @return {Array} range - an array of point coordinate.
 */
function shapeRing(x, y, radiusMin, radiusMax) { //TODO: appears to return duplicates, investigate.
	var range = [];
	if (radiusMin === 0) { range.push([x, y, 0]); }
	for (var radius = radiusMin || 1; radius <= radiusMax; radius++) {
		for (var i = 0; i < radius; i++) {
			var r = radius - i;
			range.push([x + i, y - r, radius]);
			range.push([x + r, y + i, radius]);
			range.push([x - i, y + r, radius]);
			range.push([x - r, y - i, radius]);
		}
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Returns the range of a cross shaped area.
 *  cell in result range are ordered by distance to the center, ascending.
 *
 * @param {number} x - x coordinate of center
 * @param {number} y - y coordinate of center
 * @param {number} radiusMin - inner radius of area
 * @param {number} radiusMax - outter radius of area
 *
 * @return {number[]} range - an array of point coordinate.
 */
function shapeCross(x, y, radiusMin, radiusMax) {
	var range = [];
	if (radiusMin === 0) { range.push([x, y, 0]); }
	for (var i = radiusMin || 1; i <= radiusMax; i++) {
		range.push([x - i, y, i]);
		range.push([x + i, y, i]);
		range.push([x, y - i, i]);
		range.push([x, y + i, i]);
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Returns the range of a star shaped area. */
function shapeStar(x, y, radiusMin, radiusMax) {
	var range = [];
	if (radiusMin === 0) { range.push([x, y, 0]); }
	for (var i = radiusMin || 1; i <= radiusMax; i++) {
		range.push([x - i, y - i, i]);
		range.push([x - i, y + i, i]);
		range.push([x + i, y - i, i]);
		range.push([x + i, y + i, i]);
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Combinaison of shapeCross and shapeStar */
function shapeCrossAndStar(x, y, radiusMin, radiusMax) {
	var range = [];
	if (radiusMin === 0) { range.push([x, y, 0]); }
	for (var i = radiusMin || 1; i <= radiusMax; i++) {
		// cross
		range.push([x - i, y, i]);
		range.push([x + i, y, i]);
		range.push([x, y - i, i]);
		range.push([x, y + i, i]);
		// star
		range.push([x - i, y - i, i]);
		range.push([x - i, y + i, i]);
		range.push([x + i, y - i, i]);
		range.push([x + i, y + i, i]);
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Returns the range of a square shaped area. */
function shapeSquare(x, y, radiusMin, radiusMax) {
	var range = [];
	if (radiusMin === 0) { range.push([x, y, 0]); }
	for (var radius = radiusMin || 1; radius <= radiusMax; radius++) {
		// segment middles
		range.push([x - radius, y, radius]);
		range.push([x + radius, y, radius]);
		range.push([x, y - radius, radius]);
		range.push([x, y + radius, radius]);
		// segment corners
		range.push([x - radius, y - radius, radius]);
		range.push([x - radius, y + radius, radius]);
		range.push([x + radius, y - radius, radius]);
		range.push([x + radius, y + radius, radius]);
		// segment remaining
		for (var i = 1; i < radius; i++) {
			range.push([x + radius, y + i, radius]);
			range.push([x + radius, y - i, radius]);
			range.push([x - radius, y + i, radius]);
			range.push([x - radius, y - i, radius]);
			range.push([x + i, y + radius, radius]);
			range.push([x - i, y + radius, radius]);
			range.push([x + i, y - radius, radius]);
			range.push([x - i, y - radius, radius]);
		}
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of a cone shaped area (effect type 'V') */
function shapeCone(x, y, radiusMin, radiusMax, dirX, dirY) {
	var range = [];
	for (var radius = radiusMin; radius <= radiusMax; radius++) {
		var xx = x + radius * dirX;
		var yy = y + radius * dirY;
		range.push([xx, yy, radius]);
		for (var i = 1; i <= radius; i++) {
			range.push([xx + i * dirY, yy - i * dirX, radius]);
			range.push([xx - i * dirY, yy + i * dirX, radius]);
		}
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of a halfcircle shaped area (effect type 'U') */
function shapeHalfcircle(x, y, radiusMin, radiusMax, dirX, dirY) {
	var range = [];
	if (radiusMin === 0) { range.push([x, y, 0]); }
	for (var radius = radiusMin || 1; radius <= radiusMax; radius++) {
		var xx = x - radius * dirX;
		var yy = y - radius * dirY;
		range.push([xx + radius * dirY, yy - radius * dirX, radius]);
		range.push([xx - radius * dirY, yy + radius * dirX, radius]);
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Returns the range of a four cones shaped area (effect type 'W')
 *  The shape is basicaly a square without the diagonals and central point.
 */
function shapeCones(x, y, radiusMin, radiusMax) {
	var range = [];
	for (var radius = radiusMin || 1; radius <= radiusMax; radius++) {
		// segment middles
		range.push([x - radius, y, radius]);
		range.push([x + radius, y, radius]);
		range.push([x, y - radius, radius]);
		range.push([x, y + radius, radius]);
		// segment remaining
		for (var i = 1; i < radius; i++) {
			range.push([x + radius, y + i, radius]);
			range.push([x + radius, y - i, radius]);
			range.push([x - radius, y + i, radius]);
			range.push([x - radius, y - i, radius]);
			range.push([x + i, y + radius, radius]);
			range.push([x - i, y + radius, radius]);
			range.push([x + i, y - radius, radius]);
			range.push([x - i, y - radius, radius]);
		}
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Returns the range of a inline segment shaped area. */
function shapeLine(x, y, radiusMin, radiusMax, dirX, dirY) {
	var range = [];
	for (var i = radiusMin; i <= radiusMax; i++) {
		range.push([x + dirX * i, y + dirY * i, i]);
	}
	return range;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of a circle perimeter area (effect type 'O')
 *  The function is based on shapeRing, replacing the radiusMin by radiusMax.
 */
function shapeCirclePerimeter(x, y, radiusMin, radiusMax) {
	return shapeRing(x, y, radiusMax, radiusMax);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of a inverted circle area (effect type 'I')
 *  The function is based on shapeRing, going from radiusMax to Infinity.
 *
 *  TODO: Algorithm could be optimized. This one add a lot of invalid cells.
 */
function shapeInvertedCircle(x, y, radiusMin, radiusMax) {
	return shapeRing(x, y, radiusMax, INFINITE_RANGE);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of a perpendicular segment shaped area (effect type '-' and 'T') */
function shapePerpendicular(x, y, radiusMin, radiusMax, dirX, dirY) {
	var range = [];
	if (radiusMin === 0) { range.push([x, y, 0]); }
	for (var i = radiusMin || 1; i <= radiusMax; i++) {
		range.push([x + dirY * i, y - dirX * i, i]);
		range.push([x - dirY * i, y + dirX * i, i]);
	}
	return range;
}

//TODO: fix comment
//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of a spell, as a array of cellIds.
 *
 * @param {Array}  cellsData - cellsData of map object
 * @param {number} source - cell id where source of spell is
 * @param {Object} spell  - spell definition
 *
 * @param {boolean} spell.castInDiagonal
 * @param {boolean} spell.castInLine
 * @param {boolean} spell.castTestLos
 * @param {number}  spell.minRange
 * @param {number}  spell.range
 * @param {number}  spell.apCost
 * @param {boolean} spell.needFreeCell
 * @param {boolean} spell.needFreeTrapCell
 * @param {boolean} spell.needTakenCell
 * @param {boolean} spell.rangeCanBeBoosted
 *
 * @return {Object} range - range of spell, as 2 arrays
 * @return {Array}  range.inSight  - cellIds where the spell can be casted
 * @return {Array}  range.outSight - cellIds in spell range but where it cannot be cast because of los
 */
module.exports.getSpellRange = function (cellsData, source, spell) {
	var coords = mapPoint.getMapPointFromCellId(source);

	var rangeCoords;

	if (spell.castInLine && spell.castInDiagonal) {
		rangeCoords = shapeCross(coords.x, coords.y, spell.minRange, spell.range)
			.concat(shapeStar(coords.x, coords.y, spell.minRange, spell.range));
	} else if (spell.castInLine) {
		rangeCoords = shapeCross(coords.x, coords.y, spell.minRange, spell.range);
	} else if (spell.castInDiagonal) {
		rangeCoords = shapeStar(coords.x, coords.y, spell.minRange, spell.range);
	} else {
		rangeCoords = shapeRing(coords.x, coords.y, spell.minRange, spell.range);
	}

	return rangeCoords;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of an area, as a array of cellIds.
 * @private
 *
 * @param {Array}  cellsData - cellsData of map object
 * @param {number} center    - cell id of the center of circle shaped area
 * @param {number} size      - radius of the circle shaped area
 * @param {Function} shapeFunction - function to use to compute shape
 */
function getArea(cellsData, center, size, shapeFunction) {
	var coords = mapPoint.getMapPointFromCellId(center);
	var range = shapeFunction(coords.x, coords.y, 0, size);
	var cells = [];
	for (var i = 0; i < range.length; i++) {
		var cellId = mapPoint.getCellIdFromMapPoint(range[i][0], range[i][1]);
		if (cellId === undefined) { continue; }
		var los = cellsData[cellId].l || 0;
		// Add this cell only if los bitflag is set as follow:
		// - bit 1 (isWalkable)             === 1
		// - bit 3 (nonWalkableDuringFight) === 0
		if ((los & 5) === 1) { cells.push(cellId); }
	}
	return cells;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of a circle shaped area, as a array of cellIds.
 *
 * @param {Array}  cellsData - cellsData of map object
 * @param {number} center    - cell id of the center of circle shaped area
 * @param {number} size      - radius of the circle shaped area
 */
module.exports.getCircleArea = function (cellsData, center, size) {
	return getArea(cellsData, center, size, shapeRing);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Return the range of a cross shaped area, as a array of cellIds.
 *
 * @param {Array}  cellsData - cellsData of map object
 * @param {number} center    - cell id of the center of circle shaped area
 * @param {number} size      - radius of the circle shaped area
 */
module.exports.getCrossArea = function (cellsData, center, size) {
	return getArea(cellsData, center, size, shapeCross);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var shaperMap = {
	'P': null, // Point: displayed as one cell.
	'A': null, // Whole map: displayed as one cell.
	'D': null, // Chessboard mask: not implemented in original game.
	'X': { fn: shapeCross,           hasDirection: false, withoutCenter: false },
	'L': { fn: shapeLine,            hasDirection: true,  withoutCenter: false },
	'T': { fn: shapePerpendicular,   hasDirection: true,  withoutCenter: false },
	'C': { fn: shapeRing,            hasDirection: false, withoutCenter: false },
	'O': { fn: shapeCirclePerimeter, hasDirection: false, withoutCenter: false },
	'+': { fn: shapeStar,            hasDirection: false, withoutCenter: false },
	'G': { fn: shapeSquare,          hasDirection: false, withoutCenter: false },
	'V': { fn: shapeCone,            hasDirection: true,  withoutCenter: false },
	'W': { fn: shapeCones,           hasDirection: false, withoutCenter: false },
	'/': { fn: shapeLine,            hasDirection: true,  withoutCenter: false },
	'-': { fn: shapePerpendicular,   hasDirection: true,  withoutCenter: false },
	'U': { fn: shapeHalfcircle,      hasDirection: true,  withoutCenter: false },
	'Q': { fn: shapeCross,           hasDirection: false, withoutCenter: true },
	'#': { fn: shapeStar,            hasDirection: false, withoutCenter: true },
	'*': { fn: shapeCrossAndStar,    hasDirection: false, withoutCenter: false },
	'I': { fn: shapeInvertedCircle,  hasDirection: false, withoutCenter: false }
};



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get spell effect zone
 *
 * @param {Array}  cellsData    - cellsData of map object
 * @param {number} caster       - cell id of caster position
 * @param {number} target       - targeted cell id
 * @param {Object} effect       - effect definition
 * @param {string} effect.zoneShape   - shape of effect
 * @param {number} effect.zoneMinSize - effect radius min
 * @param {number} effect.zoneSize    - effect radius max
 */
module.exports.getSpellEffectZone = function (cellsData, caster, target, effect) {
	var cellInfos = {};
	var shaper = shaperMap[effect.zoneShape];
	if (!shaper) {
		if (shaper === undefined) { console.error('Incorrect Effect shape id: ' + effect.zoneShape); }
		//TODO: simplify this by filling out the undefined shapes in shaperMap.
		cellInfos[target] =
			new CellInfo(
				target,
				0,
				window.foreground.fightIsUserTurn ? transformStates.areaOfEffect : transformStates.areaOfEffectEnemyTurn
			);
	} else {
		var targetCoords = mapPoint.getMapPointFromCellId(target);
		var dirX, dirY;
		if (shaper.hasDirection) {
			var casterCoords = mapPoint.getMapPointFromCellId(caster);
			dirX = targetCoords.x === casterCoords.x ? 0 : targetCoords.x > casterCoords.x ? 1 : -1;
			dirY = targetCoords.y === casterCoords.y ? 0 : targetCoords.y > casterCoords.y ? 1 : -1;
		}
		var radiusMin = shaper.withoutCenter ? effect.zoneMinSize || 1 : effect.zoneMinSize; // ಠ_ಠ
		var rangeCoords = shaper.fn(targetCoords.x, targetCoords.y, radiusMin, effect.zoneSize, dirX, dirY);
		// Add this cell only if los bitflag is set as follow:
		// - bit 1 (isWalkable)             === 1
		// - bit 3 (nonWalkableDuringFight) === 0
		for (var i = 0; i < rangeCoords.length; i++) {
			var cellId = mapPoint.getCellIdFromMapPoint(rangeCoords[i][0], rangeCoords[i][1]);
			if (cellId === undefined) { continue; }
			var los = cellsData[cellId].l || 0;
			if ((los & 5) === 1) {
				cellInfos[cellId] =
					new CellInfo(
						cellId,
						rangeCoords[i][2],
						window.foreground.fightIsUserTurn ?
							transformStates.areaOfEffect :
							transformStates.areaOfEffectEnemyTurn
					);
			}
		}
	}
	return cellInfos;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/spellShapes/index.js
 ** module id = 1038
 ** module chunks = 0
 **/