require('./styles.less');
var dimensions = require('dimensionsHelper').dimensions;
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');
var allianceManager = require('allianceManager');
var EmblemLogo = require('EmblemLogo');
var tapBehavior = require('tapBehavior');
var getText = require('getText').getText;
var entityManager = require('socialEntityManager');
var tweener = require('tweener');

var MARGIN_WITH_CORNER = 12; // in px


function MapCoordinateDisplay() {
	WuiDom.call(this, 'div', { className: 'mapCoordinateDisplay', hidden: true });
	this.setupListeners();
	this.createContent();
}
inherits(MapCoordinateDisplay, WuiDom);
module.exports = MapCoordinateDisplay;

MapCoordinateDisplay.prototype.createContent = function () {
	this.descriptionElement = this.createChild('div');
	this.coordinatesElement = this.createChild('div');
	this.allianceInfo = this.createChild('div', { className: 'allianceInfo' });
	tapBehavior(this.allianceInfo);
	this.allianceInfo.on('tap', function () {
		allianceManager.openAllianceCard(this.allianceId);
	});
	this.allianceTag = this.allianceInfo.createChild('div', { className: 'tag' });
	this.allianceEmblem = this.allianceInfo.appendChild(new EmblemLogo({ width: 35, height: 35 }));
};

MapCoordinateDisplay.prototype._updateMapInfo = function () {
	var mapInfo = window.gui.playerData.position;
	if (!mapInfo.mapPosition) { return; }
	var prisms = entityManager.entities.prism;

	var coords = mapInfo.coordinates.posX + ',' + mapInfo.coordinates.posY;

	// show the name of the map with the mapPosition DB
	// if empty show on that format: 'areaName (subAreaName)' and add the subArea level after the coordinates

	// mapPosition with nameId: 10016 (admin cmd: moveto 10016)
	var desc = mapInfo.mapPosition.nameId;

	// if desc is missing
	if (!desc) {
		desc = mapInfo.area.nameId + ' (' + mapInfo.subArea.nameId + ')';
		coords +=  ', ' + getText('ui.common.averageLevel') + ' ' + mapInfo.subArea.level;
	}
	this.descriptionElement.setText(desc);
	this.coordinatesElement.setText(coords);

	var prism = prisms[mapInfo.subArea.id];
	if (prism && prism.prism) {
		var alliance = prism.getAlliance();
		this.allianceInfo.allianceId = alliance.allianceId;
		this.allianceTag.setText('[' + alliance.allianceTag + ']');
		this.allianceEmblem.setValue(alliance.allianceEmblem, true);
		this.allianceInfo.show();
	} else {
		this.allianceInfo.hide();
	}
};

MapCoordinateDisplay.prototype.showMethod = function () {
	var self = this;
	WuiDom.prototype.showMethod.call(this);
	this._updateMapInfo();
	window.setTimeout(function () {
		tweener.tween(self, { opacity: 1 }, { time: 100, easing: 'linear' });
	}, 100);
};

MapCoordinateDisplay.prototype.hideMethod = function () {
	var self = this;
	tweener.tween(
		this,
		{ opacity: 0 },
		{ time: 100, easing: 'linear' },
		function () {
			WuiDom.prototype.hideMethod.call(self);
		}
	);
};

MapCoordinateDisplay.prototype.setupListeners = function () {
	var self = this;
	var gui = window.gui;

	gui.on('disconnect', function () {
		self.hide();
	});

	gui.playerData.position.on('mapUpdate', function () {
		if (!self.isVisible()) { return; }
		self._updateMapInfo();
	});

	gui.on('resize', function () {
		self.setStyles({
			left: dimensions.mapLeft + MARGIN_WITH_CORNER + 'px',
			top: dimensions.mapTop + MARGIN_WITH_CORNER + 'px'
		});
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/MapCoordinateDisplay/index.js
 ** module id = 486
 ** module chunks = 0
 **/