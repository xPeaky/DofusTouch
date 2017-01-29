var constants = require('constants');
var animationManagerLoading = require('animationManagerLoading');
var AnimatedGfx = require('AnimatedGfx');

var PICTO_ROTATION_MAP = {
	up: 0,
	down: 180 /*deg*/ * Math.PI / 180
};

var PICTO_TYPE_MAP = {
	pingIcon: 'ping_Icon',
	mp: 'btn_DeplaceToi',
	warning: 'btn_Attention',
	stop: 'btn_Stop',
	attack: 'btn_Attaque',
	move: 'btn_Deplace',
	heal: 'btn_Soigne',
	boost: 'btn_Boost',
	tackle: 'btn_Entrave',
	valid: 'btn_Valide'
};

var pictos = {};

/**
 * @param {String} id
 * @param {object} position - position of the cell
 * @param {number} position.x
 * @param {number} position.y
 * @param {number} cellId
 * @param {String} type - come from the pictoBox className
 */
exports.addPingPicto = function (id, position, cellId, type) {
	if (!PICTO_TYPE_MAP[type]) {
		console.error('[IsoEngine.addPingPicto] No base for type', type);
		return;
	}

	var pictoBack = new AnimatedGfx({
		layer: constants.MAP_LAYER_ICONS,
		x: position.x,
		y: position.y,
		scene: window.isoEngine.mapScene
	});

	var pictoFront = new AnimatedGfx({
		layer: constants.MAP_LAYER_ICONS,
		x: position.x,
		y: position.y,
		scene: window.isoEngine.mapScene
	});

	animationManagerLoading.loadAnimationManager(pictoBack, 'embedded', 'ping', function (animationManager) {
		animationManager.assignSymbol({ base: PICTO_TYPE_MAP.pingIcon, direction: -1 }, /*loop =*/ false);
	});

	animationManagerLoading.loadAnimationManager(pictoFront, 'embedded', 'ping', function (animationManager) {
		animationManager.assignSymbol({ base: PICTO_TYPE_MAP[type], direction: -1 }, /*loop =*/ false);
	});

	pictos[id] = {
		back:  pictoBack,
		front: pictoFront
	};

	// reposition
	// bbox format is x1, x2, y1, y2

	var backSize = 60 + 10; // size of the center point to the border of ping_Icon + offset
	var offsetY = 0;

	// add the height of the actor, if there is one

	pictoBack.rotation = PICTO_ROTATION_MAP.up;

	var actors = window.isoEngine.actorManager.occupiedCells[cellId] || [];
	if (actors.length > 0) {
		var actorBbox = actors[0].bbox;

		offsetY = actorBbox ? actorBbox[2] - position.y : -100;
		offsetY -= backSize;
		if (position.y + offsetY < 0) {
			offsetY = actorBbox ? actorBbox[3] - position.y : 100;
			offsetY += backSize;
			pictoBack.rotation = PICTO_ROTATION_MAP.down;
		}
	} else {
		offsetY = -backSize;
		if (position.y + offsetY < 0) {
			offsetY = backSize;
			pictoBack.rotation = PICTO_ROTATION_MAP.down;
		}
	}

	pictoBack.y  = position.y + offsetY;
	pictoFront.y = position.y + offsetY;
	window.isoEngine.mapRenderer.addCellHighlight(id, [cellId], window.gui.pingSystem.PING_CELL_COLOR);
};

// TEST ALL THE PICTO IN THE MAP
// Run it on role play in the console
/*
var arr = ['mp', 'warning', 'stop', 'attack', 'move', 'heal', 'boost', 'tackle', 'valid', 'voluntaryError'];
var nbCells = 559 - 25;
var interval = Math.floor(nbCells / arr.length);

for (var i = 0; i < arr.length; i += 1) {
	var type = arr[i];
	var cellId = 25 + i * interval;
	console.info('add type', type, 'on cellId', cellId);
	isoEngine.mapRenderer.addPingPictoOnCell(type, cellId, type)
};
*/

/**
 * Remove a ping picto from the id
 * @param {String} id
 */
exports.removePingPicto = function (id) {
	window.isoEngine.mapRenderer.deleteCellHighlight(id);

	var picto = pictos[id];
	if (!picto) {
		console.warn('IsoEngine removePing: There no ping picto with the id', id);
		return;
	}
	if (picto.back) {
		picto.back.remove();
	}
	if (picto.front) {
		picto.front.remove();
	}
	delete pictos[id];
};

/**
 * Remove all ping picto
 */
exports.removeAllPingPictos = function () {
	for (var id in pictos) {
		if (pictos.hasOwnProperty(id)) {
			exports.removePingPicto(id);
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/MapRenderer/pingPicto.js
 ** module id = 1019
 ** module chunks = 0
 **/