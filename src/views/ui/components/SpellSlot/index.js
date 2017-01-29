require('./styles.less');
var Slot = require('Slot');
var spellFactory = require('SpellFactory');
var SpellDescription = require('SpellDescription');
var inherits = require('util').inherits;
var assetPreloading = require('assetPreloading');


// class
function SpellSlot(options) {
	options = options || {}; // spellData
	Slot.call(this, options);
	this.addClassNames('SpellSlot');

	// init spell
	this.setSpell(options.spellData, options.descriptionOptions);
	// drag and drop hacks.
	this.customScale = null;
	this.customXOffset = null;
	this.customYOffset = null;
	this.customRotation = null;
}

inherits(SpellSlot, Slot);
module.exports = SpellSlot;

// public
SpellSlot.prototype.setSpell = function (spellData, descriptionOptions) {
	this.descriptionOptions = descriptionOptions || this.descriptionOptions;

	if (!spellData) {
		return this.unset();
	}

	// data
	var spellInstance = this.spellInstance = spellData._uid ? spellData : null;
	var dbSpell = this.dbSpell = spellInstance ? spellInstance.spell : spellData;

	var self = this;
	if (spellInstance && spellInstance.isItem) {
		var itemInstance = spellInstance._item;
		if (!itemInstance.isInitialised) {
			return itemInstance.once('initialised', function () {
				self.setSpell(spellData);
			});
		}
		this.setImage(itemInstance.item.image);
	} else {
		if (dbSpell.image) {
			this.setImage(dbSpell.image);
		} else {
			this.setImage(spellFactory.placeHolder);
			assetPreloading.preloadImage('gfx/spells/sort_' + dbSpell.iconId + '.png', function (url) {
				dbSpell.image = url;
				self.setImage(dbSpell.image);
			});
		}
	}

	this.setTooltip(this._getTooltipContent);

	this.setData(spellData);
};

SpellSlot.prototype._getTooltipContent = function () {
	return new SpellDescription({ spell: this.spellInstance || this.dbSpell }, this.descriptionOptions);
};

SpellSlot.prototype.setCooldown = function (cooldown) {
	this.quantityBox.setText(cooldown);
	this.quantityBox.toggleDisplay(cooldown > 0);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SpellSlot/index.js
 ** module id = 572
 ** module chunks = 0
 **/