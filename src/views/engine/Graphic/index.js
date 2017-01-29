var inherits = require('util').inherits;
var Sprite   = require('Sprite');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class Graphic
 *
 * @param {Object} params  - properties of the graphic
 * @param {Object} texture - position of graphic in atlas image
 */
function Graphic(params, texture) {
	Sprite.call(this, params);

	this.w = params.w || 0; // width
	this.h = params.h || 0; // height

	this.texture = texture;
}
inherits(Graphic, Sprite);
module.exports = Graphic;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Render method of Sprite overridden for performance
 *
 */
Graphic.prototype.render = function () {
	this.renderer.save();

	// Applying tint
	this.renderer.multiplyColor(this.tint[0], this.tint[1], this.tint[2], this.tint[3]);

	// Applying transformations
	this.renderer.drawImage(this.texture, this._x, this._y, this.w * this._scaleX, this.h);
	this.renderer.restore();
};

Graphic.prototype.generateCurrentFrameData = function () {
	return [0, this.w, 0, this.h];
};

Graphic.prototype.clear = function () {
	if (this.texture) {
		this.texture.release();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Graphic/index.js
 ** module id = 617
 ** module chunks = 0
 **/