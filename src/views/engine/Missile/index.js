var inherits       = require('util').inherits;
var AnimatedSprite = require('AnimatedSprite');
var Tween          = require('TINAlight').Tween;
var bezierCurve    = require('bezier').prepare(3);
var Bresenham      = require('Bresenham');
var atouin         = require('atouin');
var mapPoint       = require('mapPoint');

var bresenham = new Bresenham();

var FX = { base: 'FX', direction: 0 };

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class Missile
 * @desc  actor wrapper
 *
 * @author  Cedric Stoquer
 *
 * @param {Object}            params   - parameters object
 *
 * @param {number}            params.actorId     - id of actor
 * @param {AnimationManager}  params.animManager - animation manager
 */
function Missile(params) {
	AnimatedSprite.call(this, params, params.animManager);

	// animation informations
	this.actorId  = params.actorId  !== undefined ? params.actorId  : null;
	this.path     = [];
	this.step     = 0;
	this.moving   = false;
}
inherits(Missile, AnimatedSprite);
module.exports = Missile;

Missile.prototype.isFx = true;

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

Missile.prototype.isTapped = function () {
	return false;
};

Missile.prototype.tap = function () {
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update missile properties accordingly to step position
 */
Missile.prototype.refreshAnimation = function (areasToRefresh) {
	if (this.moving === true) {
		var path = this.path;
		var step = this.step;
		var s = ~~step;

		var prev = this.prevCoords;
		var coords = {
			x: bezierCurve([this.source[0], this.bezier[0], this.target[0]], step / this.pathLength),
			y: bezierCurve([this.source[1], this.bezier[1], this.target[1]], step / this.pathLength)
		};

		this.x = coords.x;
		this.y = coords.y;

		// compute rotation
		var dx = coords.x - prev.x;
		var dy = coords.y - prev.y;
		this.rotation = Math.atan2(dy, dx);

		var pos = path[s];
		if (pos !== this.prevPos) {
			this.position = pos;
			// this.cellId = pos;
		}

		this.prevPos = pos;
		this.prevCoords = coords;
	}

	this._refreshAnimation(areasToRefresh);
};


// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Prepare and start animation
 *
 * @param {Function} cb - asynchronous callback function to call when movement animation is finished.
 */
Missile.prototype._startPath = function (cb) {
	this.animManager.assignSymbol(FX, true);
	this.moving = true;

	var self = this;
	Tween(this, ['step'])
		.from({ step: 0 })
		.to({ step: this.pathLength }, this.duration)
		.start()
		.onFinish(function () {
			self.remove();
			return cb();
		});
};


// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Launch the missile animation
 *
 * @param {number}   source           - cellId of source
 * @param {number}   target           - cellId of target
 * @param {number}   speedCoefficient - inversely proportional to missile speed (in ms/10px)
 * @param {number}   curvature        - trajectory curvature (in percent of distance)
 * @param {number}   offsetY          - missile position offset
 * @param {function} cb               - callback to trigger when missile reaches destination
 */
Missile.prototype.launch = function (target, speedCoefficient, curvature, offsetY, cb) {
	var map = window.isoEngine.mapRenderer.map;
	var cells = map.cells;

	// create path (array of cellIds from source to target)
	var source = this.position;
	var path = [source];
	var sourcePoint = mapPoint.getMapPointFromCellId(source);
	var targetPoint = mapPoint.getMapPointFromCellId(target);
	bresenham.set(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y);
	bresenham.exec(function (x, y) {
		path.push(mapPoint.getCellIdFromMapPoint(x, y));
	});
	this.path = path;
	this.pathLength = path.length;

	// set direction
	this.mirrored = (sourcePoint.x > targetPoint.x);
	this.scaleY = this.mirrored ? -1 : 1;

	// get source and target position
	var sourceCoord = atouin.getCellCoord(source);
	var targetCoord = atouin.getCellCoord(target);

	// distance between source and target
	var distanceX = Math.abs(targetCoord.x - sourceCoord.x);
	var distanceY = Math.abs(targetCoord.y - sourceCoord.y);
	var distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
	// See "atouin/types/sequences/ParableGfxMovementStep.as" for duration calculation
	this.duration = (distance / 10) * speedCoefficient / 1000 * 24;

	// altitude and position offset
	sourceCoord.y -= (cells[source].f || 0) + offsetY;
	targetCoord.y -= (cells[target].f || 0) + offsetY;

	// convert to array (format needed for bezierCurveQuadratic)
	sourceCoord = [sourceCoord.x, sourceCoord.y];
	targetCoord = [targetCoord.x, targetCoord.y];

	this.source = sourceCoord;
	this.target = targetCoord;

	// get bezier control point
	this.bezier = [
		(sourceCoord[0] + targetCoord[0]) / 2,
		(sourceCoord[1] + targetCoord[1]) / 2 - distance * curvature
	];

	// initialize prev values
	this.prevPos = source;
	this.prevCoords = {
		x: 2 * sourceCoord[0] - this.bezier[0],
		y: 2 * sourceCoord[1] - this.bezier[1]
	};

	this._startPath(cb);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Missile/index.js
 ** module id = 1036
 ** module chunks = 0
 **/