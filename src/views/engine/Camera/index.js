var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

/** Camera constants
 */
var CAMERA_BASE_SPEED = 0.005;
var CAMERA_ACCELERATION = 1.25; // Should be higher than 1
var ZOOM_RATIO = 3000;

var DUMPING = 0.008;
var CATCH_UP = 0.013;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Camera
 */
function Camera(x, y, zoom, l, r, t, b, fovW, fovH, maxZoom) {
	EventEmitter.call(this);

	this.l = l;
	this.r = r;
	this.t = t;
	this.b = b;
	this.w = r - l;
	this.h = b - t;
	this.min = { x: 0, y: 0 };
	this.max = { x: 0, y: 0 };

	this.fovWAbsolute = fovW;
	this.fovHAbsolute = fovH;

	this.setZoomMax(maxZoom);
	this._updateZoomBounds();
	this.setZoom(zoom);

	this.setPosition(x, y);

	this.acceleration = CAMERA_ACCELERATION;
	this.a = this.acceleration;

	this._frozen = false;
	this.emitAtDestination = false;
}
inherits(Camera, EventEmitter);
module.exports = Camera;

Camera.prototype.setAcceleration = function (acceleration) {
	this.a = acceleration;
};

Camera.prototype.setDefaultAcceleration = function (acceleration) {
	this.acceleration = acceleration;
};

Camera.prototype.freeze = function () {
	this._frozen = true;
};

Camera.prototype.unfreeze = function () {
	this._frozen = false;
};

Camera.prototype.stopMoving = function () {
	this.followee = {
		x: this.x,
		y: this.y
	};

	this.zoomTarget = this.zoom;
	this.z = ZOOM_RATIO / this.zoom;
};

Camera.prototype.setZoom = function (zoom) {
	// Minimum zoom value has priority over maximum zoom value
	zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

	this.z = ZOOM_RATIO / zoom;
	this.zoom = zoom;
	this.zoomTarget = zoom;

	this._updatePositionBounds();
};

Camera.prototype.setZoomMax = function (maxZoom) {
	this.maxZoom = maxZoom;
};

Camera.prototype.setPosition = function (x, y) {
	this.x = Math.min(this.max.x, Math.max(this.min.x, x));
	this.y = Math.min(this.max.y, Math.max(this.min.y, y));

	this.followee = {
		x: x,
		y: y
	};
};

Camera.prototype._updateZoomBounds = function () {
	// Computing minimum zoom value with respect to bounds and field of view
	var fovWidthOverTotalWidth   = this.fovWAbsolute / this.w;
	var fovHeightOverTotalHeight = this.fovHAbsolute / this.h;
	this.minZoom = Math.max(fovWidthOverTotalWidth, fovHeightOverTotalHeight);

	if (this.zoom       < this.minZoom) { this.zoom       = this.minZoom; }
	if (this.zoomTarget < this.minZoom) { this.zoomTarget = this.minZoom; }

	this.z = ZOOM_RATIO / this.zoom;
};

Camera.prototype._updatePositionBounds = function () {
	// Computing field of view with respect to targeted zoom and bounds
	this.fovW = this.fovWAbsolute / this.zoomTarget;
	this.fovH = this.fovHAbsolute / this.zoomTarget;

	this.min.x = this.l + this.fovW / 2;
	this.min.y = this.t + this.fovH / 2;

	this.max.x = this.r - this.fovW / 2;
	this.max.y = this.b - this.fovH / 2;

	if (this.min.x > this.max.x) { this.min.x = this.max.x = (this.min.x + this.max.x) / 2; }
	if (this.min.y > this.max.y) { this.min.y = this.max.y = (this.min.y + this.max.y) / 2; }
};

Camera.prototype.zoomTo = function (zoom) {
	this.zoomTarget = Math.min(Math.max(zoom, this.minZoom), this.maxZoom);
	this._updatePositionBounds();
};

// If emitAtDestination is given, camera emits 'reached' event once it moves less than this distance (in px)
Camera.prototype.moveTo = function (x, y, emitAtDestination) {
	this.followee = {
		x: x,
		y: y
	};

	if (emitAtDestination !== null && emitAtDestination !== undefined) {
		this.emitAtDestination = true;
	}
};

