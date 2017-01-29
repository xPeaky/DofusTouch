var inherits    = require('util').inherits;
var Sprite      = require('Sprite');
var AnimManager = require('TemporaryAnimationManager');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class AnimatedSprite
 * @param {Object} params - parameters object
 * @param {Object} [animManager] - animation manager
 */
function AnimatedSprite(params, animManager) {
	Sprite.call(this, params);

	this.animManager = animManager || new AnimManager(this);
}
inherits(AnimatedSprite, Sprite);
module.exports = AnimatedSprite;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimatedSprite.prototype.setAnimManager = function (animManager) {
	this.animManager.switchAnimationManager(animManager);
	this.animManager = animManager;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render element
 *
 */
AnimatedSprite.prototype.render = function () {
	this.renderer.save();

	// Applying tint
	this.renderer.multiplyColor(this.tint[0], this.tint[1], this.tint[2], this.tint[3]);

	// Applying transformations
	this.renderer.translate(this._x, this._y);
	if (this._rotation !== 0) {
		this.renderer.rotate(this._rotation);
	}
	this.renderer.scale(this._scaleX, this._scaleY);

	// Rendering
	this.animManager.draw(this.renderer);

	this.renderer.restore();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimatedSprite.prototype.remove = function () {
	this.hide();
	if (this.isWhiteListed === true) { return this.animManager.stop(); }
	if (this._cleared === true) { return; } // Already cleared
	this._cleared = true;
	this.animManager.clear();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimatedSprite.prototype.refreshAnimation = function (areasToRefresh) {
	this.isOutdated = false;

	if (this.isDisplayed === false) {
		// Current bounding box will be returned as the area to refresh
		if (areasToRefresh !== undefined) {
			areasToRefresh.push(this.bbox);
		}

		// And replacing current bounding box by an empty box
		this.bbox = [Infinity, -Infinity, Infinity, -Infinity];
		return;
	}

	// Fetching bounding box for the current frame
	var bboxInterval = this.bbox;
	var relativeBBox = this.animManager.generateCurrentFrameData();

	// Setting the bounding box for the current animation relative to its position
	if (this._rotation === 0) {
		// Fast case (optimisation), the sprite has no rotation
		this.bbox = [
			this._x + this._scaleX * (this._scaleX > 0 ? relativeBBox[0] : relativeBBox[1]),
			this._x + this._scaleX * (this._scaleX > 0 ? relativeBBox[1] : relativeBBox[0]),
			this._y + this._scaleY * relativeBBox[2],
			this._y + this._scaleY * relativeBBox[3]
		];
	} else {
		var cos = Math.cos(this._rotation);
		var sin = Math.sin(this._rotation);

		var l = this._scaleX * relativeBBox[0];
		var r = this._scaleX * relativeBBox[1];
		var t = this._scaleY * relativeBBox[2];
		var b = this._scaleY * relativeBBox[3];

		var x0 = (cos * l - sin * t);
		var y0 = (sin * l + cos * t);

		var x1 = (cos * r - sin * t);
		var y1 = (sin * r + cos * t);

		var x2 = (cos * l - sin * b);
		var y2 = (sin * l + cos * b);

		var x3 = (cos * r - sin * b);
		var y3 = (sin * r + cos * b);

		this.bbox = [
			this._x + Math.min(x0, x1, x2, x3),
			this._x + Math.max(x0, x1, x2, x3),
			this._y + Math.min(y0, y1, y2, y3),
			this._y + Math.max(y0, y1, y2, y3)
		];
	}

	// Computing total surface to refresh
	bboxInterval[0] = Math.floor(Math.min(bboxInterval[0], this.bbox[0]));
	bboxInterval[1] =  Math.ceil(Math.max(bboxInterval[1], this.bbox[1]));
	bboxInterval[2] = Math.floor(Math.min(bboxInterval[2], this.bbox[2]));
	bboxInterval[3] =  Math.ceil(Math.max(bboxInterval[3], this.bbox[3]));

	if (areasToRefresh !== undefined) {
		areasToRefresh.push(bboxInterval);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
AnimatedSprite.prototype._refreshAnimation = AnimatedSprite.prototype.refreshAnimation;




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AnimatedSprite/index.js
 ** module id = 242
 ** module chunks = 0
 **/