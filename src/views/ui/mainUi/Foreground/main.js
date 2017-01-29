var dimensions      = require('dimensionsHelper').dimensions;
var dragManager     = require('dragManager');
var GameContextEnum = require('GameContextEnum');
var gameOptions     = require('gameOptions');
var inherits        = require('util').inherits;
var MinMaxSelector  = require('MinMaxSelector');
var playUiSound     = require('audioManager').playUiSound;
var TeamEnum        = require('TeamEnum');
var WuiDom          = require('wuidom');
var getText         = require('getText').getText;
var processText     = require('getText').processText;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class Foreground
 *  @desc  Displays map foreground and handle user touch event on map.
 */
function Foreground() {
	WuiDom.call(this, 'div', { className: 'foreground', hidden: true });

	this.tapOptions = {};
	this.fightIsUserTurn = false;
	this.isTacticMode = false;
	this.locked = false;
	this.lockMap = {};

	var self = this;
	var gui = window.gui;

	function setForegroundDimensions() {
		self.setStyles({
			left: dimensions.mapLeft + 'px',
			top: dimensions.mapTop + 'px',
			width: dimensions.mapWidth + 'px',
			height: dimensions.mapHeight + 'px'
		});
	}

	gui.once('connected', function () {
		self._setupInfoBox();
		self._createConfirmBox();
		self._setupDrop();
		self._setupTouchInteraction();
		self._setupBorderArrow();
		setForegroundDimensions();
		// position timeline on the bottom right (with a small below space to display buff)
		gui.timeline.setStyles({
			top: (dimensions.mapHeight - 150) + 'px',
			left: dimensions.mapWidth + 'px'
		});
		self._initHandlers(this);

		this.on('disconnect', function () {
			self.tapOptions = {};
			self.fightIsUserTurn = false;
			self.locked = false;
			self.lockMap = {};
			self.hideInfobox();
			self.confirmBox.close();
			self.minMaxSelector.hide();
			self.hide();
		});
	});

	gui.on('resize', setForegroundDimensions);
}

inherits(Foreground, WuiDom);
module.exports = Foreground;


