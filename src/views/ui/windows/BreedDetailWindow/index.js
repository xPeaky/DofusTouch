require('./styles.less');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Scroller = require('Scroller');
var showProgressively = require('helper').showProgressively;
var SpellDescription = require('SpellDescription');
var SpellFactory = require('SpellFactory');
var SpellSlot = require('SpellSlot');
var tooltip = require('TooltipBox');
var Window = require('Window');

// List of the 3 favorite spells (from Jonathan - 2016/04/29)
// Feca : Glyphe Enflammé / Bouclier Féca / Attaque Naturelle
// Osamodas : Invocation de Tofu / Invocation de Dragonnet Rouge / Piqûre Motivante
// Enutrof : Coffre Animé / Pelle Massacrante / Maladresse
// Sram : Invisibilité / Piège Mortel / Peur
// Xelor : Téléportation / Ralentissement / Horloge
// Ecaflip : Bond du Félin / Roulette / Bluff
// Eniripsa : Mot Stimulant / Mot Revitalisant / Mot de Reconstitution
// Iop : Bond / Colère de Iop / Puissance
// Crâ : Flèche Explosive / Œil de Taupe / Flèche Cinglante
// Sadida : Ronces Multiples / La Gonflable / Arbre
// Sacrieur : Attirance / Punition / Châtiment Forcé
// Pandawa : Picole / Lien Spiritueux / Chamrak
// Roublard : Détonateur / Pulsar / Dernier Souffle
// Zobal : Plastron / Mascarade / Masque de Classe
// Steamer : Harponneuse / Foène / Embuscade
var FAV_SPELLS = [
	[], // this 1st empty one for race #0 which does not exist
	[10, 7, 3],         // Feca
	[34, 31, 27],       // Osamodas
	[60, 58, 50],       // Enutrof
	[72, 80, 67],       // Sram
	[88, 81, 95],       // Xélor
	[105, 101, 109],    // Ecaflip
	[126, 130, 140],    // Eniripsa
	[142, 159, 153],    // Iop
	[179, 168, 174],    // Cra
	[191, 190, 186],    // Sadida
	[434, 446, 431],    // Sacrieur
	[686, 705, 696],    // Pandawa
	[2778, 2806, 2810], // Roublard
	[2890, 2897, 2872], // Zobal
	[3212, 3211, 3218]  // Steamer
];

var SPELL_INFO_ALL = {
	spellTooltipAll: true
};

var SPELL_INFO_SHORT = {
	visibilityOptions: {
		spellTooltipName: true,
		spellTooltipDescription: true
	}
};


function BreedDetailWindow() {
	Window.call(this, {
		title: getText('ui.charcrea.more'),
		className: 'BreedDetailWindow',
		positionInfo: {
			left: 'c', top: 'c', width: 912, height: '90%', maxHeight: 683,
			isModal: true, isFullScreen: true
		}
	});

	this.loadedSpells = {};
	this.favSpells = [];

	this.on('open', this._initialize);
}
inherits(BreedDetailWindow, Window);
module.exports = BreedDetailWindow;


/**
 * Called when window is closed or hidden
 */
BreedDetailWindow.prototype.freeContent = function () {
	this.windowBody.clearContent();

	this.loadedSpells = {};
	this.favSpells = [];
};

BreedDetailWindow.prototype._initialize = function (params) {
	this.breedData = params.breedData;

	this._createContent(this.windowBody);

	this._updateBreedDescription();
	this._updateSpells();
};

