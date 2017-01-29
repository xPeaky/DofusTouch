var spellShapes             = require('spellShapes');
var atouin                  = require('atouin');
var colors                  = require('colorHelper');
var AnimatedGfx             = require('AnimatedGfx');
var Zone                    = require('Zone');
var animationManagerLoading = require('animationManagerLoading');

var FX = { base: 'FX', direction: 0 };

var marksByMarkId = {};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a mark on map
 * @private
 *
 * @param {Object}   mark - mark informations
 *
 * @param {number}   mark.markAuthorId - context id of character source of mark
 * @param {number}   mark.markSpellId  - spell id source of mark
 * @param {number}   mark.markId       - mark id
 * @param {number}   mark.markType     - type of object on ground { 1: GLYPH, 2: TRAP, 3: WALL }
 * @param {Object[]} mark.cells        - list of cells mark is composed of.
 * @param {number}   mark.cells[*].cellId    - center of mark
 * @param {number}   mark.cells[*].zoneSize  - zone size (disc shaped)
 * @param {number}   mark.cells[*].cellColor - cell color
 * @param {number}   mark.cells[*].cellsType - mark type { 0: CELLS_CIRCLE, 1: CELLS_CROSS }
 *
 */
function addMark(mark) {
	var background = window.background;
	var isoEngine = window.isoEngine;
	var map = isoEngine.mapRenderer.map;

	if (!map) {
		return isoEngine.once('mapLoaded', function () {
			addMark(mark);
		});
	}

	marksByMarkId[mark.markId] = mark;

	var glyph = mark._glyph;
	for (var i = 0, len = mark.cells.length; i < len; i++) {
		var area = mark.cells[i];
		var cellId = area.cellId;

		// mark color
		var color = colors.parseIndexedColor(area.cellColor).color;
		var stroke = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ', 0.6)';
		var fill   = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ', 0.3)';

		// mark zone
		var shape = area.cellsType === 0 ? spellShapes.getCircleArea : spellShapes.getCrossArea;
		var cells = shape(map.cells, cellId, area.zoneSize);
		var markData = { spellId: mark.markSpellId };
		var zone = new Zone(cells, { color: fill, outline: stroke, data: markData });

		if (glyph) {
			var coord = atouin.cellCoord[cellId];
			glyph.x = coord.x;
			glyph.y = coord.y;
			glyph.position = cellId - 0.1;

			glyph.animManager.assignSymbol(FX, false);
			zone.gfx = glyph;
		}

		// add zone
		background.addZone(zone, 'mark:' + mark.markId);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightMarkCellsMessage
 * @desc cells are marked - glyph / trap
 *
 * @param {Object}     msg          - GameActionFightMarkCellsMessage
 * @param {Function[]} animSequence - current animation sequence
 */
exports.addMark = function (msg, animSequence) {
	animSequence.push(function seqAddGlyph(cb) {
		addMark(msg.mark);
		return cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightUnmarkCellsMessage
 * @desc Removing marks - glyph / trap
 *
 * @param {Object} msg          - GameActionFightUnmarkCellsMessage
 * @param {number} msg.actionId - action id (and action text)
 * @param {number} msg.sourceId - source actor (human, monstres, etc.) id.
 * @param {number} msg.markId   - mark id
 */
exports.removeMark = function (msg, animSequence) {
	delete marksByMarkId[msg.markId];
	var background = window.background;
	animSequence.push(function seqRemoveGlyph(cb) {
		// remove all zones related to this mark
		background.deleteZoneById('mark:' + msg.markId, function (zone) {
			// play glyph trigger animation
			var glyph = zone.gfx;
			zone.gfx = null;
			if (!glyph) { return; }
			glyph.animManager.assignSymbol(FX, false, function () {
				// remove glyph once animation ends
				glyph.remove();
			});
		});
		return cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightTriggerGlyphTrapMessage
 * @desc Un joueur déclenche un glyphe ou un piège
 *
 * @param {number} msg.actionId - action id (and action text)
 * @param {number} msg.sourceId - source actor (human, monstres, etc.) id.
 *
 * @param {number} msg.markId                - Identifiant associé à l'objet déclenché
 * @param {number} msg.triggeringCharacterId - Identifiant dans le contexte du personnage déclencheant le piège/glyphe
 * @param {number} msg.triggeredSpellId      - Identifiant du sortilège déclenché (pas du niveau de sort)
 */
exports.triggerGlyphTrap = function (msg, animSequence) {
	animSequence.push(function seqRemoveGlyph(cb) {
		var zoneData = window.background.getDataOfZoneId('mark:' + msg.markId);
		if (!zoneData) {
			console.warn('No data found for zone: mark:' + msg.markId);
			return cb();
		}
		msg._spellId = zoneData.spellId;
		window.gui.transmitFightSequenceMessage(msg);
		return cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Resync Marks when user reconnect in fight after receiving a GameFightResumeMessage
 *
 * @param {Object[]} marks - array of marks
 *
 *        {number}   marks[*].markAuthorId - actor id
 *        {number}   marks[*].markId       - mark id
 *        {number}   marks[*].markSpellId  - spell id source of mark
 *        {number}   marks[*].markType     - type of object on ground { 1: GLYPH, 2: TRAP, 3: WALL }
 *        {Object[]} marks[*].cells        - list of cells mark is composed of.
 *        {number}   marks[*]._glyphGfxId  - (enriched) glyph gfx id
 *
 *        {number}   marks[*].cells[*].cellId    - center of mark
 *        {number}   marks[*].cells[*].zoneSize  - zone size (disc shaped)
 *        {number}   marks[*].cells[*].cellColor - cell color
 *        {number}   marks[*].cells[*].cellsType - mark type { 0: CELLS_CIRCLE, 1: CELLS_CROSS }
 */

function createMark(mark) {
	// Making sure the glyph has been created before adding it on the map
	if (mark._glyphGfxId && !mark._glyph) {
		mark._glyph = new AnimatedGfx({
			scene: window.isoEngine.mapScene
		});

		animationManagerLoading.loadAnimationManager(mark._glyph, 'bone', mark._glyphGfxId + '/FX', function () {
			addMark(mark);
		});

		return;
	}

	addMark(mark);
}

exports.syncMarks = function (marks) {
	for (var i = 0; i < marks.length; i++) {
		createMark(marks[i]);
	}
};

exports.getMarkedCells = function () {
	var cellIds = {};
	var keys = Object.keys(marksByMarkId);
	for (var i = 0; i < keys.length; i++) {
		var mark = marksByMarkId[keys[i]];
		for (var j = 0; j < mark.cells.length; j++) {
			cellIds[mark.cells[j].cellId] = true;
		}
	}
	return cellIds;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/fightSequence/mark.js
 ** module id = 1044
 ** module chunks = 0
 **/