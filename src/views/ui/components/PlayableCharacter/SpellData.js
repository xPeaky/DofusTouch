var EventEmitter = require('events.js').EventEmitter;
var inherits = require('util').inherits;
var SpellFactory = require('SpellFactory');
var analytics = require('analytics');

function SpellData() {
	EventEmitter.call(this);

	this.requestsPendingCount = 0;
	this.spells = {};
	this.characterId = null;
	this.isLoaded = false;
	this._learnedSpellList = [];
}

inherits(SpellData, EventEmitter);
module.exports = SpellData;

SpellData.prototype.disconnect = function () {
	this.isLoaded = false;
	this.spells = {};
	this.characterId = null;
	this.requestsPendingCount = 0;
	this._learnedSpellList = [];
};

SpellData.prototype.weaponChanged = function (cb) {
	if (!this.spells[SpellFactory.WEAPON_SPELL_ID]) {
		// the weapon spell have not been created yet, we don't need to update it:
		// it will be created directly with the right information
		return;
	}
	this.spells[SpellFactory.WEAPON_SPELL_ID].update(cb);
};

SpellData.prototype._createSpells = function (spellIds, params, cb) {
	var self = this;
	params = params || {};
	this.requestsPendingCount++;
	this.isLoaded = false;
	SpellFactory.createSpells(spellIds, function (error, spells) {
		if (error) { return console.error(error); }

		for (var spellId in spells) {
			spells[spellId].ownerId = self.characterId;
			self.spells[spellId] = spells[spellId];
			var spellParams = params[spellId];
			if (spellParams) {
				if (spellParams.level !== undefined) {
					spells[spellId].setLevel(spellParams.level);
				}
				if (spellParams.position !== undefined) {
					spells[spellId].setPosition(spellParams.position);
				}
			}
		}

		self.requestsPendingCount--;
		if (self.requestsPendingCount === 0) {
			self.isLoaded = true;
			self.emit('loaded');
		}

		if (cb) { cb(); }
	});
};

SpellData.prototype.addSpellsFromId = function (spellIds, cb) {
	var unknownSpells = [];

	for (var i = 0, len = spellIds.length; i < len; i++) {
		var spellId = spellIds[i];
		if (!this.spells[spellId] && this._learnedSpellList.indexOf(spellId) < 0) {
			unknownSpells.push(spellId);
		}
	}

	if (!unknownSpells.length) { return cb && cb(); }
	this._createSpells(unknownSpells, null, cb);
};

SpellData.prototype.addSpells = function (spells, cb) {
	var newLearnedSpells = {};

	var spellsIds = [];
	for (var i = 0, len = spells.length; i < len; i++) {
		var spell = spells[i];
		var spellId = spell.spellId;
		spellsIds.push(spellId);

		if (!this.spells[spellId]) {
			// if we don't know this spell yet we push it in the list of spells to retrieve
			newLearnedSpells[spellId] = {
				level: spell.spellLevel,
				position: spell.position
			};
			this._learnedSpellList.push(spellId);
		} else {
			// we already have this spell so we are just updating it
			this.spells[spellId].setLevel(spell.spellLevel);
			this.spells[spellId].setPosition(spell.position);
		}
	}

	var newLearnedSpellIds = Object.keys(newLearnedSpells);
	if (newLearnedSpellIds.length > 0) {
		this._createSpells(newLearnedSpellIds, newLearnedSpells, cb);
	} else if (cb) {
		cb();
	}
};

SpellData.prototype.upgradeSpell = function (spellId, spellLevel, cb) {
	var oldSpellLevel = -1;
	var spell = this.spells[spellId];

	// spell already known
	if (spell) {
		oldSpellLevel = spell.level;
		spell.setLevel(spellLevel);
		if (cb) { cb(); }
	} else {
		// new spell learned
		var params = {};
		params[spellId] = {};
		params[spellId].level = spellLevel;
		this._createSpells([spellId], params, cb);
	}
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	analytics.log('character_progression.spell_level_change', {
		spell_level_before: oldSpellLevel,
		spell_level_after: spellLevel,
		spell_id: spellId
	});
	//jscs:enable requireCamelCaseOrUpperCaseIdentifiers
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method getSpellBySpellLevelId
 * @desc   Only checks for the current spellLevel id of each spells
 *
 * @param  {Number} spellLevelId  - spell level id
 */
SpellData.prototype.getSpellBySpellLevelId = function (spellLevelId) {
	for (var spellId in this.spells) {
		var spell = this.spells[spellId];
		if (!spell.isItem && spell.spellLevel.id === spellLevelId) {
			return spell;
		}
	}
	return null;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayableCharacter/SpellData.js
 ** module id = 522
 ** module chunks = 0
 **/