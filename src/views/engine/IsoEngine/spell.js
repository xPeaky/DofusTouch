var IsoEngine                = require('./main.js');
var spellShapes              = require('spellShapes');
var trueName                 = require('rumplestiltskin').trueName;
var mapPoint                 = require('mapPoint');
var getCellIdFromMapPoint    = mapPoint.getCellIdFromMapPoint;
var dofus1Line               = require('ankama/dofus1Line');
var CellInfo                 = require('CellInfo');
var transformStates          = require('transformStates');
var getMapPointFromCellId    = mapPoint.getMapPointFromCellId;

var currentSpell = null;        // since we are global, we are always limited to 1 spell.
var currentRange = null;

IsoEngine.prototype._initGridOverlayLayers = function () {
	this._fightPositionLayer = null;
	this._spellRangeLayer    = null;
	this._spellEffectLayer   = null;
	this._walkLayer          = null;
	this._walkAreaLayer      = null;
	this._enemyWalkAreaLayer = null;
};

IsoEngine.prototype._resetFightPositionLayer = function (newLayerCells) {
	this.background.removeGridLayer(this._fightPositionLayer);
	this._fightPositionLayer = newLayerCells ? this.background.addGridAnimation(newLayerCells) : null;
};

IsoEngine.prototype._resetSpellRangeLayer = function (newLayerCells) {
	this.background.removeGridLayer(this._spellRangeLayer);
	this._spellRangeLayer = newLayerCells ? this.background.addGridAnimation(newLayerCells) : null;
};

IsoEngine.prototype._resetSpellEffectLayer = function (newLayerCells) {
	this.background.removeGridLayer(this._spellEffectLayer);
	this._spellEffectLayer = newLayerCells ? this.background.addGridAnimation(newLayerCells) : null;
};

IsoEngine.prototype._resetWalkLayer = function (newLayerCells) {
	this.background.removeGridLayer(this._walkLayer);
	this._walkLayer = newLayerCells ? this.background.addGridAnimation(newLayerCells) : null;
};

IsoEngine.prototype._resetWalkAreaLayer = function (newLayerCells) {
	this.background.removeGridLayer(this._walkAreaLayer);
	this._walkAreaLayer = newLayerCells ? this.background.addGridAnimation(newLayerCells) : null;
};

