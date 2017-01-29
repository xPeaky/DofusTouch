var Delay = require('TINAlight').Delay;

function GridAnimationLayer(cellInfos, gridOverlay) {
	this.cellInfos = cellInfos;
	this._gridOverlay = gridOverlay;
	this.bbox = [Infinity, -Infinity, Infinity, -Infinity];
	this._listReference = null;
}
module.exports = GridAnimationLayer;

GridAnimationLayer.prototype.playAnimation = function (cb) {
	var maxDuration = -Infinity;

	var spriteBoxes = this._gridOverlay.spriteBoxes;
	var cellIds = Object.keys(this.cellInfos);
	for (var c = 0; c < cellIds.length; c++) {
		var cellId    = cellIds[c];
		var cellInfo  = this.cellInfos[cellId];
		var spriteBox = spriteBoxes[cellId];

		var transformState = cellInfo.transformState;
		if (spriteBox.transformState !== transformState) {
			// Using the distance to player to compute the animation delay
			var duration = spriteBox.animate(transformState, cellInfo.distanceToPlayer * 0.6);
			if (maxDuration < duration) {
				maxDuration = duration;
			}

			this._expandToFitBox(spriteBox);
		}
	}

	if (cb) {
		if (maxDuration <= 0) {
			cb();
		} else {
			Delay(maxDuration, cb).start();
		}
	}
};

GridAnimationLayer.prototype._expandToFitPoint = function (x, y) {
	if (this.bbox[0] > x) {
		this.bbox[0] = x;
	}

	if (this.bbox[2] > y) {
		this.bbox[2] = y;
	}

	if (this.bbox[1] < x) {
		this.bbox[1] = x;
	}

	if (this.bbox[3] < y) {
		this.bbox[3] = y;
	}
};

GridAnimationLayer.prototype._expandToFitBox = function (spriteBox) {
	this._expandToFitPoint(spriteBox._x0, spriteBox._y0);
	this._expandToFitPoint(spriteBox._x1, spriteBox._y1);
	this._expandToFitPoint(spriteBox._x2, spriteBox._y2);
	this._expandToFitPoint(spriteBox._x3, spriteBox._y3);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/grid/GridAnimationLayer/index.js
 ** module id = 1026
 ** module chunks = 0
 **/