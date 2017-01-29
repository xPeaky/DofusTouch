var EventEmitter = require('events.js').EventEmitter;
var flags = require('./flags.js');
var inherits = require('util').inherits;
var PointOfInterest = require('./poi.js');
var questFollower = require('./questFollower.js');
var staticContent = require('staticContent');
var gameOptions = require('gameOptions');
var getText = require('getText').getText;

// enums
var GuildInformationsTypeEnum = require('GuildInformationsTypeEnum');

// const
var WORLD_OF_AMAKNA = 1;
var WORLD_OF_INCARNAM = 2;
var FRIGOST_III = 12;
var WORLD_FIXED = 'fixed';

// singleton GPS (global positioning system)
function GPS() {
	var self = this;
	var gui = window.gui;

	// knows which worlds have what POIs on them and which ones are tracking
	EventEmitter.call(this);

	// fields
	this._POIMap = {}; // point of interest: any account-related icon & highlighted area on map
	this._lastPhoenixes = [];

	// init
	flags.init(this);
	questFollower.init();

	gui.on('disconnect', this._sweep.bind(this));

	// world map
	gui.playerData.position.on('worldMapUpdate', function () {
		self.changeMap(this.worldmapId);
	});
}

inherits(GPS, EventEmitter);

// private
GPS.prototype._requestUpdatePOI = function (poi, worldMapId, x, y, nameId) {
	// if no position change, do nothing
	if (poi.x !== x || poi.y !== y) {
		poi.x = x;
		poi.y = y;
		if (nameId) {
			poi.nameId = nameId;
		}
		this.emit('updatePOI', poi, worldMapId);
	}
};

GPS.prototype._updatePOI = function (poiParams) {
	// e.g. compass update gives coords, place POI at those coords
	poiParams = poiParams || {};

	var self = this;

	var poiId = poiParams.id;
	var x = poiParams.x;
	var y = poiParams.y;
	var nameId = poiParams.nameId;

	// remove or update POI from current world
	var currentWorldMapId = window.gui.playerData.position.worldmapId;
	var poi = this.getPOI(poiId, currentWorldMapId);

	if (poi) {
		// poi exists? update coords directly;
		this._requestUpdatePOI(poi, currentWorldMapId, x, y, nameId);
	} else {
		// received update before POI added or finished adding? add now
		if (x === undefined && y === undefined) {
			self.removePOI(poiId, currentWorldMapId); // receiving no coords also means remove
		} else {
			// since x & y came from compass message, simply add the poi to current world
			delete poiParams.mapId;
			this.addPOI(poiParams);
		}
	}
};

GPS.prototype._validateWorldMapId = function (worldMapId) {
	var dbWorldMap = window.gui.databases.WorldMaps[worldMapId];
	if (dbWorldMap || worldMapId === WORLD_FIXED) { // FIX: || worldMapId === WORLD_FIXED
		if (!this._POIMap[worldMapId]) {
			this._POIMap[worldMapId] = {};
		}

		return dbWorldMap ? dbWorldMap.id : worldMapId;
	}

	console.warn('World map', worldMapId, 'does not exist.');
};

GPS.prototype._redrawCompass = function () {
	// must be called after every _enableTracking
	window.gui.compass.updateMarkersPositions();
};

GPS.prototype._enableTracking = function (poiId, worldMapId, toggle) {
	// enable or disable tracking (arrow markers) on a POI
	toggle = toggle !== undefined ? toggle : true;

	var poi = this.getPOI(poiId, worldMapId);

	var compass = window.gui.compass;

	if (toggle) {
		compass.addMarker({ type: poiId, x: poi.x, y: poi.y, arrowType: poi.categoryId, tooltip: poi.nameId });
	} else {
		compass.removeMarker(poiId);
	}

	// NOTE: must call redrawCompass when done enableTracking for one or multiple POIs!
};

GPS.prototype._getMapPosition = function (mapId, callback) {
	if (mapId === undefined) {
		return callback();
	}
	staticContent.getData('MapPositions', mapId, function (error, mapPosition) {
		if (error) {
			return callback(error);
		}

		callback(null, mapPosition);
	});
};

