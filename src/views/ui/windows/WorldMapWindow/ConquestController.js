//var socialEntityManager = require('socialEntityManager'); // probably need this in the future.
var PrismStateEnum = require('PrismStateEnum');
var getText = require('getText').getText;

// Icons
var RED = 436;
var ORANGE = 421;
var BLUE = 420;

// Prism States
// PRISM_STATE_INVULNERABLE: 0, BLUE
// PRISM_STATE_NORMAL:       1, BLUE
// PRISM_STATE_ATTACKED:     2, BLUE
// PRISM_STATE_FIGHTING:     3, BLUE
// PRISM_STATE_WEAKENED:     4, ORANGE
// PRISM_STATE_VULNERABLE:   5, RED
// PRISM_STATE_DEFEATED:     6  RED


function ConquestController() {
	this._prisms = {};      // All the prisms
	this._emptyPrisms = {};
	this._activePrisms = {};
	this._changingPrisms = {};
	this._worldMap = null;
	this._worldMapLoaded = false;
	this._updateQueue = [];
	var self = this;

	window.gui.on('PrismsListMessage', function (msg) {
		function setPrismLists() {
			self._changingPrisms = msg.prisms;
			var keys = Object.keys(msg.prisms);
			for (var key in keys) {
				var prism = msg.prisms[keys[key]];
				self._prisms[prism.subAreaId] = prism;
				if (prism._type === 'PrismGeolocalizedInformation') {
					self._activePrisms[prism.subAreaId] = prism;
				} else {
					self._emptyPrisms[prism.subAreaId] = prism;
				}
			}
			self._updateWorldMapIcons();
		}
		if (self._worldMapLoaded) {
			setPrismLists();
		} else {
			self._updateQueue.push(setPrismLists);
		}
	});

	window.gui.on('PrismsListUpdateMessage', function (msg) {
		function updatePrismLists() {
			self._changingPrisms = {};
			for (var prismId in msg.prisms) {
				var prism = msg.prisms[prismId];
				var subAreaId = prism.subAreaId;
				var origPrism = self._prisms[prism.subAreaId];

				if (prism._type === 'PrismGeolocalizedInformation') {
					if (!origPrism ||
						origPrism.mapId !== prism.mapId ||
						origPrism.worldX !== prism.worldX ||
						origPrism.worldY !== prism.worldY ||
						origPrism.subAreaId !== prism.subAreaId ||
						origPrism.prism.state !== prism.prism.state ||
						(origPrism.prism.alliance && prism.prism.alliance &&
						(origPrism.prism.alliance.allianceTag !== prism.prism.alliance.allianceTag))) {
						self._changingPrisms[prism.subAreaId] = prism;
					}
					self._activePrisms[subAreaId] = prism;
					delete self._emptyPrisms[subAreaId];
				} else {
					self._emptyPrisms[subAreaId] = prism;
					delete self._activePrisms[subAreaId];
				}
				self._prisms[prism.subAreaId] = prism;
			}
			self._updateWorldMapIcons();
		}
		if (self._worldMapLoaded) {
			updatePrismLists();
		} else {
			self._updateQueue.push(updatePrismLists);
		}
	});

	//TODO: this stuff will likely be necessary in the future.

	// window.gui.on('PrismsInfoValidMessage', function (msg) {
	// 	console.error("_onPrismsInfoValidMessage", msg)
	// });
	//
	// window.gui.on('PrismFightAddedMessage', function (msg) {
	// 	console.error("_onPrismFightAddedMessage", msg)
	// });
	//
	// window.gui.on('PrismFightRemovedMessage', function (msg) {
	// 	console.error("_onPrismFightRemovedMessage", msg)
	// });
	//
	// window.gui.on('PrismFightDefenderAddMessage', function (msg) {
	// 	console.error("_onPrismFightDefenderAddMessage", msg)
	// });
	//
	// window.gui.on('PrismFightDefenderLeaveMessage', function (msg) {
	// 	console.error("_onPrismFightDefenderLeaveMessage", msg)
	// });
	//
	// window.gui.on('PrismFightAttackerAddMessage', function (msg) {
	// 	console.error("_onPrismFightAttackerAddMessage", msg)
	// });
	//
	// window.gui.on('PrismFightAttackerRemoveMessage', function (msg) {
	// 	console.error("_onPrismFightAttackerRemoveMessage", msg)
	// });
	//
	// window.gui.on('PrismFightJoinLeaveRequestMessage', function (msg) {
	// 	console.error("_onPrismFightJoinLeaveRequestMessage", msg)
	// });
}
module.exports = ConquestController;

ConquestController.prototype.clear = function () {
	this._worldMap = null;
	this._worldMapLoaded = false;
	this._updateQueue = [];
};

ConquestController.prototype.setWorldMap = function (worldMap) {
	if (worldMap._worldMapId === 1) {
		this._worldMap = worldMap;
		this._worldMapLoaded = true;
		if (this._updateQueue.length > 0) {
			for (var queuedUpdateIndex in this._updateQueue) {
				var queuedUpdate = this._updateQueue[queuedUpdateIndex];
				queuedUpdate();
				delete this._updateQueue[queuedUpdateIndex];
			}
		}
	}
};


