var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

var keysText, splitCharacteristicKeyText;

function initGetText() {
	keysText = {
		CM: getText('ui.stats.shortMP'), //COMPAT215 use ui.stats.movementPoints
		CP: getText('ui.stats.shortAP'), //COMPAT215 use ui.stats.actionPoints
		CH: getText('ui.pvp.honourPoints'),
		CD: getText('ui.pvp.disgracePoints'),
		CT: getText('ui.stats.takleBlock'),
		Ct: getText('ui.stats.takleEvade')
	};
	splitCharacteristicKeyText = getText('ui.item.characteristics').split(',');
}

function replaceKeyByCharacteristic(source, searchFor, replaceWith) {
	var replaceLength = replaceWith.length;
	var copy = source;
	for (var i = 0, len = searchFor.length; i < len; i += 1) { // split + join = replace all occurrences
		copy = copy.split(searchFor[i]).join(replaceWith[i % replaceLength]);
	}
	return copy;
}

function createKeyText(key) {
	if (keysText[key]) {
		return keysText[key];
	} else {
		return replaceKeyByCharacteristic(key,
			['CS', 'Cs', 'CV', 'Cv', 'CA', 'Ca', 'CI', 'Ci', 'CW',
				'Cw', 'CC', 'Cc', 'CA', 'PG', 'PJ', 'Pj', 'PM', 'PA',
				'PN', 'PE', '<NO>', 'PS', 'PR', 'PL', 'PK', 'Pg', 'Pr',
				'Ps', 'Pa', 'PP', 'PZ', 'CM', 'Qa'],
			splitCharacteristicKeyText);
	}
}

function PlayerCharacteristicCriterion(criterionString) {
	Criterion.call(this, criterionString);

	if (!keysText) {
		initGetText();
	}

	this._keyText = createKeyText(this.key);
}
inherits(PlayerCharacteristicCriterion, Criterion);

PlayerCharacteristicCriterion.prototype.getKeyText = function () {
	return this._keyText;
};

// helper method to create a player base characteristic getter
function getPlayerBaseCharacteristic(characteristic) {
	return function (playerData) {
		return playerData[characteristic].base;
	};
}

// helper method to create a player total characteristic getter
function getPlayerTotalCharacteristic(characteristic) {
	return function (playerData) {
		var playerCharac = playerData[characteristic];
		return playerCharac.base + playerCharac.alignGiftBonus + playerCharac.contextModif +
			playerCharac.objectsAndMountBonus;
	};
}

// the criterion keys this class handle
var playerCharacteristics = {
	Ca: getPlayerBaseCharacteristic('agility'),
	CA: getPlayerTotalCharacteristic('agility'),
	Cc: getPlayerBaseCharacteristic('chance'),
	CC: getPlayerTotalCharacteristic('chance'),
	Ce: function (playerData) { return playerData.energyPoints; },
	CE: function (playerData) { return playerData.maxEnergyPoints; },
	CH: function (playerData) { return playerData.alignmentInfos.honor; },
	Ci: getPlayerBaseCharacteristic('intelligence'),
	CI: getPlayerTotalCharacteristic('intelligence'),
	CL: function (playerData) { return playerData.lifePoints; },
	CM: getPlayerTotalCharacteristic('movementPoints'),
	CP: getPlayerTotalCharacteristic('actionPoints'),
	Cs: getPlayerBaseCharacteristic('strength'),
	CS: getPlayerTotalCharacteristic('strength'),
	Cv: getPlayerBaseCharacteristic('vitality'),
	CV: getPlayerTotalCharacteristic('vitality'),
	Cw: getPlayerBaseCharacteristic('wisdom'),
	CW: getPlayerTotalCharacteristic('wisdom'),
	Ct: getPlayerTotalCharacteristic('tackleEvade'),
	CT: getPlayerTotalCharacteristic('tackleBlock')
};

PlayerCharacteristicCriterion.prototype.getCriterion = function () {
	var playerData = window.gui.playerData.characters.mainCharacter.characteristics;

	if (!playerCharacteristics[this.key]) {
		console.error('unknown criterion key: ' + this.key);
		return 0;
	}

	return parseInt(playerCharacteristics[this.key](playerData), 10);
};

module.exports = PlayerCharacteristicCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/PlayerCharacteristicCriterion.js
 ** module id = 369
 ** module chunks = 0
 **/