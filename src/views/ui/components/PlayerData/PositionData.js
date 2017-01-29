var EventEmitter  = require('events.js').EventEmitter;
var inherits      = require('util').inherits;
var staticContent = require('staticContent');
var audioManager  = require('audioManager');

var INCARNAM_AREA_ID = 45;

function PositionData() {
	EventEmitter.call(this);

	this._reset();
}

inherits(PositionData, EventEmitter);
module.exports = PositionData;

PositionData.prototype.disconnect = function () {
	this._reset();
};

PositionData.prototype._reset = function () {
	this.mapId = 0;
	this.subAreaId = 0;
	this.worldmapId = 0;

	this.mapPosition = null;
	this.subArea = null;
	this.area = null;
	this.superArea = null;

	this.coordinates = {
		posX: 0,
		posY: 0
	};

	this.isInMyHouse = false;
	this.currentMapHouses = {};
};


PositionData.prototype.initialize = function (gui) {
	var self = this;

	function mapChanged(msg) {
		// reset previous houses data
		self.currentMapHouses = {};
		self.emit('mapChanged', msg);
	}

	function updateMap(msg, coords) {
		self.mapId = msg.mapId;

		// Updates the map coordinates
		staticContent.getData('MapPositions', msg.mapId, function (error, mapPosition) {
			if (error) {
				return console.warn('MapPositions error', error);
			}

			self.mapPosition = mapPosition;

			var posX = coords ? coords.worldX : mapPosition.posX;
			var posY = coords ? coords.worldY : mapPosition.posY;

			self.coordinates.posX = posX;
			self.coordinates.posY = posY;

			// continue if already have subArea data and the subArea data matches the msg.subAreaId
			if (self.subArea && self.subArea.id === msg.subAreaId && self.subAreaId === msg.subAreaId) {
				self.emit('mapUpdate');
				audioManager.mapChange(self.subArea.ambientSounds, mapPosition.sounds);
				return;
			}

			self.subAreaId = msg.subAreaId;

			// Updates the map name
			staticContent.getData('SubAreas', self.subAreaId, function (error, subArea) {
				if (error) {
					return console.warn('SubAreas error', error);
				}
				audioManager.mapChange(subArea.ambientSounds, mapPosition.sounds);

				self.subArea = subArea;
				self.area = gui.databases.Areas[subArea.areaId];
				self.superArea = gui.databases.SuperAreas[self.area.superAreaId];

				var worldMapId = mapPosition.worldMap >= 0 ? mapPosition.worldMap : self.superArea.worldmapId;

				if (self.worldmapId !== worldMapId) {
					self.worldmapId = worldMapId;
					self.emit('worldMapUpdate');
				}
				self.emit('mapUpdate');
			});
		});
	}

	function handleMyHouseNotification(msg) {
		var currentHouse = msg.currentHouse;

		if (currentHouse) {
			var playerData = window.gui.playerData;
			self.isInMyHouse = currentHouse.ownerId === playerData.identification.accountId;
			self.emit('myHouseNotification', { isInMyHouse: self.isInMyHouse,  msg: msg });
		} else if (!currentHouse && self.isInMyHouse) {
			self.isInMyHouse = false;
			self.emit('myHouseNotification', { isInMyHouse: self.isInMyHouse });
		}
	}

	gui.on('MapComplementaryInformationsDataMessage', function (msg) {
		mapChanged(msg);
		updateMap(msg);
		handleMyHouseNotification(msg);
	});

	gui.on('MapComplementaryInformationsWithCoordsMessage', function (msg) {
		// Used in the map -29,-52, the small stairway to indoor paddock
		mapChanged(msg);
		updateMap(msg, { worldX: msg.worldX, worldY: msg.worldY });
		handleMyHouseNotification(msg);
	});

	gui.on('MapComplementaryInformationsDataInHouseMessage', function (msg) {
		mapChanged(msg);
		// For example the houses in 1,-15 (Astrub City) are using this type of message
		updateMap(msg, msg.currentHouse);
		handleMyHouseNotification(msg);
	});

	gui.on('HousePropertiesMessage', function (msg) {
		var properties = msg.properties;

		if (!properties) {
			return;
		}

		var houseId = properties.houseId;
		self.currentMapHouses[houseId] = properties;
	});
};

PositionData.prototype.getHousePropertiesById = function (houseId) {
	return this.currentMapHouses[houseId];
};

PositionData.prototype.isInIncarnam = function () {
	if (!this.area) {
		console.warn('isInIncarnam called before we know our area');
		return false;
	}
	return this.area.id === INCARNAM_AREA_ID;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/PositionData.js
 ** module id = 535
 ** module chunks = 0
 **/