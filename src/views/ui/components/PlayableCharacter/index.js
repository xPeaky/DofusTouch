var EventEmitter = require('events.js').EventEmitter;
var inherits = require('util').inherits;
var SpellData = require('./SpellData.js');

var emitsCharacteristicEvent = {
	actionPointsCurrent: true,
	alignmentInfos: true,
	lifePoints: true,
	maxLifePoints: true,
	movementPointsCurrent: true,
	spellsPoints: true
};

function PlayableCharacter() {
	EventEmitter.call(this);

	this.characteristics = null;
	this.spellShortcuts = null;
	this.spellData = new SpellData();

	this.currentSummonedCreature = 0;
	this.currentSummonedBomb = 0;

	this.timeStatsSynchronized = 0;
}
inherits(PlayableCharacter, EventEmitter);
module.exports = PlayableCharacter;

PlayableCharacter.prototype.disconnect = function () {
	this.characteristics = null;
	this.spellShortcuts = null;
	this.spellData.disconnect();

	this.currentSummonedCreature = 0;
	this.currentSummonedBomb = 0;
};

PlayableCharacter.prototype.setCharacteristics = function (characteristics) {
	this.characteristics = characteristics;

	var isControlledCharacter = window.gui.playerData.characters.getControlledCharacter() === this;
	if (isControlledCharacter) {
		this.emitCharacteristicsUpdate();
	}
	this.timeStatsSynchronized = Date.now();
};

PlayableCharacter.prototype.emitCharacteristicsUpdate = function () {
	var playerData = window.gui.playerData;
	for (var characteristicName in emitsCharacteristicEvent) {
		// TODO: Remove error checking
		if (this.characteristics[characteristicName] === undefined) {
			console.error('No characteristic named: ' + characteristicName);
			continue;
		}
		playerData.emit(characteristicName + 'Updated', this.characteristics[characteristicName]);
	}
};

PlayableCharacter.prototype.setCharacteristic = function (characteristicName, points) {
	// TODO: Remove error checking
	if (this.characteristics[characteristicName] === undefined) {
		console.error('No characteristic named: ' + characteristicName);
		return;
	}

	this.characteristics[characteristicName] = points;
	var isControlledCharacter = window.gui.playerData.characters.getControlledCharacter() === this;
	if (isControlledCharacter && emitsCharacteristicEvent[characteristicName]) {
		window.gui.playerData.emit(characteristicName + 'Updated', points);
	}
};

PlayableCharacter.prototype.setCharacterId = function (id) {
	this.spellData.characterId = id;
};

PlayableCharacter.prototype.getMaxSummonedCreature = function () {
	return this.characteristics.summonableCreaturesBoost.base +
	this.characteristics.summonableCreaturesBoost.objectsAndMountBonus +
	this.characteristics.summonableCreaturesBoost.alignGiftBonus +
	this.characteristics.summonableCreaturesBoost.contextModif;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayableCharacter/index.js
 ** module id = 521
 ** module chunks = 0
 **/