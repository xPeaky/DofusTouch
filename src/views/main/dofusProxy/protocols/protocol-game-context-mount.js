/**
 * @module protocol/contextMount
 */

var connectionManager = require('dofusProxy/connectionManager.js');


// MountEquipedErrorMessage
// Not handled. Flash does nothing except when msg.errorType == MountEquipedErrorEnum.RIDING (=2)
// (errors SET and UNSET are ignored)
// We receive this RIDING error for example when trying to ride a mount without having proper level,
// in which case there is also a TextInformationMessage from server with very clear explanation.
// => FINE TO IGNORE THIS MESSAGE for good.

// TODO: MountEmoteIconUsedOkMessage (msg.reactionType & msg.mountId)
// Flash client plays 5 possible animations when this message comes.
// Repro: equip a mount, ridemodify 0 10000 ? ? ? ? ?, put it in paddock, fart next to it
// => you receive: {_messageType: "MountEmoteIconUsedOkMessage", mountId: -2, reactionType: 1,...}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function addPaddockObject(item) {
	if (!item._bonesId) { return; }
	var actor = {
		contextualId: 'paddockItem:' + item.cellId,
		look: { bonesId: item._bonesId, scales: [100], skins: [] },
		disposition: { cellId: item.cellId, direction: 1 },
		name: item._nameId,
		durability: item.durability,
		_type: 'PaddockObject'
	};
	window.actorManager.addActor(actor);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @event module:protocol/characterChoice.client_GameDataPaddockObjectAddMessage
 * @desc  Add a array of items in paddock.
 * @param {Object} msg - msg
 *        {Object} msg.paddockItemDescription - item in paddock
 *        {number} msg.paddockItemDescription._bonesId   - (enriched) bone id to render item entity
 *        {number} msg.paddockItemDescription.cellId     - cell id where the item is placed
 *        {number} msg.paddockItemDescription.objectGID  - item id
 *        {Object} msg.paddockItemDescription.durability - durability informations
 *        {number} msg.paddockItemDescription.durability.durability    - item durability
 *        {number} msg.paddockItemDescription.durability.durabilityMax - item max durability
 */
connectionManager.on('GameDataPaddockObjectAddMessage', function (msg) {
	addPaddockObject(msg.paddockItemDescription);
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @event module:protocol/characterChoice.client_GameDataPaddockObjectListAddMessage
 * @desc  Add a array of items in paddock.
 * @param {Object}   msg - msg
 *        {Object[]} msg.paddockItemDescription - list of items in paddock
 *        {number}   msg.paddockItemDescription[]._bonesId   - (enriched) bone id to render item entity
 *        {number}   msg.paddockItemDescription[].cellId     - cell id where the item is placed
 *        {number}   msg.paddockItemDescription[].objectGID  - item id
 *        {Object}   msg.paddockItemDescription[].durability - durability informations
 *        {number}   msg.paddockItemDescription[].durability.durability    - item durability
 *        {number}   msg.paddockItemDescription[].durability.durabilityMax - item max durability
 */
connectionManager.on('GameDataPaddockObjectListAddMessage', function (msg) {
	var items = msg.paddockItemDescription;
	for (var i = 0; i < items.length; i++) {
		addPaddockObject(items[i]);
	}
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @event module:protocol/characterChoice.client_GameDataPaddockObjectRemoveMessage
 * @desc  Add a array of items in paddock.
 * @param {Object}   msg - msg
 *        {number}   msg.cellId - cell id where the item is placed
 */
connectionManager.on('GameDataPaddockObjectRemoveMessage', function (msg) {
	window.actorManager.removeActor('paddockItem:' + msg.cellId);
});





/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-mount.js
 ** module id = 101
 ** module chunks = 0
 **/