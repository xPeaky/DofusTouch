var CanvasText = require('CanvasText');
var constants = require('constants');

var CELL_WIDTH           = constants.CELL_WIDTH;
var CELL_HEIGHT          = constants.CELL_HEIGHT;
var CELL_HALF_WIDTH      = CELL_WIDTH / 2;
var CELL_QUARTER_HEIGHT     = CELL_HEIGHT / 4;

function TurnNumber(x, y, number) {
	this._number = number;
	this._numberImage = new CanvasText(number);
	this._numberImage.x = x - CELL_HALF_WIDTH;
	this._numberImage.y = y - CELL_QUARTER_HEIGHT;
}
module.exports = TurnNumber;

TurnNumber.prototype.updatePosition = function (x, y) {
	this._numberImage.x = x - CELL_HALF_WIDTH;
	this._numberImage.y = y - CELL_QUARTER_HEIGHT;
};

TurnNumber.prototype.updateNumber = function (number) {
	if (number !== this._number) {
		this._numberImage = new CanvasText(number);
		this._number = number;
	}
};

TurnNumber.prototype.remove = function () {
	this._numberImage.clear();
	this._numberImage = null;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/TurnNumber/index.js
 ** module id = 621
 ** module chunks = 0
 **/