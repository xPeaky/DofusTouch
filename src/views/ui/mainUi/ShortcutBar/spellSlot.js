var barTypes = require('ShortcutBarEnum');
var dragManager = require('dragManager');
var inherits = require('util').inherits;
var SpellSlot = require('SpellSlot');
var SpellFactory = require('SpellFactory');

function ShortcutSpellSlot(options) {
	SpellSlot.call(this, options);

	this.type = barTypes.SPELL_SHORTCUT_BAR;
	this.index = 0;
	this.id = null;
	this.isDisabled = false;
	this.isEmpty = true;
	this.addClassNames('empty');

	this.on('selected', function (isSelected) {
		if (isSelected && this.id !== undefined) {
			window.gui.emit('spellSlotSelected', this.id);
		} else {
			window.gui.emit('spellSlotDeselected');
		}
	});

	this.on('unset', function () {
		this.isEmpty = true;
		this.id = null;
		this.isDisabled = false;
		dragManager.disableDrag(this);
		this.delClassNames('disabled');
		this.addClassNames('empty');
	});

	this.on('setData', function () {
		this.delClassNames('empty');
		this.isEmpty = false;
	});
}
inherits(ShortcutSpellSlot, SpellSlot);
module.exports = ShortcutSpellSlot;

ShortcutSpellSlot.getId = function (shortcut) {
	return parseInt(shortcut.spellId, 10);
};

ShortcutSpellSlot.prototype.setShortcut = function (shortcut) {
	var self = this;

	if (!shortcut) {
		if (!this.isEmpty) { this.unset(); }
		return;
	}

	var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
	var spell = controlledCharacter.spellData.spells[shortcut.spellId];

	this.shortcut = shortcut;

	this.id = ShortcutSpellSlot.getId(shortcut);

	if (!spell) {
		if (shortcut.spellId === SpellFactory.WEAPON_SPELL_ID) { // How could this happen?
			return console.error(new Error(
				'Controlled character does not have a weapon spell but a setShortcut on spellId ' +
				shortcut.spellId + ' has been requested'
			));
		}

		// spell is not created yet
		return window.gui.playerData.characters.mainCharacter.spellData.on('loaded', function () {
			return self.setShortcut(shortcut);
		});
	}

	this.setSpell(spell);
	this.setContextMenu('spell', {
		spell: spell,
		canRemove: true,
		onClose: function (action) {
			if (action !== 'remove') { return; }
			self.emit('removed');
		}
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/ShortcutBar/spellSlot.js
 ** module id = 571
 ** module chunks = 0
 **/