var EventEmitter = require('events.js').EventEmitter;
var inherits = require('util').inherits;
var PlayableCharacter = require('PlayableCharacter');

var MAX_SUMMONED_BOMB = 3;

function CharactersData() {
	EventEmitter.call(this);

	this.slaves = {};
	this.mainCharacter = new PlayableCharacter();

	this.controlledCharacterId = 0;
	this.mainCharacterId = 0;
}
inherits(CharactersData, EventEmitter);
module.exports = CharactersData;

CharactersData.prototype.disconnect = function () {
	this.clearSlaves();

	this.mainCharacter.disconnect();

	this.controlledCharacterId = 0;
	this.mainCharacterId = 0;

	this.stopRegen();
};

CharactersData.prototype.clearSlaves = function () {
	for (var id in this.slaves) {
		this.slaves[id].disconnect();
	}
	this.slaves = {};
};

CharactersData.prototype.assignMainCharacterInfos = function (characterInfos) {
	// retrieve and store the spells that the character is able to learn
	// (the server sends only the spells that the character actually knows)
	var breedData = window.gui.databases.Breeds[characterInfos.breed];
	window.gui.playerData.characterBreed = breedData;
	this.emit('setCharacterBreed');

	this.mainCharacterId = characterInfos.id;
	this.mainCharacter.setCharacterId(characterInfos.id);
};

CharactersData.prototype.switchControlledCharacter = function (id) {
	if (id === this.controlledCharacterId) {
		return;
	}

	this.controlledCharacterId = id;

	window.actorManager.switchUserActor(id);
	this.emit('switchControlledCharacter');

	var controlledCharacter = this.getControlledCharacter();
	if (controlledCharacter.characteristics) {
		controlledCharacter.emitCharacteristicsUpdate();
	}
};

CharactersData.prototype.canControlCharacterId = function (id) {
	return !!(id === this.mainCharacterId || this.slaves[id]);
};

CharactersData.prototype.getControlledCharacter = function () {
	return (this.controlledCharacterId === this.mainCharacterId) ?
		this.mainCharacter : this.slaves[this.controlledCharacterId];
};

CharactersData.prototype.isMainCharacterControlled = function () {
	return this.controlledCharacterId === this.mainCharacterId;
};

CharactersData.prototype.getCharacterById = function (id) {
	return (id === this.mainCharacterId) ? this.mainCharacter : this.slaves[id];
};

CharactersData.prototype.setCharacteristic = function (characteristicName, value) {
	var character = this.getControlledCharacter();
	character.setCharacteristic(characteristicName, value);
};

CharactersData.prototype.addSummonedCreature = function (id) {
	var character = id ? this.getCharacterById(id) : this.getControlledCharacter();
	character.currentSummonedCreature += 1;
};

CharactersData.prototype.removeSummonedCreature = function (id) {
	var character = id ? this.getCharacterById(id) : this.getControlledCharacter();
	if (character.currentSummonedCreature > 0) {
		character.currentSummonedCreature -= 1;
	}
};

CharactersData.prototype.canSummonCreature = function (id) {
	var character = id ? this.getCharacterById(id) : this.getControlledCharacter();
	return (character.getMaxSummonedCreature() > character.currentSummonedCreature);
};

CharactersData.prototype.addSummonedBomb = function (id) {
	var character = id ? this.getCharacterById(id) : this.getControlledCharacter();
	character.currentSummonedBomb += 1;
};

CharactersData.prototype.removeSummonedBomb = function (id) {
	var character = id ? this.getCharacterById(id) : this.getControlledCharacter();
	if (character.currentSummonedBomb > 0) {
		character.currentSummonedBomb -= 1;
	}
};

CharactersData.prototype.canSummonBomb = function (id) {
	var character = id ? this.getCharacterById(id) : this.getControlledCharacter();
	return (MAX_SUMMONED_BOMB > character.currentSummonedBomb);
};

function getSpellModifications(characterId, spellId, modifType) {
	if (!characterId) { return null; }
	var character = window.gui.playerData.characters.getCharacterById(characterId);
	if (!character) { return null; }
	var spellModifications = character.characteristics.spellModifications;
	if (!spellModifications) {
		return null;
	}
	for (var i = 0; i < spellModifications.length; i++) {
		var spellModif = spellModifications[i];
		if (spellModif.spellId === spellId && spellModif.modificationType === modifType) {
			return spellModif;
		}
	}
	return null;
}
CharactersData.prototype.getSpellModifications = getSpellModifications;

CharactersData.prototype.stopRegen = function () {
	window.clearInterval(this.regenTimer);
};

CharactersData.prototype.startRegen = function () {
	this.regenTimer = window.setInterval(this._autoRegenerateLife.bind(this), this.regenRate);
 };