GPS.prototype._requestGuildInfo = function () {
	if (!window.gui.playerData.guild.hasGuild()) {
		return;
	}
	// request guild info from server
	for (var id in GuildInformationsTypeEnum) {
		var infoType = GuildInformationsTypeEnum[id];
		window.dofus.sendMessage('GuildGetInformationsMessage', { infoType: infoType });
		// --> GuildHousesInformationMessage
	}
};

GPS.prototype._sweep = function () {
	// remove all POIs from all worlds
	for (var worldMapId in this._POIMap) {
		var worldMapMap = this._POIMap[worldMapId];
		for (var poiId in worldMapMap) {
			this.removePOI(poiId, worldMapId);
		}
	}
};

GPS.prototype._isDungeonMap = function (worldMapId) {
	// use this to skip checks for houses, possessions, and hints on the map
	return worldMapId !== WORLD_OF_INCARNAM && worldMapId !== WORLD_OF_AMAKNA && worldMapId !== FRIGOST_III;
};

// public
GPS.prototype.addPOI = function (poiParams) {
	// add POI (without tracking) to a world
	var self = this;

	poiParams = poiParams || {};

	// if playerData's position is not ready yet, let's wait for it
	if (window.gui.playerData.position.worldmapId === 0) {
		return window.gui.playerData.position.once('mapUpdate', function () {
			self.addPOI(poiParams);
		});
	}

	// if there's data associated with POI and it has a mapId that produces a mapPosition
	// means it's moving around in an area we can't directly see
	// store POI also into the location shown by mapPosition
	// (even if duplicate, possible to view same POI in mutliple world maps)
	function addToMap(mapPosition) {
		if (!mapPosition && (poiParams.x === undefined || poiParams.y === undefined)) {
			return;
		}

		mapPosition = mapPosition || {};

		// mapPosition takes precedence
		var newX = mapPosition.posX !== undefined ? mapPosition.posX : poiParams.x;
		var newY = mapPosition.posY !== undefined ? mapPosition.posY : poiParams.y;

		var poi = new PointOfInterest(poiParams);
		poi.x = newX;
		poi.y = newY;

		var currentWorldMapId = window.gui.playerData.position.worldmapId;
		var worldMapId = mapPosition.worldMap !== -1 ? mapPosition.worldMap || currentWorldMapId : currentWorldMapId;
		self._validateWorldMapId(worldMapId);

		// already added? just update
		var existingPOI = self._POIMap[worldMapId][poi.id];
		if (existingPOI) {
			return self._requestUpdatePOI(existingPOI, worldMapId, newX, newY);
		}

		// add to GPS memory
		self._POIMap[worldMapId][poi.id] = poi; // e.g. a flag in the pigs maze map or house in Incarnum map

		if (poi.isDestination) { // auto track if on the map?
			self.addDestination(poi.id, worldMapId);
		}

		// tell map window to show self icon data
		self.emit('addPOI', poi, worldMapId);
	}

	var mapId = poiParams.mapId;

	if (mapId) {
		// mapId takes precedence; if it refers to current world map, don't use provided x & y, use fetched x & y
		this._getMapPosition(mapId, function (error, mapPosition) {
			if (error) {
				return console.error(error);
			}
			addToMap(mapPosition);
		});
	} else {
		if (poiParams.categoryId === 'questObjective') {
			// all Incarnam quests have a mapId (cf. questFactory/objectivesMapIdFix.js to know more)
			addToMap({ worldMap: WORLD_OF_AMAKNA });
		} else {
			var currentWorldMapId = window.gui.playerData.position.worldmapId;
			addToMap({ worldMap: currentWorldMapId });
		}
	}
};

