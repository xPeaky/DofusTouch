var CharacterBaseCharacteristic = require('CharacterBaseCharacteristic');

function SpellModificator() {
	this._type = 'SpellModificator';
	this.apCost = new CharacterBaseCharacteristic();
	this.castInterval = new CharacterBaseCharacteristic();
	this.castIntervalSet = new CharacterBaseCharacteristic();
	this.maxCastPerTurn = new CharacterBaseCharacteristic();
	this.maxCastPerTarget = new CharacterBaseCharacteristic();
}

module.exports = SpellModificator;

SpellModificator.prototype.getTotalBonus = function (characteristic) {
	if (!characteristic) {
		return 0;
	}
	return (characteristic.alignGiftBonus + characteristic.base + characteristic.contextModif +
		characteristic.objectsAndMountBonus);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SpellModificator/index.js
 ** module id = 281
 ** module chunks = 0
 **/