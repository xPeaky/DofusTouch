/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class Bresenham - implementation of Bresenham's algorithm
 *                    for fast line calculation in discrete 2D space.
 *
 * @author Cedric Stoquer
 */

function Bresenham() {
	this.sourceX = 0;
	this.sourceY = 0;
	this.targetX = 0;
	this.targetY = 0;

	this.x = 0;
	this.y = 0;

	this.incX = 0;
	this.incY = 0;

	this.error = 0;
	this.deltaError = 0;
	this._stop = false;

	this.cb = null;
}

module.exports = Bresenham;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * set - reset source and target points of line.
 *
 * @param {number} sourceX - x coordinate of source point
 * @param {number} sourceY - y coordinate of source point
 * @param {number} targetX - x coordinate of target point
 * @param {number} targetY - y coordinate of target point
 */
Bresenham.prototype.set = function (sourceX, sourceY, targetX, targetY) {
	this.sourceX = ~~sourceX || 0;
	this.sourceY = ~~sourceY || 0;
	this.targetX = ~~targetX || 0;
	this.targetY = ~~targetY || 0;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * exec - Launch bresenham line calculation.
 *        At each steps of calculation, an optional callback function can be executed.
 *
 * @param {Function} [cb] - optional callback that will be call for each points in the line.
 *                          callback will be feed with x, y coordinate of the point.
 *
 * @return {Array} line - array of point coordinates in the result line form source to target.
 */
Bresenham.prototype.exec = function (cb) {
	// if no callback is defined, save and return result line.
	var line = [];
	if (!cb || typeof cb !== 'function') {
		cb = function (x, y) { line.push([x, y]); };
	}
	this.cb = cb;

	// init parameters
	this._stop = false;
	this.error = 0;
	this.deltaError = 0;

	this.x = this.sourceX;
	this.y = this.sourceY;

	var deltaX = this.targetX - this.sourceX;
	var deltaY = this.targetY - this.sourceY;
	var absDeltaX = Math.abs(deltaX);
	var absDeltaY = Math.abs(deltaY);

	this.incX = deltaX > 0 ? 1 : -1;
	this.incY = deltaY > 0 ? 1 : -1;

	// choose witch bresenham algorithm to use for increment.
	var algorithm;

	if (deltaX === 0 && deltaY === 0) {
		this._stop = true;
		algorithm = null;
	} else if (deltaX === 0) {
		algorithm = this._vertical;
	} else if (deltaY === 0) {
		algorithm = this._horizontal;
	} else if (absDeltaX === absDeltaY) {
		algorithm = this._equalSlope;
	} else if (absDeltaX > absDeltaY) {
		algorithm = this._xSlope;
		this.deltaError = absDeltaY / absDeltaX;
	} else {
		algorithm = this._ySlope;
		this.deltaError = absDeltaX / absDeltaY;
	}

	// launch algorithm.
	// this.cb(this.x, this.y, true);
	while (!this._stop) {
		algorithm.apply(this);
		if (this.x === this.targetX && this.y === this.targetY) {
			this._stop = true;
		}
		this.cb(this.x, this.y, true);
	}
	return line;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * Stop algorithm execution */
Bresenham.prototype.stop = function () {
	this._stop = true;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * horizontal trajectory
 * @private
 */
Bresenham.prototype._horizontal = function () {
	this.x += this.incX;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * vertical trajectory
 * @private
 */
Bresenham.prototype._vertical = function () {
	this.y += this.incY;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * 45 degree slope
 * @private
 */
Bresenham.prototype._equalSlope = function () {
	this.x += this.incX;
	this.y += this.incY;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * slope with more velocity on x axis
 * @private
 */
Bresenham.prototype._xSlope = function () {
	this.error += this.deltaError;
	if (this.error >= 0.5) {
		this.y += this.incY;
		this.error -= 1;
	}
	this.x += this.incX;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * slope with more velocity on y axis
 * @private
 */
Bresenham.prototype._ySlope = function () {
	this.error += this.deltaError;
	if (this.error >= 0.5) {
		this.x += this.incX;
		this.error -= 1;
	}
	this.y += this.incY;
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Bresenham/index.js
 ** module id = 1035
 ** module chunks = 0
 **/