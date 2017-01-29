//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** 2 dimensional vector
 *
 * @param {Number} x
 * @param {Number} y
 */
function Vector2(x, y) {
	this.x = x;
	this.y = y;
}
module.exports = Vector2;

Vector2.prototype.plus = function (vector) {
	return new Vector2(this.x + vector.x, this.y + vector.y);
};

Vector2.prototype.copy = function () {
	return new Vector2(this.x, this.y);
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/WorldMap/Vector2.js
 ** module id = 849
 ** module chunks = 0
 **/