Camera.prototype.transform = function (cx, cy, tx, ty, scale) {
	// Transforming translations with respect to targetted zoom and position
	var previousZoom = this.zoomTarget;
	cx /= previousZoom;
	cy /= previousZoom;
	tx /= previousZoom;
	ty /= previousZoom;

	var newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, previousZoom * scale));
	var r = 1 - previousZoom / newZoom;

	var previousX = Math.min(this.max.x, Math.max(this.min.x, this.followee.x));
	var previousY = Math.min(this.max.y, Math.max(this.min.y, this.followee.y));
	var x = previousX + (cx - this.fovW / 2) * r + tx;
	var y = previousY + (cy - this.fovH / 2) * r + ty;

	// this.setZoom(newZoom);
	this.zoomTo(newZoom);

	// this.setPosition(x, y);
	this.moveTo(x, y);
};

Camera.prototype.addInertia = function (sx, sy, inertia) {
	sx /= this.zoom;
	sy /= this.zoom;

	var s = Math.sqrt(sx * sx + sy * sy);
	if (s === 0) {
		return;
	}

	// Reducing acceleration according to inertia
	this.a = Math.pow(this.acceleration, 1 - inertia);

	// Computing how many steps are require for the camera to reach a speed of 0
	// with respect to new acceleration
	var n = Math.log(s / CAMERA_BASE_SPEED) / Math.log(this.a) - 1;

	// Computing total distance that will be traveled
	// with respect to new acceleration and number of steps
	var d = CAMERA_BASE_SPEED * (1 - Math.pow(this.a, n)) / (1 - this.a);

	// Changing destination with respect to newly computed distance
	this.moveTo(this.x + d * sx / s, this.y + sy * d / s);
};

Camera.prototype.setFieldOfView = function (fovW, fovH) {
	// Field of view when zoom is 1
	this.fovWAbsolute = fovW;
	this.fovHAbsolute = fovH;

	this._updateZoomBounds();
	this._updatePositionBounds();
};

Camera.prototype.setBounds = function (l, r, t, b) {
	this.l = l;
	this.r = r;
	this.t = t;
	this.b = b;
	this.w = r - l;
	this.h = b - t;

	this._updateZoomBounds();
	this._updatePositionBounds();
};

Camera.prototype.follow = function (followee) {
	this.followee = followee;
};

Camera.prototype.updatePosition = function (dt) {
	if (this._frozen) {
		return;
	}

	// Acceleration tends toward default acceleration
	this.a += (this.acceleration - this.a) * (CATCH_UP * dt);

	// Computing bounds for camera position
	var fovW = this.fovWAbsolute / this.zoomTarget;
	var fovH = this.fovHAbsolute / this.zoomTarget;

	var minX = this.l + fovW / 2;
	var minY = this.t + fovH / 2;

	var maxX = this.r - fovW / 2;
	var maxY = this.b - fovH / 2;

	// Bounding camera destination
	var x = Math.min(maxX, Math.max(minX, this.followee.x));
	var y = Math.min(maxY, Math.max(minY, this.followee.y));
	var z = ZOOM_RATIO / this.zoomTarget;

	var x0 = this.x;
	var y0 = this.y;
	var z0 = this.z;

	// Computing camera's distance to destination
	var dx = x - x0;
	var dy = y - y0;
	var dz = z - z0;

	if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dz) < 0.5) {
		// Camera reached destination
		this.x = x;
		this.y = y;
		this.z = z;

		this.zoom = this.zoomTarget;

		if (this.emitAtDestination) {
			this.emitAtDestination = false;
			this.emit('reached');
		}

		this.a += (1.0 - this.a) * DUMPING;

		return false;
	}

	// Computing traveling ratio (proportion of total remaining distance) adjusted to framerate
	// The speed is not constant, it is a fraction of the remaining distance.
	// The value we are looking for is a + a * (1 - a) + a * (1 - a) ^ 2 + a * (1 - a) ^ 3 + ... + a * (1 - a) ^ dt
	// (where a = this.a - 1)
	// For performance reason and simplicity, the formula was simplified into:
	// (see https://en.wikipedia.org/wiki/Geometric_series to understand that both formula are equivalent)
	var r = 1 - Math.pow(2 - this.a, dt);

	// Computing new camera position
	this.x += r * dx;
	this.y += r * dy;
	this.z += r * dz;

	// Setting zoom value corresponding to position z
	this.zoom = ZOOM_RATIO / this.z;

	return true;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Camera/index.js
 ** module id = 838
 ** module chunks = 0
 **/