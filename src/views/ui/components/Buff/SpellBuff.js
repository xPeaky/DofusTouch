var BasicBuff                   = require('./BasicBuff.js');
var ActionIdConverter           = require('ActionIdConverter');
var getModifType                = require('./getModifType.js');
var inherits                    = require('util').inherits;
var CharacterSpellModification  = require('CharacterSpellModification');

function SpellBuff(effect, castingSpell, actionId, cb) {
	var self = this;
	BasicBuff.call(this, effect, castingSpell, actionId, effect.boostedSpellId, null, effect.delta,
		function (error, buff) {
		if (error) {
			return cb(error);
		}
		self.modifType = 0;
		self.spellId = effect.boostedSpellId;
		self._delta = effect.delta;
		return cb(null, buff);
	});
}
inherits(SpellBuff, BasicBuff);
module.exports = SpellBuff;

SpellBuff.prototype.getDelta = function () {
	return this._delta;
};

SpellBuff.prototype.apply = function () {
	if (this.targetId === window.gui.playerData.characters.controlledCharacterId) {
		this.modifType = getModifType(this.actionId);
		if (this.actionId === ActionIdConverter.ACTION_DEBOOST_SPELL_RANGE) {
			this._delta *= -1;
		}

		var spellModifExists = false;
		var spellModifs = window.gui.playerData.characters.mainCharacter.characteristics.spellModifications;
		for (var i = 0; i < spellModifs.length; i++) {
			var spellModif = spellModifs[i];
			if (this.spellId === spellModif.spellId && spellModif.modificationType === this.modifType) {
				spellModifExists = true;
				spellModif.value.contextModif += this._delta;
			}
		}

		if (!spellModifExists) {
			var modif = new CharacterSpellModification();
			modif.modificationType = this.modifType;
			modif.spellId = this.spellId;
			modif.value.contextModif = this._delta;
			spellModifs.push(modif);
		}

		// No need to refresh the spells: it's not working in Dofus flash client
		// TODO: we need to implement the spell damage preview tooltip instead
	}
	BasicBuff.prototype.apply.call(this);
};

SpellBuff.prototype.remove = function () {
	if (!this._removed) {
		if (this.targetId === window.gui.playerData.characters.controlledCharacterId) {
			var spellModifs = window.gui.playerData.characters.mainCharacter.characteristics.spellModifications;
			for (var i = 0; i < spellModifs.length; i++) {
				var spellModif = spellModifs[i];
				if (this.spellId === spellModif.spellId && spellModif.modificationType === this.modifType) {
					spellModifs[i].value.contextModif -= this._delta;
				}
			}

			// No need to refresh the spells: it's not working in Dofus flash client
			// TODO: we need to implement the spell damage preview tooltip instead
		}
	}
	BasicBuff.prototype.remove.call(this);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Buff/SpellBuff.js
 ** module id = 224
 ** module chunks = 0
 **/