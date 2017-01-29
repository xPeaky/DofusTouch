var inherits = require('util').inherits;
var EventEmitter = require('events.js').EventEmitter;
var tapPosition = require('tapHelper').position;
var PingBtn = require('PingEmoteSystem/PingEmoteBtn');
var PingBox = require('PingEmoteSystem/PingBox');
var EmoteBox = require('PingEmoteSystem/EmoteBox');

var PICTO_TIMEOUT = 4000; // ms

/**
 * Ping system, entry point of the ping feature
 * @constructor
 */
function PingSystem() {
	EventEmitter.call(this);

	var self = this;
	var gui = window.gui;

	// are we in ping mode
	this._isActive = false;
	// the map of active picto
	this._activePictoMap = {};

	// need to wait GUI to be initialized to setupEvents

	gui.once('initialized', function () {
		var gameGuiContainer = window.gui.gameGuiContainer;
		// create the button and the ping box

		self._pingBtn = gameGuiContainer.appendChild(new PingBtn());
		self._pingBox = gameGuiContainer.appendChild(new PingBox());
		self._emoteBox = gameGuiContainer.appendChild(new EmoteBox());

		self._setupEvents(gui);
		self._emoteBox.refreshPosition();
		self._emoteBox.hide();
	});

	// on GUI disconnect

	gui.on('disconnect', function () {
		self._reset();
		self._resetPicto();
	});

	gui.fightManager.on('fightStart', function () {
		self._pingBtn.enterFightState();
	});

	gui.fightManager.on('fightEnd', function () {
		self._pingBtn.enterRolePlayState();
	});
}

inherits(PingSystem, EventEmitter);
module.exports = PingSystem;

/**
 * The color of the ping cells (Orange ish)
 * @type {{r: number, g: number, b: number, a: number}}
 */
PingSystem.prototype.PING_CELL_COLOR = {
	r: 240,
	g: 160,
	b: 65,
	a: 0.75
};

/**
 * @private
 */
PingSystem.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;
	var pingBtn = this._pingBtn;
	var pingBox = this._pingBox;


	// reset at the end of the fight, if the user is still in activate mode when we get the fight end message

	gui.on('GameFightEndMessage', function () {
		self._reset();
		self._resetPicto();
	});

	// the pingBtn sent us an activate message

	pingBtn.on('pingBtnActivate', function (isActivate) {
		// we can activate it exclusively in fight

		if (!gui.playerData.isFighting) {
			return;
		}

		self._isActive = isActivate;

		// if the pingBox is open when the user de-activate the ping mode, close the ping box

		if (!isActivate) {
			self._pingBox.close();
		}
	});

	pingBtn.on('emoteBtnTap', function () {
		if (self._emoteBox.isOpen) {
			self._emoteBox.hide();
		} else {
			if (gui.playerData.isFighting) {
				return;
			}
			self._emoteBox.show();
			self._emoteBox.refreshPosition();
		}
	});

	// listen the actions from the ping box

	// on action sent de-activate the ping mode
	pingBox.on('actionSent', function () {
		self._reset();
	});
};

/**
 * Cancel the ping request by touching out of the ping box menu
 */
PingSystem.prototype.cancelPingBox = function () {
	this._pingBox.close();
};

/**
 * Open the ping menu
 * @param {number} cellId
 * @param {boolean} isEmptyCell - does the cell have an actor or not
 */
PingSystem.prototype.openPingBox = function (cellId, isEmptyCell) {
	this._pingBox.open(tapPosition.x, tapPosition.y, cellId, isEmptyCell);
};

/**
 * @return {boolean}
 */
PingSystem.prototype.isPingBoxOpen = function () {
	return this._pingBox.isOpen();
};

/**
 * Add the ping picto on the fight map (take care of multiple calls for the same object)
 * @param {number} cellId
 * @param {String} className
 */
PingSystem.prototype.addPingPicto = function (cellId, className) {
	// we can activate it exclusively in fight
	if (!window.gui.playerData.isFighting || cellId === -1) {
		return;
	}

	var self = this;
	var id = className + '-cellId' + cellId;

	function addSetTimeout(id) {
		return window.setTimeout(function () {
			window.isoEngine.mapRenderer.removePingPicto(id);
			delete self._activePictoMap[id];
		}, PICTO_TIMEOUT);
	}

	if (this._activePictoMap[id]) {
		// if already there reset the timeout

		window.clearTimeout(this._activePictoMap[id]);
		this._activePictoMap[id] = addSetTimeout(id);
		return;
	}

	window.isoEngine.mapRenderer.addPingPictoOnCell(id, cellId, className);
	this._activePictoMap[id] = addSetTimeout(id);
};

/**
 * Remove all the ping picto
 * @private
 */
PingSystem.prototype._removePingPicto = function () {
	for (var id in this._activePictoMap) {
		if (this._activePictoMap.hasOwnProperty(id)) {
			window.clearTimeout(this._activePictoMap[id]);
			window.isoEngine.mapRenderer.removePingPicto(id);
			delete this._activePictoMap[id];
		}
	}
};

/**
 * Reset pingBtn, pingBox components from the pingSystem and de-activate the mode
 * @private
 */
PingSystem.prototype._reset = function () {
	this._isActive = false;
	this._pingBtn.setActivateMode(false);
	this._pingBox.close();
};

/**
 * Reset the pingPicto component from the pingSystem
 * @private
 */
PingSystem.prototype._resetPicto = function () {
	this._removePingPicto();
	this._activePictoMap = {};
};

/**
 * Tell you if the ping mode is active or not
 * @return {boolean}
 */
PingSystem.prototype.isActive = function () {
	return this._isActive;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PingEmoteSystem/index.js
 ** module id = 551
 ** module chunks = 0
 **/