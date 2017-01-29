var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function SpellItemCriterion(data) {
	Criterion.call(this, data);

	var params = this.rawValue.split(',');
	if (params.length > 1) {
		console.error(new Error('SpellItemCriterion: too much parameters: ' + params));
	} else {
		this._spellId = this.value;
	}
}
inherits(SpellItemCriterion, Criterion);

SpellItemCriterion.prototype.getText = function () {
	var spell = window.gui.playerData.characters.mainCharacter.spellData.spells[this._spellId];
	if (!spell) {
		return '';
	}

	switch (this.operator) {
	case Criterion.operators.equal:
		return getText('ui.criterion.gotSpell', [spell.nameId]);
	case Criterion.operators.different:
		return getText('ui.criterion.doesntGotSpell', [spell.nameId]);
	default :
		return '';
	}
};

SpellItemCriterion.prototype.isRespected = function () {
	var hasSpell = window.gui.playerData.characters.mainCharacter.spellData.spells.hasOwnProperty(this._spellId);
	return (hasSpell && this.operator === Criterion.operators.equal) ||
		(!hasSpell && this.operator === Criterion.operators.different);
};

module.exports = SpellItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/SpellItemCriterion.js
 ** module id = 379
 ** module chunks = 0
 **/