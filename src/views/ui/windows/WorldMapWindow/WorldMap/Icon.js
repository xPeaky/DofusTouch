//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Map Icon
 *
 * @param {String} id
 * @param {String} categoryId
 * @param {Object} infoData   - info attached to the icon (for UI purpose)
 * @param {Object} dimensions - Dimensions of the icon on the map and in the texture
 */
function Icon(id, categoryId, infoData, dimensions) {
	this.id = id;

	this.visible = true;
	this.color   = null;

	this.categoryId = categoryId;
	this.infoData   = infoData;
	this.dimensions = dimensions;

	this.cluster          = null;
	this.vertexBufferSlot = null;
}
module.exports = Icon;

Icon.prototype.setVisibility = function (visible) {
	if (this.visible === visible) {
		return false;
	}

	this.visible = visible;
	if (this.cluster) {
		if (visible) {
			this.cluster.nVisibleIcons += 1;
		} else {
			this.cluster.nVisibleIcons -= 1;
		}
	}

	return true;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/WorldMap/Icon.js
 ** module id = 846
 ** module chunks = 0
 **/