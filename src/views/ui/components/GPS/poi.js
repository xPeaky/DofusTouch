// const
var ICON_FLAG_DEFAULT = 'flag0';

// class POI (point of interest)
function PointOfInterest(params) {
	params = params || {};

	this.id = params.id;
	this.categoryId = params.categoryId || 'custom';
	this.x = params.x; // worldX
	this.y = params.y; // worldY

	this.nameId = params.nameId || ''; // legend
	this.color = params.color; // overlay color // ASSUMPTION: gray base icon
	if (this.color && !Array.isArray(this.color)) {
		this.color = [
			this.color.r / 124,
			this.color.g / 124,
			this.color.b / 124,
			this.color.a
		];
	}
	this.data = params.data;
	this.isDestination = params.isDestination;

	this.iconId = params.iconId || ICON_FLAG_DEFAULT;
}

module.exports = PointOfInterest;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/GPS/poi.js
 ** module id = 472
 ** module chunks = 0
 **/