// life point auto regen.
CharactersData.prototype._autoRegenerateLife = function () {
	if (!this.mainCharacter || !this.mainCharacter.characteristics) {
		this.stopRegen();
		return;
	}
	if (this.mainCharacter.characteristics.lifePoints >= this.mainCharacter.characteristics.maxLifePoints) {
		this.stopRegen();
	} else {
		this.mainCharacter.setCharacteristic('lifePoints', this.mainCharacter.characteristics.lifePoints + 1);
	}
};

CharactersData.prototype.initialize = function (gui) {
	var self = this;

	gui.on('CharacterSelectedSuccessMessage', function (msg) {
		var characterInfos = msg.infos;

		self.assignMainCharacterInfos(characterInfos);
		self.controlledCharacterId = characterInfos.id;
	});

	/** @event module:protocol/characterStats.client_CharacterStatsListMessage_PlayerData
	 *  @param {Object} msg - user character statistics */
	gui.on('CharacterStatsListMessage', function (msg) {
		if (self.mainCharacter.characteristics) {
			var energyPointsBefore = self.mainCharacter.characteristics.energyPoints;
			var energyPointsNow = msg.stats.energyPoints;
			if (energyPointsBefore > energyPointsNow) {
				gui.playerData.emit('playerIsDead');
			}
		}
		self.mainCharacter.setCharacteristics(msg.stats);
	});

	/** @event module:protocol/protocol/inventorySpells.client_SlaveSwitchContextMessage
	 *  @param {Object} msg - slave information */
	gui.on('SlaveSwitchContextMessage', function (msg) {
		var masterId = msg.summonerId;

		if (masterId === self.mainCharacterId) {
			var slaveId = msg.slaveId;
			var slave = self.slaves[slaveId];
			if (!slave) {
				slave = self.slaves[slaveId] = new PlayableCharacter();
				slave.setCharacterId(slaveId);
			}
			slave.spellData.once('loaded', function () {
				self.emit('spellList');
			});
			slave.spellData.addSpells(msg.slaveSpells);
			self.switchControlledCharacter(slaveId);
			slave.setCharacteristics(msg.slaveStats);
		}
	});

	/** @event module:protocol/characterStats.client_FighterStatsListMessage_PlayerData */
	gui.on('FighterStatsListMessage', function (msg) {
		var controlledCharacter = self.getControlledCharacter();

		controlledCharacter.setCharacteristics(msg.stats);
	});

	gui.on('LifePointsRegenBeginMessage', function (msg) {
		// convert regneRate (in 0.1s) to ms
		self.regenRate = msg.regenRate * 100;
		// start/restart life auto regeneration
		self.stopRegen();
		self.startRegen();
	});

	gui.on('LifePointsRegenEndMessage', function (msg) {
		self.stopRegen();
		self.mainCharacter.setCharacteristic('lifePoints', msg.lifePoints);
		self.mainCharacter.setCharacteristic('maxLifePoints', msg.maxLifePoints);
	});

	gui.on('SpellListMessage', function (msg) {
		var spellData = self.mainCharacter.spellData;
		spellData.once('loaded', function () {
			self.emit('spellList');
		});
		spellData.addSpells(msg.spells);

		var characterBreed = window.gui.playerData.characterBreed;
		if (characterBreed) {
			spellData.addSpellsFromId(characterBreed.breedSpellsId);
		} else {
			self.once('setCharacterBreed', function () {
				spellData.addSpellsFromId(window.gui.playerData.characterBreed.breedSpellsId, function () {
					self.mainCharacter.emit('spellsUpdate');
				});
			});
		}
	});

	gui.on('SpellUpgradeSuccessMessage', function (msg) {
		self.mainCharacter.spellData.upgradeSpell(msg.spellId, msg.spellLevel, function () {
			// new spell learned if spell level is 1
			if (msg.spellLevel === 1) {
				self.mainCharacter.emit('newSpellLearned', msg.spellId, msg.spellLevel);
			}
			self.mainCharacter.emit('spellUpgrade', msg.spellId, msg.spellLevel);
		});
	});

	gui.playerData.inventory.on('weaponChanged', function () {
		self.mainCharacter.spellData.weaponChanged(function () {
			self.mainCharacter.emit('weaponChanged');
		});
	});

	function updateAggressableStatus(status) {
		var playerAlignmentInfos = self.mainCharacter.characteristics.alignmentInfos;
		playerAlignmentInfos.aggressable = status;
		self.mainCharacter.setCharacteristic('alignmentInfos', playerAlignmentInfos);
	}

	gui.on('UpdateSelfAgressableStatusMessage', function (msg) {
		var status = msg.status;
		updateAggressableStatus(status);
		window.actorManager.updateActorsAggressableStatus([self.mainCharacterId], [status]);
	});

	gui.on('UpdateMapPlayersAgressableStatusMessage', function (msg) {
		var actorIds = msg.playerIds;
		var playerIdIndex = actorIds.indexOf(self.mainCharacterId);
		if (playerIdIndex === -1) {
			return;
		}
		updateAggressableStatus(msg.enable[playerIdIndex]);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/CharactersData.js
 ** module id = 520
 ** module chunks = 0
 **/