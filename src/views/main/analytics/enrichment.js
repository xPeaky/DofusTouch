/**
 * @exports analytics/enrichment
 */
var ITEM_POSITION = {
	0: 'amulet',
	1: 'weapon',
	2: 'ringLeft',
	3: 'belt',
	4: 'ringRight',
	5: 'boots',
	6: 'hat',
	7: 'cloack',
	8: 'pet',
	//16: 'dragodinde',
	//x: 'compagnon',
	15: 'shield'
};

/**
 * Add the player equipment information to the data
 * @param {Object} data - is the original data to send
 */
exports.addEquippedItem = function (data) {
	var playerItems = window.gui.playerData.inventory.equippedItems;
	for (var posId in ITEM_POSITION) {
		var itemInstance = playerItems[posId];
		var itemName = ITEM_POSITION[posId];
		if (!itemInstance) {
			data[itemName] = 'none';
			continue;
		}
		// we want the GID of all the items
		data[itemName] = itemInstance.getProperty('objectGID');
	}
	// for the mount with need the modelId
	var equippedMount = window.gui.playerData.equippedMount;
	data.mount = equippedMount && equippedMount.model || 'none';
};

/**
 * Add the character info to the data (breed, level, kama, goultine, mapId)
 * @param {Object} data - is the original data to send
 */
exports.addCharacterInfo = function (data) {
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	if (!window.gui.playerData) {
		return;
	}

	var playerData = window.gui.playerData;
	var characterBaseInfo = playerData.characterBaseInformations || {};
	var position = playerData.position || {};

	// character information

	data.server_id = window.gui.serversData.connectedServerId;
	data.character_id = playerData.id;
	data.character_level = characterBaseInfo.level;
	data.soft_currency_balance = playerData.inventory.kamas;
	data.hard_currency_balance = playerData.inventory.goultines;

	// map information

	data.map_id = position.mapId;
	//jscs:enable requireCamelCaseOrUpperCaseIdentifiers
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/analytics/enrichment.js
 ** module id = 176
 ** module chunks = 0
 **/