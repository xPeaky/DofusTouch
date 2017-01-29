
/**
 * @class Keeps a circular buffer.
 * We keep only maxSize items and overwrite older items if buffer becomes full.
 */
function HistoryBuffer(maxSize) {
	this.maxSize = maxSize;
	this.clear();
}
module.exports = HistoryBuffer;

HistoryBuffer.prototype.clear = function () {
	this.buf = [];
	this.posNext = 0;
	this.posLast = 0;
	this.curSize = 0;
};

HistoryBuffer.prototype.isEmpty = function () {
	return this.curSize === 0;
};

HistoryBuffer.prototype.isFull = function () {
	return this.curSize === this.maxSize;
};

HistoryBuffer.prototype.getCurrentSize = function () {
	return this.curSize;
};

/**
 * Adds a new item at the end of buffer.
 * @param {*} item - the new item
 * @return {*|undefined} - oldest item removed from buffer, or undefined if the buffer still has some room
 */
HistoryBuffer.prototype.push = function (item) {
	var result;
	var next = (this.posNext + 1) % this.maxSize;

	if (this.curSize === this.maxSize) {
		// We "pop" the last one before overwriting it
		result = this.buf[this.posLast];
		this.posLast = next;
	} else {
		this.curSize++;
	}
	this.buf[this.posNext] = item;
	this.posNext = next;
	return result;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Chat/HistoryBuffer.js
 ** module id = 448
 ** module chunks = 0
 **/