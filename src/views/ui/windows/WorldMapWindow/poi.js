function Poi(worldMap) {
	var self = this;
	var gui = window.gui;
	var GPS = gui.GPS;

	this._lastWorld = null;
	this._worldMap = worldMap;

	GPS.on('addPOI', function addPOI (poi, worldMapId) {
		if (worldMapId && worldMapId !== gui.playerData.position.worldmapId) { return; }
		if (self._worldMap.hasIcon(poi.id)) { return; }

		if (self._worldMap.isLoading()) {
			self._worldMap.once('loaded', function () {
				self._worldMap.addIcon(poi, poi.iconId);
			});
		} else {
			self._worldMap.addIcon(poi, poi.iconId);
		}
	});

	GPS.on('removePOI', function removePOI (poiId, worldMapId) {
		if (worldMapId && worldMapId !== gui.playerData.position.worldmapId) { return; }
		if (!self._worldMap.hasIcon(poiId)) { return; }
		self._worldMap.removeIcon(poiId);
	});

	GPS.on('updatePOI', function updatePOI (poi, worldMapId) {
		if (worldMapId && worldMapId !== gui.playerData.position.worldmapId) { return; }
		if (!self._worldMap.hasIcon(poi.id)) { return; }

		// Changing position of the interest point
		// Visually looks nicer if icon is removed and then added back
		// rather than just moved.
		self._worldMap.removeIcon(poi.id);
		self._worldMap.addIcon(poi, poi.iconId);
	});
}

module.exports = Poi;

Poi.prototype.update = function () {
	var gui = window.gui;
	var GPS = gui.GPS;

	var playerWorld = gui.playerData.position.worldmapId;

	if (this._lastWorld === playerWorld) { return; }

	// remove POIs from previous world map
	var pois = GPS.getPOIs(this._lastWorld);
	for (var id in pois) {
		if (!this._worldMap.hasIcon(id)) { continue; }
		this._worldMap.removeIcon(id);
	}

	// populate new world map
	pois = GPS.getPOIs();
	for (id in pois) {
		if (this._worldMap.hasIcon(id)) { continue; }
		var poi = pois[id];
		this._worldMap.addIcon(poi, poi.iconId);
	}

	this._lastWorld = playerWorld;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/poi.js
 ** module id = 852
 ** module chunks = 0
 **/