GPS.prototype.removePOI = function (poiId, worldMapId) {
	// if no worldMapId specified, remove this ID from all maps
	if (worldMapId !== undefined) {
		worldMapId = this._validateWorldMapId(worldMapId);
		if (worldMapId === undefined || !this.getPOI(poiId, worldMapId)) {
			return;
		}

		this.removeDestination(poiId, worldMapId);

		delete this._POIMap[worldMapId][poiId];

		// tell map window to remove this icon data
		this.emit('removePOI', poiId, worldMapId);
	} else {
		for (var wId in this._POIMap) {
			this.removePOI(poiId, wId);
		}
	}

	// FIX
	if (this._POIMap[WORLD_FIXED] && this._POIMap[WORLD_FIXED][poiId]) {
		delete this._POIMap[WORLD_FIXED][poiId];
	}
};

GPS.prototype.changeMap = function (worldMapId) {
	if (worldMapId === undefined) {
		return;
	}

	var self = this;

	// display a new world map and populate it with all POIs for that world
	var id, poi;

	if (!this._isDungeonMap(worldMapId)) {
		this._requestGuildInfo();
	}

	// FIX world map
	// immediately remove all fixed positions from last world map and add them to current world map
	for (id in this._POIMap[WORLD_FIXED]) {
		poi = this._POIMap[WORLD_FIXED][id];
		this.removePOI(id, this._lastWorldMapId);

		poi.mapId = 0;
		this.addPOI(poi); // poi has same structure as params, add to current world an re-add to fixed
	}

	// remove last destinations from compass
	function removeDestinations(worldMapId) {
		var worldMapMap = self._POIMap[worldMapId]; // not a typo
		if (worldMapMap) {
			for (var id in worldMapMap) {
				poi = worldMapMap[id];
				if (!poi.isDestination) {
					continue;
				}
				// stop tracking
				self._enableTracking(id, self._lastWorldMapId, false);
			}
		}
	}

	removeDestinations(this._lastWorldMapId);

	// add current world's destinations
	var destinations = [];
	function addDestinations(worldMapId) {
		for (var id in self._POIMap[worldMapId]) {
			poi = self._POIMap[worldMapId][id];
			if (!poi.isDestination) {
				continue;
			}
			// start tracking
			self._enableTracking(id, worldMapId);

			destinations.push(poi.id);
		}
	}

	addDestinations(worldMapId);

	// clean compass
	var compass = window.gui.compass;
	for (id in compass.markers) {
		if (destinations.indexOf(id) === -1) {
			compass.removeMarker(id);
		}
	}

	this._redrawCompass();

	// tell world map window to remove all icons and add the ones for current map
	this.emit('changedMap', worldMapId);

	this._lastWorldMapId = worldMapId;
};

GPS.prototype.getPOI = function (poiId, worldMapId) {
	// get as requested
	if (worldMapId !== undefined) {
		if (this._validateWorldMapId(worldMapId)) {
			return this._POIMap[worldMapId][poiId];
		}
	}

	// return all matching points
	var pId, wId, pois;
	for (wId in this._POIMap) {
		var map = this._POIMap[wId];
		for (pId in map) {
			if (pId === poiId) {
				pois = pois || {};
				pois[wId] = pois[wId] || {};
				pois[wId][pId] = map[pId];
			}
		}
	}

	return pois;
};

GPS.prototype.getPOIs = function (worldMapId) {
	// default to current world
	var pois = {};
	worldMapId = worldMapId || window.gui.playerData.position.worldmapId;
	pois = this._POIMap[this._validateWorldMapId(worldMapId)];

	// affix permanent (result of broken database) POIs to every map
	for (var id in this._fixedPOIMap) {
		pois[id] = this._fixedPOIMap[id];
	}

	return pois;
};

GPS.prototype.addDestination = function (poiId, worldMapId) {
	worldMapId = this._validateWorldMapId(worldMapId);
	if (worldMapId === undefined) {
		return;
	}
	var poi = this.getPOI(poiId, worldMapId);
	poi.isDestination = true;

	// only track if we're in the same world
	if (worldMapId === window.gui.playerData.position.worldmapId) {
		this._enableTracking(poiId, worldMapId);
		this._redrawCompass();
	}

	this.emit('addDestination', poi, worldMapId);
};

