var enums = require('./enums.js');

function getTypePositions(superTypeId) {
	return enums.itemTypePositions[superTypeId] || [];
}
module.exports.getTypePositions = getTypePositions;


function getCategoryName(category) {
	var categories = enums.categories;

	switch (category) {
	case categories.equipment:
		return 'equipment';
	case categories.consumables:
		return 'consumables';
	case categories.resources:
		return 'resources';
	case categories.quest:
		return 'quest';
	case categories.preset:
		return 'preset';
	default:
		return null;
	}
}
module.exports.getCategoryName = getCategoryName;

function getCategory(superTypeId) {
	var categories = enums.categories;

	if (enums.filterEquipment[superTypeId]) {
		return categories.equipment;
	}

	if (enums.filterConsumables[superTypeId]) {
		return categories.consumables;
	}

	if (enums.filterRessources[superTypeId]) {
		return categories.resources;
	}

	if (enums.filterQuest[superTypeId]) {
		return categories.quest;
	}

	return categories.preset; // TODO: confirm this should be fallback since 'other' is now 'preset'
}
module.exports.getCategory = getCategory;


function isEquippable(superTypeId) {
	return enums.superTypeNotEquippable.indexOf(superTypeId) === -1;
}
module.exports.isEquippable = isEquippable;


function isEquipped(itemPosition) {
	return itemPosition !== enums.positions.notEquipped;
}

function unlinkedItemsFilter(itemInstance) {
	// unlinked to character only (account link OK)
	return !itemInstance.isLinkedCharacter();
}

module.exports.isEquipped = isEquipped;
module.exports.unlinkedItemsFilter = unlinkedItemsFilter;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/itemManager/helpers.js
 ** module id = 324
 ** module chunks = 0
 **/