Foreground.prototype._setupDrop = function () {
	var objectUID;
	var self = this;

	function dropItem(quantity) {
		var itemInstance = window.gui.playerData.inventory.objects[objectUID];
		var itemName = itemInstance ? itemInstance.getName() : objectUID;
		window.gui.openConfirmPopup({
			title: getText('ui.common.confirm'),
			message: processText(getText('ui.common.confirmationDropItem'), quantity, itemName),
			cb: function (result) {
				if (!result) { return; }
				window.dofus.sendMessage('ObjectDropMessage', {
					objectUID: objectUID,
					quantity: quantity
				});
				playUiSound('DROP_ITEM_1');
			}
		});
	}

	var minMaxSelector = this.minMaxSelector = window.gui.windowsContainer.appendChild(new MinMaxSelector());
	minMaxSelector.on('confirm', dropItem);

	dragManager.setDroppable(this, ['itemContextMenu', 'equipment']);
	this.on('drop', function (sourceElement, sourceId, params) {
		switch (sourceId) {
		case 'itemContextMenu':
			var canvasCoordinate = self.convertScreenToCanvasCoordinate(params.x, params.y);
			window.isoEngine.useItem(canvasCoordinate.x, canvasCoordinate.y, sourceElement.item.objectUID);
			break;
		case 'equipment':
			objectUID = sourceElement.itemInstance.objectUID;
			var quantity = sourceElement.itemInstance.quantity;
			if (quantity === 1) {
				dropItem(1);
			} else {
				minMaxSelector.open({
					min: 1,
					max: quantity,
					x: params.x,
					y: params.y
				});
			}
			break;
		default:
			break;
		}
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** initialize messages handlers */

Foreground.prototype._initHandlers = function (gui) {
	var self = this;

	gui.on('sendAllFightEvent', function () {
		self._displayUserZones();
	});

	gui.on('GameFightPlacementPossiblePositionsMessage', function (msg) {
		self.tapOptions.mode = 'fightPlacement';
		if (msg.teamNumber === TeamEnum.TEAM_CHALLENGER) {
			self.tapOptions.possiblePlacements = msg.positionsForChallengers;
		} else if (msg.teamNumber === TeamEnum.TEAM_DEFENDER) {
			self.tapOptions.possiblePlacements = msg.positionsForDefenders;
		} else if (self.tapOptions.possiblePlacements) {
			delete self.tapOptions.possiblePlacements;
		}
	});

	function setFightMode() {
		self.tapOptions.mode = 'fight';
		if (self.tapOptions.possiblePlacements) {
			delete self.tapOptions.possiblePlacements;
		}
	}

	gui.on('GameFightJoinMessage', function (msg) {
		if (msg.isFightStarted) {
			return setFightMode();
		}
		self.tapOptions.mode = 'fightPlacement';
	});

	gui.on('GameFightStartMessage', setFightMode);
	gui.on('GameFightResumeMessage', setFightMode);
	gui.on('GameFightResumeWithSlavesMessage', setFightMode);


	function notUserTurn() {
		// if it was not our turn, do nothing (turn from another fighter to another fighter)
		if (!self.fightIsUserTurn) { return; }

		// our turn ended => we remove: confirm box, spell zone, movement zone (if any)
		self.fightIsUserTurn = false;
		self.confirmBox.hide();
		window.isoEngine.clearUserMovementZone();
	}

	gui.on('GameFightTurnStartPlayingMessage', function () {
		self.fightIsUserTurn = true;
	});

	function turnStart(msg) {
		// COMPAT: line below is needed until GameFightTurnStartPlayingMessage (above) is sent by server
		var isUserTurn = self.fightIsUserTurn = gui.playerData.characters.canControlCharacterId(msg.id);

		var isoEngine = window.isoEngine;
		isoEngine.fightTurnStart(isUserTurn);
		isoEngine.clearHighlights();

		if (isUserTurn && gameOptions.soundOnPlayerTurnStart) {
			playUiSound('PLAYER_TURN');
		}

		// display user zone (spell or move); now or when renderer is ready...
		if (!isoEngine.mapRenderer.isReady) {
			return isoEngine.mapRenderer.once('ready', function () {
				self._displayUserZones();
			});
		}
	}

	// COMPAT: remove this event listener when upgrading to 2.19
	gui.on('GameFightTurnStartMessage', turnStart);

	gui.on('GameFightTurnResumeMessage', turnStart);
	gui.on('GameFightTurnStartSlaveMessage', turnStart);

	gui.on('GameFightTurnEndMessage', notUserTurn);
	gui.on('GameFightEndMessage', notUserTurn);

	gui.on('spellSlotSelected', function (spellId) {
		self.selectSpell(spellId);
	});

	gui.on('spellSlotDeselected', function () {
		self.deselectSpell();
	});

	gui.playerData.on('movementPointsCurrentUpdated', function () {
		// In fight, when it is our turn:
		// - after finishing a move, refresh the spell zone (useful if server lags for move+cast sequence)
		// - if the movement zone is displayed, refresh it (range changed)
		//   NB: this happens at the end of a move, but also if you give yourself an MP buff (e.g. Ecaflip's Catnip)
		if (this.isFighting && self.fightIsUserTurn) {  //is Fighting is coming from playerData!
			if (!self.isSpellSelected()) {
				window.isoEngine.displayUserMovementZone();
			}
		}
	});
};

Foreground.prototype._displayUserZones = function () {
	var isSpellSelected = this.isSpellSelected();

	if (this.fightIsUserTurn) {
		if (isSpellSelected) {
			this._displaySpellRange();
		} else {
			window.isoEngine.displayUserMovementZone();
		}
	} else {
		if (isSpellSelected) {
			this._displaySpellRange();
		}
	}
};

Foreground.prototype._displaySpellRange = function () {
	var tapOptions = this.tapOptions;
	// get spell data
	var spellId = tapOptions.spellId;
	var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
	var spellInstance = controlledCharacter.spellData.spells[spellId];
	var zoneEffect    = spellInstance.getZoneEffectWhenCasting();

	// send spell data to isoEngine in order to display range on grid
	var data = {
		spellId:          spellId,
		castInDiagonal:   spellInstance.getProperty('castInDiagonal'),
		castInLine:       spellInstance.getProperty('castInLine'),
		castTestLos:      spellInstance.getProperty('castTestLos'),
		minRange:         spellInstance.getProperty('minRange'),
		range:            spellInstance.getProperty('range'),
		apCost:           spellInstance.getProperty('apCost', spellInstance.level),
		needFreeCell:     spellInstance.getProperty('needFreeCell'),
		needFreeTrapCell: spellInstance.getProperty('needFreeTrapCell'),
		needTakenCell:    spellInstance.getProperty('needTakenCell'),
		name:             spellInstance.getName(),
		zoneEffect:       zoneEffect
	};

	tapOptions.spell = spellInstance;
	window.isoEngine.setCurrentSpell(data);
	window.isoEngine.displaySpellRange();
};

Foreground.prototype.refreshSpellRange = function () {
	if (!this.isSpellSelected()) {
		return;
	}
	this._displaySpellRange();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Select Spell
 *
 */
Foreground.prototype.selectSpell = function (spellId) {
	this.tapOptions.spellId = spellId;
	this.tapOptions.characterId = window.gui.playerData.characters.controlledCharacterId;

	if (this.tapOptions.mode === 'fight') {
		this._displayUserZones();
	}
};

Foreground.prototype.deselectSpell = function () {
	if (this.tapOptions.spellId !== undefined) {
		this.confirmBox.close();
		delete this.tapOptions.spellId;
	}

	if (this.tapOptions.mode === 'fight') {
		this._displayUserZones();
	}
};

Foreground.prototype.isSpellSelected = function () {
	return !!this.tapOptions.spellId || this.tapOptions.spellId === 0;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Lock and unlock foreground for tap events */

Foreground.prototype.lock = function (reason) {
	if (!reason) { return console.error(new Error('Foreground.lock: no reason provided')); }
	this.lockMap[reason] = true;
	this.locked = true;
	this.cancelTransform();
};

Foreground.prototype.unlock = function (reason) {
	if (!reason) { return console.error(new Error('Foreground.unlock: no reason provided')); }
	this.lockMap[reason] = false;
	var reasons = Object.keys(this.lockMap);
	for (var i = 0; i < reasons.length; i++) {
		if (this.lockMap[reasons[i]]) {
			return;
		}
	}
	this.locked = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Toggle game context between FIGHT and ROLE_PLAY.
 *
 * @param {Number} gameContextId - game context
 */
Foreground.prototype.changeGameContext = function (gameContextId) {
	if (gameContextId === GameContextEnum.ROLE_PLAY) {
		this.tapOptions.mode = 'roleplay';
	} else {
		delete this.tapOptions.mode;
	}
	if (this.isTacticMode) {
		window.isoEngine.toggleTacticMode(gameContextId === GameContextEnum.FIGHT);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Enable or disable tactic mode.
 *
 * @param {Boolean} [isTacticMode] - if not provided, toggle current mode.
 */
Foreground.prototype.toggleTacticMode = function (isTacticMode) {
	isTacticMode = isTacticMode === undefined ? !this.isTacticMode : isTacticMode;
	if (this.isTacticMode === isTacticMode) {
		return isTacticMode;
	}
	this.isTacticMode = isTacticMode;
	window.isoEngine.toggleTacticMode(isTacticMode);
	return isTacticMode;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Foreground/main.js
 ** module id = 184
 ** module chunks = 0
 **/