IsoEngine.prototype._resetEnemyWalkAreaLayer = function (newLayerCells) {
	this.background.removeGridLayer(this._enemyWalkAreaLayer);
	this._enemyWalkAreaLayer = newLayerCells ? this.background.addGridAnimation(newLayerCells) : null;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Clear user movement zone */
IsoEngine.prototype.clearUserMovementZone = IsoEngine.prototype._resetWalkAreaLayer;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set a spell range for display on map's floor
 *
 * @param {Object} spell - spell definition
 *
 * @param {boolean} spell.castInDiagonal
 * @param {boolean} spell.castInLine
 * @param {boolean} spell.castTestLos
 * @param {number}  spell.minRange
 * @param {number}  spell.range
 * @param {number}  spell.apCost
 * @param {boolean} spell.needFreeCell
 * @param {boolean} spell.needFreeTrapCell
 * @param {boolean} spell.needTakenCell
 * @param {boolean} spell.rangeCanBeBoosted
 */
IsoEngine.prototype.setCurrentSpell = function (spell) {
	currentSpell = spell;
};

/** Display the currently set spell */
IsoEngine.prototype.displaySpellRange = function () {
	if (!this.mapRenderer.map || !this.mapRenderer.map.cells || !currentSpell || this.actorManager.userActor.isDead) {
		return;
	}

	this.clearUserMovementZone();
	var cells = this.mapRenderer.map.cells;
	var actorCellId = this.actorManager.userActor.cellId;
	var rangeCoords = spellShapes.getSpellRange(cells, actorCellId, currentSpell);

	var visibleActors = window.actorManager.getIndexedVisibleActors();
	var cellInfos = {};
	var rangeById = {};
	var cellStateOut = window.foreground.fightIsUserTurn ? transformStates.outSight : transformStates.outSightEnemyTurn;
	var cellStateIn  = window.foreground.fightIsUserTurn ? transformStates.inSight  : transformStates.inSightEnemyTurn;
	for (var i = 0; i < rangeCoords.length; i++) {
		var cellId = mapPoint.getCellIdFromMapPoint(rangeCoords[i][0], rangeCoords[i][1]);
		if (cellId === undefined) { continue; }
		if (cellInfos[cellId]) { continue; }
		// test cell occupation
		if (currentSpell.needFreeCell && visibleActors[cellId]) {
			rangeById[cellId] = rangeCoords[i][2];
			cellInfos[cellId] =
				new CellInfo(
					cellId,
					rangeCoords[i][2],
					cellStateOut
				);
			continue;
		}
		// test map obstacles and holes
		var los = cells[cellId].l || 0;
		// Add this cell only if los bitflag is set as follow:
		// - bit 1 (isWalkable)             === 1
		// - bit 2 (lineOfSight)            === 1
		// - bit 3 (nonWalkableDuringFight) === 0
		if ((los & 7) === 3) {
			cellInfos[cellId] =
				new CellInfo(
					cellId,
					rangeCoords[i][2],
					cellStateIn
				);
			rangeById[cellId] = rangeCoords[i][2];
		}
	}

	if (currentSpell.castTestLos) {
		getCell(cells, cellInfos, actorCellId, visibleActors);
	}
	currentRange = cellInfos;

	this._resetSpellRangeLayer(cellInfos);

	// TODO: use a z-indexing system for layers? (i.e use an OrderedList instead of a DoublyList)
	// if there is a spell effect displayed, redraw it on top.  Right now this only happens when a click to cast spell
	// is active while changing turns.
	if (this._spellEffectLayer) {
		this._resetSpellEffectLayer(this._spellEffectLayer.cellInfos);
	}

	if (this._walkLayer) {
		this._resetWalkLayer();

		// We suppose that the confirmation box was open due to the walk layer being visible
		// hiding it
		window.foreground.confirmBox.hide();
	}
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method getCell
 * @desc   Get cells in line-of-sight from a source cell in a set of cells.
 *         Nota: algorithm is faster if range cells are ordered by distance from source, descending.
 *
 * @param {Object}     mapCells  - atouin cells data
 * @param {Object}     cellInfos - a map of cellIds to cellInfos
 * @param {number}     source    - reference position cellId, the source on line of sight
 * @param {Object}     indexedActors - map of cellId to visible flag
 */
function getCell(mapCells, cellInfos, source, indexedActors) {
	var sourcePosition = getMapPointFromCellId(source);

	var keys = Object.keys(cellInfos);
	for (var i = 0; i < keys.length; i++) {
		var targetCellId = keys[i];
		var targetPosition = getMapPointFromCellId(targetCellId);
		var line = dofus1Line.getLine(sourcePosition.x, sourcePosition.y, targetPosition.x, targetPosition.y);
		var obstructed = false;
		for (var j = 0, lenJ = line.length; j < lenJ; j++) {
			var lineCell = getCellIdFromMapPoint(line[j].x, line[j].y);
			var cell = mapCells[lineCell];
			if ((indexedActors[lineCell] && j < lenJ - 1) || ((cell.l & 2) !== 2)) { // length - 1 for actors !?
				obstructed = true;
				break;
			}
		}
		if (obstructed) {
			cellInfos[targetCellId].transformState =
				window.foreground.fightIsUserTurn ? transformStates.outSight : transformStates.outSightEnemyTurn;
		}
	}
	return cellInfos;
}
module.exports.getCell = getCell;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Display spell effect zone on top of current spell range.
 *
 * @param {number} target - targeted cell id
 */
IsoEngine.prototype.displayEffectZone = function (target) {
	this.background.removeTargetHighlights();
	if (!currentRange || !currentSpell) {
		return;
	}
	if (!(currentRange.hasOwnProperty(target))) {
		this._resetSpellEffectLayer();
		return;
	}
	if (currentRange[target].transformState === transformStates.outSight ||
		currentRange[target].transformState === transformStates.outSightEnemyTurn) {
		this._resetSpellEffectLayer();
		return;
	}
	if (!this.mapRenderer.map || !this.mapRenderer.map.cells) {
		return;
	}

	var cellId = this.actorManager.userActor.cellId;
	var cells = this.mapRenderer.map.cells;

	var effectZone = spellShapes.getSpellEffectZone(cells, cellId, target, currentSpell.zoneEffect);
	var actorCells = this.actorManager.occupiedCells;

	var effectCellIds = Object.keys(effectZone);
	for (var i = 0; i < effectCellIds.length; i++) {
		cellId = effectCellIds[i];
		if (actorCells[cellId]) {
			var actor = actorCells[cellId][0];
			var teamId = actor.getFighterData().teamId;
			if (teamId === 0) {
				this.background.addTargetHighLights(
					cellId,
					actorCells[cellId][0]._x,
					actorCells[cellId][0]._y,
					transformStates.redTeamStart,
					transformStates.redTeamEnd,
					!window.foreground.fightIsUserTurn
				);
			} else {
				this.background.addTargetHighLights(
					cellId,
					actorCells[cellId][0]._x,
					actorCells[cellId][0]._y,
					transformStates.blueTeamStart,
					transformStates.blueTeamEnd,
					!window.foreground.fightIsUserTurn
				);
			}
		}
	}

	this._resetSpellEffectLayer(effectZone);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Cast current selected spell on cell, if it is inside spell range
 *
 * @param {number}  cellId
 * @param {Object}  options - tap options
 *        {number}  options.spellId - selected spell id
 *        {boolean} options.characterId - controlled character id (slave)
 */
IsoEngine.prototype._castSpell = function (cellId, x, y, options) {
	// target cell may not be the tapped one
	var targetCellId = this.mapRenderer.grid.getNearbyCellInZone(cellId, x, y, currentRange);

	if (targetCellId === null) {
		window.foreground.deselectSpell();
		window.gui.shortcutBar.deselectIcon();
		this.clearSpellDisplay();
		return;
	}
	this.displayEffectZone(targetCellId);

	window.gui.emit('checkServerLag', 'fightAction', 'start');
	window.dofus.sendMessage('GameActionFightCastRequestMessage', {
		spellId: currentSpell.spellId,
		cellId: targetCellId
	});
	window.gui.fightManager.spellCastSucceeded(options.spellId, options.characterId);
	currentSpell = null;

	this.clearSpellDisplay();
	window.gui.shortcutBar.deselectIcon();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Cast current selected spell on cell, if it is inside spell range
 *
 * @param {number}  cellId
 * @param {Object}  options - tap options
 *        {number}  options.spellId - selected spell id
 *        {boolean} options.characterId - controlled character id (slave)
 */
IsoEngine.prototype._castSpellConfirm = function (cellId, x, y, options) {
	// target cell may not be the tapped one
	var targetCellId = this.mapRenderer.grid.getNearbyCellInZone(cellId, x, y, currentRange);

	if (targetCellId === null) {
		window.foreground.deselectSpell();
		window.gui.shortcutBar.deselectIcon();
		return;
	}
	this.displayEffectZone(targetCellId);

	var actionId = trueName(['spell', currentSpell.spellId, cellId, targetCellId]);

	var self = this;
	window.foreground.confirmBox.open('spell', currentSpell, function (valid) {
		if (!valid) {
			// erase spell range on grid
			self.clearSpellDisplay();
			window.gui.shortcutBar.deselectIcon();
			return;
		}
		window.gui.emit('checkServerLag', 'fightAction', 'start');
		window.dofus.sendMessage('GameActionFightCastRequestMessage', {
			spellId: currentSpell.spellId,
			cellId: targetCellId
		});
		window.gui.fightManager.spellCastSucceeded(options.spellId, options.characterId);
		currentSpell = null;

		self.clearSpellDisplay();
		window.gui.shortcutBar.deselectIcon();
	}, actionId, options.hideConfirmWindow);
};


IsoEngine.prototype._castSpellImmediately = function (cellId) {
	if (!currentRange || !currentSpell) { return; } // Hack: mouse events may call before exists.

	if (cellId === null) {
		window.foreground.deselectSpell();
		window.gui.shortcutBar.deselectIcon();
		return;
	}

	window.gui.emit('checkServerLag', 'fightAction', 'start');
	window.dofus.sendMessage('GameActionFightCastRequestMessage', {
		spellId: currentSpell.spellId,
		cellId: cellId
	});
	window.gui.fightManager.spellCastSucceeded(
		currentSpell.spellId,
		window.gui.playerData.characters.controlledCharacterId);

	this.clearSpellDisplay();
	currentSpell = null;
	window.gui.shortcutBar.deselectIcon();
};

IsoEngine.prototype._castSpellImmediatelyConfirm = function (cellId) {
	if (!currentRange || !currentSpell) { return; } // Hack: mouse events may call before exists.

	if (cellId === null) {
		window.foreground.deselectSpell();
		window.gui.shortcutBar.deselectIcon();
		return;
	}


	var actionId = trueName(['spell', currentSpell.spellId, cellId, cellId]);

	var self = this;
	window.foreground.confirmBox.open('spell', currentSpell, function (valid) {
		if (!valid) {
			// erase spell range on grid
			self.clearSpellDisplay();
			window.gui.shortcutBar.deselectIcon();
			return;
		}
		window.gui.emit('checkServerLag', 'fightAction', 'start');
		window.dofus.sendMessage('GameActionFightCastRequestMessage', {
			spellId: currentSpell.spellId,
			cellId: cellId
		});
		window.gui.fightManager.spellCastSucceeded(currentSpell.spellId,
			window.gui.playerData.characters.controlledCharacterId);
		currentSpell = null;

		self.clearSpellDisplay();
		window.gui.shortcutBar.deselectIcon();
	}, actionId, !window.foreground.fightIsUserTurn);
};

IsoEngine.prototype.displayFightPositions = function (msg) {
	var cellInfos = {};
	var distance = 0;

	for (var i = 0; i < msg.positionsForChallengers.length; i++) {
		var cellId = msg.positionsForChallengers[i];
		cellInfos[cellId] =
			new CellInfo(
				cellId,
				distance,
				transformStates.fullRed
			);
	}

	for (var j = 0; j < msg.positionsForDefenders.length; j++) {
		cellId = msg.positionsForDefenders[j];
		cellInfos[cellId] =
			new CellInfo(
				cellId,
				distance,
				transformStates.fullBlue
			);
	}

	this._resetFightPositionLayer(cellInfos);
};

IsoEngine.prototype.clearSpellDisplay = function () {
	this.background.removeTargetHighlights();
	this._resetSpellEffectLayer();
	this._resetSpellRangeLayer();
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/spell.js
 ** module id = 1054
 ** module chunks = 0
 **/