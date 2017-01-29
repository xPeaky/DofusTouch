/**
 * @module protocol/contextRoleplayObjects
 */

var connectionManager = require('dofusProxy/connectionManager.js');
var assetPreloading = require('assetPreloading');
var constants = require('constants');

var ITEM_DIR = constants.ITEM_DIR;


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @event module:protocol/contextRoleplayObjects.client_ObjectGroundAddedMessage
 * @desc  An object is added on map ground
 *
 * @param {object} msg - msg
 * @param {number} msg.objectGID - object GID
 * @param {number} msg.cellId    - cell id
 * @param {number} msg._iconId   - (enriched) icon id to display item
 */
connectionManager.on('ObjectGroundAddedMessage', function (msg) {
	var object = { cellId: msg.cellId, objectGID: msg.objectGID };
	assetPreloading.loadImage(ITEM_DIR + msg._iconId + '.png', function (image) {
		object.img = image;
		window.isoEngine.addObjects([object]);
	});
});

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @event module:protocol/contextRoleplayObjects.client_ObjectGroundListAddedMessage
 * @desc  Several objects are added on map ground
 *
 * @param {object} msg - msg
 * @param {number[]} msg.referenceIds - array of object GID
 * @param {number[]} msg.cellId    - array of cell id
 * @param {number[]} msg._iconIds  - (enriched) icon ids to display items
 */
connectionManager.on('ObjectGroundListAddedMessage', function (msg) {
	var objects = [], assets = [];
	for (var i = 0, len = msg.cells.length; i < len; i++) {
		objects.push({ cellId: msg.cells[i], objectGID: msg.referenceIds[i] });
		assets.push(ITEM_DIR + msg._iconIds[i] + '.png');
	}
	assetPreloading.loadImages(assets, null, function (images) {
		for (var i = 0; i < images.length; i++) {
			objects[i].img = images[i];
		}
		window.isoEngine.addObjects(objects);
	});
});

/**
 * @event module:protocol/contextRoleplayObjects.client_ObjectGroundRemovedMessage
 * @desc  An object is removed from map ground
 * @param {object} msg - msg
 * @param {number} msg.cell - cell id
 */
connectionManager.on('ObjectGroundRemovedMessage', function (msg) {
	window.isoEngine.removeObjects([msg.cell]);
});

/**
 * @event module:protocol/contextRoleplayObjects.client_ObjectGroundRemovedMultipleMessage
 * @desc  Several objects are removed from map ground
 * @param {object} msg - msg
 * @param {number[]} msg.cells - cell ids
 */
connectionManager.on('ObjectGroundRemovedMultipleMessage', function (msg) {
	window.isoEngine.removeObjects(msg.cells);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-objects.js
 ** module id = 115
 ** module chunks = 0
 **/