var WebGLRenderer = require('./main.js');

WebGLRenderer.prototype.save = function () {
	this._matrixStack.unshift(this._matrixStack[0].slice());
};

WebGLRenderer.prototype.restore = function () {
	this._matrixStack.shift();
};

WebGLRenderer.prototype.setTransform = function (a, b, c, d, e, f, sw, sh) {
	var matrix = this._matrixStack[0];
	sw =  2 / (sw || this._width);
	sh = -2 / (sh || this._height);

	matrix[0] = a * sw;
	matrix[4] = b * sh;
	matrix[1] = c * sw;
	matrix[5] = d * sh;

	matrix[2] = e * sw - 1;
	matrix[6] = f * sh + 1;
};

WebGLRenderer.prototype.rotate = function (rotation) {
	if (rotation === 0) {
		return;
	}
	var matrix = this._matrixStack[0];

	var cos = Math.cos(rotation);
	var sin = Math.sin(rotation);

	var a = matrix[0];
	var b = matrix[4];
	var c = matrix[1];
	var d = matrix[5];

	matrix[0] = a * cos + c * sin;
	matrix[4] = b * cos + d * sin;
	matrix[1] = c * cos - a * sin;
	matrix[5] = d * cos - b * sin;
};

WebGLRenderer.prototype.translate = function (x, y) {
	var matrix = this._matrixStack[0];
	matrix[2] += matrix[0] * x + matrix[1] * y;
	matrix[6] += matrix[4] * x + matrix[5] * y;
};

WebGLRenderer.prototype.scale = function (sx, sy) {
	var matrix = this._matrixStack[0];
	matrix[0] *= sx;
	matrix[4] *= sx;
	matrix[1] *= sy;
	matrix[5] *= sy;
};

WebGLRenderer.prototype.transform = function (a, b, c, d, e, f) {
	var matrix = this._matrixStack[0];
	var a0 = matrix[0];
	var b0 = matrix[4];
	var c0 = matrix[1];
	var d0 = matrix[5];
	var e0 = matrix[2];
	var f0 = matrix[6];

	matrix[0] = a0 * a + c0 * b;
	matrix[4] = b0 * a + d0 * b;
	matrix[1] = a0 * c + c0 * d;
	matrix[5] = b0 * c + d0 * d;

	matrix[2] = a0 * e + c0 * f + e0;
	matrix[6] = b0 * e + d0 * f + f0;
};

WebGLRenderer.prototype.getTransform = function () {
	var t = this._matrixStack[0];
	return [t[0], t[4], t[1], t[5], t[2], t[6]];
};

WebGLRenderer.prototype.setTint = function (rm, gm, bm, am, ra, ga, ba, aa) {
	var matrix = this._matrixStack[0];
	matrix[8]  = rm;
	matrix[9]  = gm;
	matrix[10] = bm;
	matrix[11] = am;
	matrix[12] = ra / 255;
	matrix[13] = ga / 255;
	matrix[14] = ba / 255;
	matrix[15] = aa / 255;
};

WebGLRenderer.prototype.tint = function (rm, gm, bm, am, ra, ga, ba, aa) {
	var matrix = this._matrixStack[0];
	var rm0 = matrix[8];
	var gm0 = matrix[9];
	var bm0 = matrix[10];
	var am0 = matrix[11];

	matrix[8]  = rm * rm0;
	matrix[9]  = gm * gm0;
	matrix[10] = bm * bm0;
	matrix[11] = am * am0;
	matrix[12] = ra / 255 + matrix[12] * rm;
	matrix[13] = ga / 255 + matrix[13] * gm;
	matrix[14] = ba / 255 + matrix[14] * bm;
	matrix[15] = aa / 255 + matrix[15] * am;
};

WebGLRenderer.prototype.setTintMult = function (rm, gm, bm, am) {
	var matrix = this._matrixStack[0];
	matrix[8]  = rm;
	matrix[9]  = gm;
	matrix[10] = bm;
	matrix[11] = am;
};

WebGLRenderer.prototype.setTintAdd = function (ra, ga, ba, aa) {
	var matrix = this._matrixStack[0];
	matrix[12] = ra / 255;
	matrix[13] = ga / 255;
	matrix[14] = ba / 255;
	matrix[15] = aa / 255;
};

WebGLRenderer.prototype.multiplyColor = function (rm, gm, bm, am) {
	var matrix = this._matrixStack[0];
	matrix[8]  *= rm;
	matrix[9]  *= gm;
	matrix[10] *= bm;
	matrix[11] *= am;
};

WebGLRenderer.prototype.addColor = function (ra, ga, ba, aa) {
	var matrix = this._matrixStack[0];
	matrix[12] += ra * matrix[8]  / 255;
	matrix[13] += ga * matrix[9]  / 255;
	matrix[14] += ba * matrix[10] / 255;
	matrix[15] += aa * matrix[11] / 255;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/WebGLRenderer/transformation.js
 ** module id = 276
 ** module chunks = 0
 **/