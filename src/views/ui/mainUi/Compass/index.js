require('./styles.less');
var dimensions = require('dimensionsHelper').dimensions;
var inherits = require('util').inherits;
var addTooltip = require('TooltipBox').addTooltip;
var WuiDom = require('wuidom');
var distributeMarkers = require('./distributeMarkers.js');
var gameOptions = require('gameOptions');

var ARROW_SIZE = 50;
var WORLD_OF_INCARNAM = 2;

// to fix beginners' corridor distances (unlike the other maps, transitions are done diagonally)
var INCARNAM_DISTANCE_MAP_FIX = {
	'-5,-1': -5,
	'-4,0': -4,
	'-3,1': -3,
	'-2,2': -2
};

function Compass() {
	WuiDom.call(this, 'div', { className: 'Compass' });

	this.markers = {};
}

inherits(Compass, WuiDom);
module.exports = Compass;
// refers to the css class name
Compass.arrowType = { QUEST: 4, PARTY: 2 };

Compass.prototype.addMarker = function (params) {
	this.markers[params.type] = { // type -> id (can be multiple markers of same type)
		type: params.type, // markerId
		arrowType: params.arrowType,
		x: params.x,
		y: params.y,
		tooltip: params.tooltip
	};
	return this.getDistance(params.x, params.y);
};

Compass.prototype.removeMarker = function (markerId) {
	delete this.markers[markerId];
};

Compass.prototype._displayMarkers = function () {
	for (var i = 0; i < this.markersDom.length; i++) {
		var markerDom = this.markersDom[i];
		var angle = markerDom.angleCorrected || markerDom.angle;
		var angleDeg = angle * 180 / Math.PI;

		var posX, posY;
		var width = dimensions.mapWidth - ARROW_SIZE;
		var height = dimensions.mapHeight - ARROW_SIZE;

		if (angleDeg <= -34 && angleDeg >= -146) {
			// top border
			posX = (width - Math.tan((Math.PI / 2) - angle) * height) / 2;
			posY = 0;
		} else if (angleDeg >= 34 && angleDeg <= 146) {
			// bottom border
			posX = (width + Math.tan((Math.PI / 2) - angle) * height) / 2;
			posY = height;
		} else if (angleDeg < 34 && angleDeg > -34) {
			// right border
			posX = width;
			posY = (height + Math.tan(angle) * width) / 2;
		} else {
			// left border
			posX = 0;
			posY = (height - Math.tan(angle) * width) / 2;
		}
		markerDom.setStyles({
			left: dimensions.mapLeft + posX + 'px',
			top: dimensions.mapTop + posY + 'px'
		});

		markerDom.markerArrow.setStyle('webkitTransform', 'rotate(' + angleDeg + 'deg)');
	}
};

Compass.prototype._addMarkerDom = function (marker) {
	var coordinates = window.gui.playerData.position.coordinates;
	if (coordinates.posX === marker.x && coordinates.posY === marker.y) {
		return;
	}
	var deltaX = marker.x - coordinates.posX;
	var deltaY = marker.y - coordinates.posY;
	var distance = this.getDistance(marker.x, marker.y);
	if (distance === 0) {
		return;
	}

	var markerDom = this.createChild('div', { className: 'marker' });
	markerDom.markerArrow = markerDom.createChild('div', { className: 'markerArrow' });
	markerDom.markerArrow.addClassNames('arrow_' + (marker.arrowType || marker.type));
	var markerNumber = markerDom.createChild('div', { className: 'markerNumber' });
	markerNumber.setText(distance);

	addTooltip(markerDom, marker.tooltip);

	markerDom.angle = Math.atan2(deltaY, deltaX);

	// transmit some events to the engine
	markerDom.on('dom.touchstart', function (e) {
		window.foreground.emit('dom.touchstart', e);
	});
	markerDom.on('dom.touchend', function (e) {
		window.foreground.emit('dom.touchend', e);
	});

	this.markersDom.push(markerDom);
};

Compass.prototype.updateMarkersPositions = function () {
	var markerId, marker;
	this.clearContent();
	this.markersDom = [];

	// update markers that are not phoenixes
	for (markerId in this.markers) {
		marker = this.markers[markerId];
		if (marker.arrowType === 'phoenix') { continue; }
		this._addMarkerDom(marker);
	}

	// update phoenixes
	if (gameOptions.autoGpsPhoenixes) {
		var nearestPhoenixes = [];
		var nearestPhoenixDistance = Infinity;
		for (markerId in this.markers) {
			marker = this.markers[markerId];
			if (marker.arrowType !== 'phoenix') { continue; }
			var distance = this.getDistance(marker.x, marker.y);
			if (distance < nearestPhoenixDistance) {
				nearestPhoenixDistance = distance;
				nearestPhoenixes = [];
			}
			if (distance === nearestPhoenixDistance) {
				nearestPhoenixes.push(markerId);
			}
		}
		if (nearestPhoenixDistance > 0) {
			for (var i = 0; i < nearestPhoenixes.length; i++) {
				marker = this.markers[nearestPhoenixes[i]];
				this._addMarkerDom(marker);
			}
		}
	}

	distributeMarkers(this.markersDom);

	this._displayMarkers();
};

Compass.prototype.getDistance = function (x, y) {
	var coordinates = window.gui.playerData.position.coordinates;
	var deltaX = x - coordinates.posX;
	var deltaY = y - coordinates.posY;
	var distance = Math.abs(deltaX) + Math.abs(deltaY);

	var destinationInCorridor = this.isInTutorialCorridor(x, y);
	var playerInCorridor = this.isInTutorialCorridor(coordinates.posX, coordinates.posY);

	if (destinationInCorridor || playerInCorridor) {
		if (destinationInCorridor && playerInCorridor) {
			return Math.abs(x - coordinates.posX);
		} else if (destinationInCorridor) {
			return distance + INCARNAM_DISTANCE_MAP_FIX[x + ',' + y];
		} else {
			return distance + INCARNAM_DISTANCE_MAP_FIX[coordinates.posX + ',' + coordinates.posY];
		}
	}

	return distance;
};

Compass.prototype.isInTutorialCorridor = function (x, y) {
	return (
		window.gui.playerData.position.worldmapId === WORLD_OF_INCARNAM &&
		INCARNAM_DISTANCE_MAP_FIX[x + ',' + y] !== undefined
	);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Compass/index.js
 ** module id = 589
 ** module chunks = 0
 **/