BreedDetailWindow.prototype._createContent = function (parent) {
	var scroller = this.scroller = parent.appendChild(new Scroller({}, { showHintArrows: true }));
	var content = scroller.content;

	// breed description (name & story)
	this.breedDescription = content.createChild('div', { className: 'breedDescription', hidden: true });
	var zone = this.breedDescription.createChild('div', { className: 'descriptionZone' });
	var text = zone.createChild('div', { className: 'descriptionText' });
	this.breedName = text.createChild('div', { className: 'breedName', text: '.' });
	this.breedName.setText('');
	this.breedStory = text.createChild('div', { className: 'breedStory' });

	// favorite spells
	var container = this.favoriteSpells = content.createChild('div', { className: 'favSpells', hidden: true });
	container.createChild('div', { className: 'title', text: getText('tablet.charCrea.popularSpells') });
	var breedFavSpells = FAV_SPELLS[this.breedData.id] || [];
	for (var i = 0; i < breedFavSpells.length; i++) {
		var spellDiv = this.favSpells[i] = container.createChild('div', { className: 'spell', hidden: true });
		spellDiv.spellId = breedFavSpells[i];
	}

	// all spells
	var spells = this.allSpells = content.createChild('div', { className: 'spells', hidden: true });
	spells.createChild('div', { className: 'title', text: getText('tablet.charCrea.allSpells') });
	this.spellsContainer = spells.createChild('div', { className: 'spellsContainer' });
};

BreedDetailWindow.prototype._appearWhenReady = function () {
	showProgressively(this.breedDescription);
	showProgressively(this.favoriteSpells);
	showProgressively(this.allSpells);

	this.scroller.refresh();
	this.scroller.notify();
};

BreedDetailWindow.prototype._updateBreedDescription = function () {
	var breedData = this.breedData;

	this.breedName.setText(breedData.longNameId);

	this.breedStory.setText(breedData.descriptionId);
};

BreedDetailWindow.prototype._updateSpells = function () {
	this.windowBody.addClassNames('spinner');

	var breedId = this.breedId;
	var spellIds = this.breedData.breedSpellsId;
	var self = this;
	this._loadSpellsData(spellIds, function (error) {
		if (error) { return console.error(error); }

		if (self.openState && self.breedId === breedId) {
			self._updateSpellSlots(spellIds);
		}
	});
};

BreedDetailWindow.prototype._loadSpellsData = function (spells, callback) {
	// request only the spells not loaded yet
	var notLoaded = [];
	var loadedSpells = this.loadedSpells;
	for (var i = 0; i < spells.length; i += 1) {
		if (!loadedSpells[spells[i]]) {
			notLoaded.push(spells[i]);
		}
	}
	if (!notLoaded.length) {
		return callback();
	}

	SpellFactory.createSpells(notLoaded, function (error, spellList) {
		if (error) { return callback(error); }

		spellList = SpellFactory.sortSpells(spellList, 'minPlayerLevel');

		for (var i = 0; i < spellList.length; i += 1) {
			var spell = spellList[i];
			loadedSpells[spell.id] = spell;
		}

		callback();
	});
};

function spellSlotTapped() {
	// "this" is the tapped slot
	tooltip.showNotification(getText('tablet.common.longTapForTooltip'), this);
}

BreedDetailWindow.prototype._updateSpellSlots = function (spellIds) {
	var spell;
	for (var i = 0; i < spellIds.length; i += 1) {
		var spellSlot = this.spellsContainer.appendChild(new SpellSlot());
		spell = this.loadedSpells[spellIds[i]];
		spellSlot.setSpell(spell, SPELL_INFO_ALL);
		spellSlot.toggleDisplay(!!spell);
		spellSlot.on('tap', spellSlotTapped);
	}
	this.windowBody.delClassNames('spinner');

	for (i = 0; i < this.favSpells.length; i++) {
		var spellDiv = this.favSpells[i];
		spell = this.loadedSpells[spellDiv.spellId];
		if (!spell) { continue; }
		spellDiv.slot = spellDiv.appendChild(new SpellSlot());
		spellDiv.slot.setSpell(spell, SPELL_INFO_ALL);
		spellDiv.slot.on('tap', spellSlotTapped);
		spellDiv.appendChild(new SpellDescription({ spell: spell }, SPELL_INFO_SHORT));
		spellDiv.show();
	}

	this._appearWhenReady();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BreedDetailWindow/index.js
 ** module id = 649
 ** module chunks = 0
 **/