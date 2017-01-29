var Vector2 = require('./Vector2.js');
var getRelativePositions = require('./worldMapHelpers.js').getRelativePositions;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Map icon cluster
 *
 * @param {Number} id
 * @param {Number} x
 * @param {Number} y
 */
function IconCluster(id, x, y) {
	this.id = id;
	this.position = new Vector2(x, y);

	this.icons = [];
	this.nVisibleIcons = 0;
}
module.exports = IconCluster;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To get the position of an icon with respect to the index of the icon among visible icons of its cluster
 *
 * @param {Number} visibleIconIdx
 */
IconCluster.prototype.getIconPosition = function (visibleIconIdx) {
	var relativePositions = getRelativePositions(this.nVisibleIcons);
	return this.position.plus(relativePositions[visibleIconIdx]);
};

IconCluster.prototype.add = function (icon) {
	this.icons.unshift(icon);

	if (icon.visible) {
		this.nVisibleIcons += 1;
	}
};

IconCluster.prototype.remove = function (icon) {
	var idx = this.icons.indexOf(icon);
	if (idx === -1) {
		console.error(new Error('[IconCluster.remove] Icon not in cluster: ' + icon.id));
	} else {
		this.icons.splice(idx, 1);

		if (icon.visible) {
			this.nVisibleIcons -= 1;
		}
	}
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/WorldMap/IconCluster.js
 ** module id = 850
 ** module chunks = 0
 **/