GPS.prototype.removeDestination = function (poiId, worldMapId) {
	worldMapId = this._validateWorldMapId(worldMapId);
	if (worldMapId === undefined) {
		return;
	}
	var poi = this.getPOI(poiId, worldMapId);
	poi.isDestination = false;

	// only stop tracking if we're in the same world
	if (worldMapId === window.gui.playerData.position.worldmapId) {
		this._enableTracking(poiId, worldMapId, false);
		this._redrawCompass();
	}

	this.emit('removeDestination', poiId, worldMapId);
};

GPS.prototype.getQuestObjectivePoiId = function (objectiveId) {
	return 'quest_' + objectiveId;
};

function getObjectiveCoords(mapId, cb) {
	staticContent.getData('MapPositions', mapId, function (error, mapPosition) {
		if (error) {
			return console.error('GPS getObjectiveCoords: cannot load MapPositions from mapId ' + mapId, error);
		}

		if (!mapPosition.subAreaId) {
			return cb({ x: mapPosition.posX, y: mapPosition.posY, mapId: mapId });
		}

		staticContent.getData('SubAreas', mapPosition.subAreaId, function (error, subArea) {
			if (error) {
				return console.error('GPS getObjectiveCoords: cannot load SubAreas ' + mapPosition.subAreaId, error);
			}

			var entranceMapIds = subArea.entranceMapIds || [];
			var exitMapIds = subArea.exitMapIds || [];

			var databases = window.gui.databases;
			var area = databases.Areas[subArea.areaId];
			var superArea = databases.SuperAreas[area.superAreaId];
			var objectiveWorldMapId = subArea.customWorldMap[0] || superArea.worldmapId;
			var currentWorldMapId = window.gui.playerData.position.worldmapId;

			var mapPosId;
			if (currentWorldMapId !== objectiveWorldMapId) {
				if (currentWorldMapId === WORLD_OF_AMAKNA) {
					mapPosId = entranceMapIds[0];
				} else {
					mapPosId = exitMapIds[0];
				}
			}

			if (mapPosId === undefined) {
				return cb({ x: mapPosition.posX, y: mapPosition.posY, mapId: mapId });
			}

			staticContent.getData('MapPositions', mapPosId, function (error, newMapPosition) {
				if (error) {
					return console.error('GPS getObjectiveCoords: cannot load MapPositions from mapId ' + mapPosId, error);
				}
				cb({ x: newMapPosition.posX, y: newMapPosition.posY, mapId: mapPosId });
			});
		});
	});
}

GPS.prototype.addQuestObjectiveFromObjective = function (params) {
	params = params || {};
	var objectiveDb = params.objectiveDb;
	var objectiveId = params.objectiveId;
	var questId = params.questId;
	var coords = params.coords || null;

	var self = this;
	var id = this.getQuestObjectivePoiId(objectiveId);
	if (this.getPOI(id)) { return; }
	var mapId = objectiveDb.mapId;

	if (!coords) {
		// mapId info prevails on objective coords (cf. questFactory/objectivesMapIdFix.js to know more)
		if (mapId) {
			return getObjectiveCoords(mapId, function (coords) {
				coords = coords || objectiveDb.coords;
				self.addQuestObjectiveFromObjective({
					objectiveDb: objectiveDb,
					objectiveId: objectiveId,
					coords: coords,
					questId: questId
				});
			});
		} else {
			coords = objectiveDb.coords;
		}
	}

	// data in database can be empty
	if (!coords || coords.x === undefined || coords.y === undefined) { return; }

	var quest = window.gui.playerData.quests.all[questId];

	var questText = quest.dbQuest.nameId;
	var objectiveText = '';
	for (var i = 0; i < quest.objectives.length; i++) {
		var objective = quest.objectives[i];
		if (objective.objectiveId === objectiveId) {
			objectiveText = objective.text;
			break;
		}
	}

	var poiParams = {
		id: id,
		x: coords.x,
		y: coords.y,
		mapId: mapId,
		nameId: questText + '\n\n' + objectiveText + '\n\n' + '(' + coords.x + ',' + coords.y + ')',
		categoryId: 'questObjective',
		color: { r: 102, g: 204, b: 0, a: 1 },
		isDestination: true
	};
	this.addPOI(poiParams);
};