// note; there is some thing odd when using the admin commands when switching state
// for example, it doesn't seem to let you change from vulnerable to weaken
// seems like there is some kind of timer involved as well after vulnerable?
// anyway, behaviour is the same on the flash client.
ConquestController.prototype._updateWorldMapIcons = function () {
	for (var index in this._emptyPrisms) {
		var emptyPrism = this._emptyPrisms[index];
		this._worldMap.removeIcon(emptyPrism.subAreaId);
	}

	// move these?
	var INVULNERABLE =
		getText('ui.prism.prismInState', getText('ui.prism.state' + PrismStateEnum.PRISM_STATE_INVULNERABLE));

	var ATTACKED =
		getText('ui.prism.prismInState', getText('ui.prism.state' + PrismStateEnum.PRISM_STATE_ATTACKED));

	var FIGHTING =
		getText('ui.prism.prismInState', getText('ui.prism.state' + PrismStateEnum.PRISM_STATE_FIGHTING));

	var NORMAL =
		getText('ui.prism.prismInState', getText('ui.prism.state' + PrismStateEnum.PRISM_STATE_NORMAL));

	var WEAKENED =
		getText('ui.prism.prismInState', getText('ui.prism.state' + PrismStateEnum.PRISM_STATE_WEAKENED));

	var VULNERABLE =
		getText('ui.prism.prismInState', getText('ui.prism.state' + PrismStateEnum.PRISM_STATE_VULNERABLE));

	var DEFEATED =
		getText('ui.prism.prismInState', getText('ui.prism.state' + PrismStateEnum.PRISM_STATE_DEFEATED));

	var vulnerability = getText('ui.prism.startVulnerability') + getText('ui.common.colon');
	var vulnerabilityStartTime = getText('ui.prism.vulnerabilityHour');

	var keys = Object.keys(this._changingPrisms);
	for (var key in keys) {
		var prism = this._changingPrisms[keys[key]];
		if (!this._activePrisms[prism.subAreaId]) {
			continue;
		}
		var color;
		var tooltipText;
		var overRideToolTip;
		switch (prism.prism.state) {
			case PrismStateEnum.PRISM_STATE_INVULNERABLE:
				color = BLUE;
				tooltipText = INVULNERABLE + '\n' + vulnerabilityStartTime;
				overRideToolTip = createNameIdOverRideFunc(prism, tooltipText);
				break;
			case PrismStateEnum.PRISM_STATE_NORMAL:
				color = BLUE;
				tooltipText = NORMAL + '\n' + vulnerabilityStartTime;
				overRideToolTip = createNameIdOverRideFunc(prism, tooltipText);
				break;
			case PrismStateEnum.PRISM_STATE_ATTACKED:
				color = BLUE;
				tooltipText = ATTACKED + '\n' + vulnerabilityStartTime;
				overRideToolTip = createNameIdOverRideFunc(prism, tooltipText);
				break;
			case PrismStateEnum.PRISM_STATE_FIGHTING:
				color = BLUE;
				tooltipText = FIGHTING + '\n' + vulnerabilityStartTime;
				overRideToolTip = createNameIdOverRideFunc(prism, tooltipText);
				break;
			case PrismStateEnum.PRISM_STATE_WEAKENED:
				color = ORANGE;
				tooltipText = WEAKENED + '\n' + vulnerability;
				overRideToolTip = createNameIdOverRideFuncForWeakened(prism, tooltipText);
				break;
			case PrismStateEnum.PRISM_STATE_VULNERABLE:
				color = RED;
				tooltipText = VULNERABLE;
				overRideToolTip = (function (tooltipText) { return function () { return tooltipText; }; }(tooltipText));
				break;
			case PrismStateEnum.PRISM_STATE_DEFEATED:
				color = RED;
				tooltipText = DEFEATED;
				overRideToolTip = (function (tooltipText) { return function () { return tooltipText; }; }(tooltipText));
				break;
			default:
				color = RED;
				tooltipText = DEFEATED;
				overRideToolTip = (function (tooltipText) { return function () { return tooltipText; }; }(tooltipText));
				break;
		}

		var iconInfo = {
			id: prism.subAreaId,
			x: prism.worldX,
			y: prism.worldY,
			subAreaId: prism.subAreaId,  // subAreaId used to have lowercase 'a', why?
			categoryId: 'prisms',
			gfx: color,
			nameIdOverRideFunc: overRideToolTip
		};

		if (this._worldMapLoaded) {
			this._worldMap.removeIcon(iconInfo.id);
			this._worldMap.addIcon(iconInfo, 'icon_' + iconInfo.gfx);
		} else {
			console.error('map not loaded!');
		}
	}
};

function createNameIdOverRideFunc(prism, tooltipText) {
	return function () {
		var vulnerableTime = new Date();
		vulnerableTime.setTime((prism.prism.nextVulnerabilityDate * 1000) - Date.now());

		return tooltipText + ' ' + getTimeString(vulnerableTime);
	};
}

function createNameIdOverRideFuncForWeakened(prism, tooltipText) {
	return function () {
		var vulnerableTime = new Date();
		vulnerableTime.setTime(prism.prism.nextVulnerabilityDate * 1000);

		var options = { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
		return tooltipText + ' ' + vulnerableTime.toLocaleString(window.Config.language, options);
	};
}

function getTimeString(dateTime) {
	return dateTime.getHours().toString() +
	':' +
	padZero(dateTime.getMinutes().toString()) +
	':' +
	padZero(dateTime.getSeconds().toString());
}

// better way to do this?
function padZero(number) {
	if (number < 10) {
		return '0' + number;
	}
	return number;
}


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/ConquestController.js
 ** module id = 853
 ** module chunks = 0
 **/