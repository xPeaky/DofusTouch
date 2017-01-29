var CharacterBaseCharacteristic = require('CharacterBaseCharacteristic');

function CharacterSpellModification() {
	this._type = 'CharacterSpellModification';
	this.modificationType = 0;
	this.spellId = 0;
	this.value = new CharacterBaseCharacteristic();
}

module.exports = CharacterSpellModification;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/CharacterSpellModification/index.js
 ** module id = 227
 ** module chunks = 0
 **/