GPS.prototype.addQuestObjective = function (questId, objectiveId) {
	if (window.gui.playerData.isFighting) { return; }
	var activeQuests = window.gui.playerData.quests;
	if (!activeQuests[questId]) {
		return console.warn('GPS.addQuestObjective: quest id' + questId + ' is not active.');
	}
	var objectiveDb = activeQuests[questId].dbObjectives[objectiveId];
	this.addQuestObjectiveFromObjective({
		objectiveDb: objectiveDb,
		objectiveId: objectiveId,
		questId: questId
	});
};

GPS.prototype.addQuestNextObjective = function (questId) {
	if (window.gui.playerData.isFighting) { return; }
	var quests = window.gui.playerData.quests;
	if (!quests.active[questId]) {
		return console.warn('GPS.addQuestNextObjective: quest id' + questId + ' is not active.');
	}
	var quest = quests.active[questId];
	for (var i = 0; i < quest.objectives.length; i++) {
		var objective = quest.objectives[i];
		if (objective.objectiveStatus) {
			var objectiveId = objective.objectiveId;
			var objectiveDb = quest.dbObjectives[objectiveId];
			this.addQuestObjectiveFromObjective({
				objectiveDb: objectiveDb,
				objectiveId: objectiveId,
				questId: questId
			});
		}
	}
};

GPS.prototype.removeQuestObjectives = function (questId) {
	var quest = window.gui.playerData.quests.all[questId];
	if (!quest) {
		return console.warn('GPS.removeQuestObjectives: quest id' + questId + ' not found.');
	}
	for (var i = 0; i < quest.objectives.length; i++) {
		var objective = quest.objectives[i];
		if (objective.objectiveStatus) {
			var objectiveId = objective.objectiveId;
			var poiId = this.getQuestObjectivePoiId(objectiveId);
			this.removePOI(poiId);
		}
	}
};

GPS.prototype.addAllQuestsObjectives = function () {
	var quests = window.gui.playerData.quests;
	for (var questId in quests.active) {
		this.addQuestNextObjective(questId);
	}
};

GPS.prototype.addAllFollowedQuestsObjectives = function () {
	var quests = window.gui.playerData.quests;
	for (var questId in quests.active) {
		if (!this.questFollower.isQuestFollowed(questId)) { continue; }
		this.addQuestNextObjective(questId);
	}
};

GPS.prototype.isAtLeastOneQuestObjectiveFollowed = function (questId) {
	var quest = window.gui.playerData.quests.active[questId];
	if (!quest) {
		console.warn('GPS.isAtLeastOneQuestObjectiveFollowed: quest id' + questId + ' not active.');
		return false;
	}
	for (var i = 0; i < quest.objectives.length; i++) {
		var objective = quest.objectives[i];
		if (!objective.objectiveStatus) { continue; }
		var objectiveId = objective.objectiveId;
		var poiId = this.getQuestObjectivePoiId(objectiveId);
		if (this.getPOI(poiId)) { return true; }
	}
	return false;
};

GPS.prototype.addCustomFlag = function (x, y) {
	this.addPOI({
		id: 'customFlag_' + x + '_' + y,
		x: x,
		y: y,
		categoryId: 'customFlag',
		nameId: getText('ui.cartography.customFlag') + '\n\n(' + x + ',' + y + ')',
		color: { r: 255, g: 221, b: 0, a: 1 },
		isDestination: true
	});
};

GPS.prototype.removeCustomFlag = function (x, y) {
	this.removePOI('customFlag_' + x + '_' + y);
};

GPS.prototype.autoGpsFlagOptionUpdate = function () {
	if (gameOptions.autoGpsFlags) {
		this.addAllFollowedQuestsObjectives();
	} else {
		this._sweep();
	}
};

GPS.prototype.questFollower = questFollower;

module.exports = GPS;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/GPS/index.js
 ** module id = 469
 ** module chunks = 0
 **/