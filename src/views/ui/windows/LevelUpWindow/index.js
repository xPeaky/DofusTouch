require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var getText = require('getText').getText;
var SpellDescription = require('SpellDescription');
var addTooltip = require('TooltipBox').addTooltip;
var CharacterDisplay = require('CharacterDisplayWebGL');
var DirectionsEnum = require('DirectionsEnum');
var assetPreloading = require('assetPreloading');
var Delay = require('TINAlight').Delay;


function LevelUpWindow() {
	Window.call(this, {
		className: 'LevelUpWindow',
		positionInfo: { left: 'c', top: 'c', width: 500, height: 260 }
	});

	var self = this;

	this.once('open', function () {
		self._createDom();
	});

	this.on('open', function () {
		var look = window.gui.playerData.characterBaseInformations.entityLook;
		self._characterDisplay.setLook(look, {
			direction: DirectionsEnum.DIRECTION_SOUTH_EAST,
			animation: 'AnimStatique',
			boneType:  'characters/',
			skinType:  'characters/'
		});
	});

	this._setupEvents();
}

inherits(LevelUpWindow, Window);
module.exports = LevelUpWindow;


function sortSpellsByLevel(array) {
	array.sort(function (a, b) {
		var aLevel = a.getProperty('minPlayerLevel');
		var bLevel = b.getProperty('minPlayerLevel');

		if (aLevel < bLevel) {
			return -1;
		}

		if (aLevel > bLevel) {
			return 1;
		}
	});
}


LevelUpWindow.prototype._setupSpellData = function () {
	var spells = window.gui.playerData.characters.mainCharacter.spellData.spells;
	var playerLevel = window.gui.playerData.characterBaseInformations.level;
	this.spells = [];

	for (var i in spells) {
		if (playerLevel <= spells[i].getProperty('minPlayerLevel')) {
			this.spells.push(spells[i]);
		}
	}

	sortSpellsByLevel(this.spells);
};


LevelUpWindow.prototype._createDom = function () {
	this._characterDisplay = this.windowBody.appendChild(new CharacterDisplay({
		scale: 'fitin', horizontalAlign: 'center'
	}));

	var info = this.windowBody.createChild('div', { className: 'info' });

	var spellBlock = info.createChild('div', { className: 'spellBlock' });
	var pointBlock = info.createChild('div', { className: 'pointBlock' });

	this.spellText = spellBlock.createChild('div', { className: 'spellText' });
	this.spellIcon = spellBlock.createChild('div', { className: 'spellIcon' });
	this.spellDescription = new SpellDescription();
	addTooltip(this.spellIcon, this.spellDescription);

	var healthPoints = pointBlock.createChild('div', { className: ['healthPoints', 'points'] });
	var spellPoints = pointBlock.createChild('div', { className: ['spellPoints', 'points'] });
	var charaPoints = pointBlock.createChild('div', { className: ['charaPoints', 'points'] });

	healthPoints.createChild('div', { className: 'icon' });
	healthPoints.createChild('div', { className: 'text', text: getText('ui.levelUp.LifePoints') });
	this.health = healthPoints.createChild('div', { className: 'point' });

	spellPoints.createChild('div', { className: 'icon' });
	spellPoints.createChild('div', { className: 'text', text: getText('ui.levelUp.SpellPoints') });
	this.spell = spellPoints.createChild('div', { className: 'point' });

	charaPoints.createChild('div', { className: 'icon' });
	charaPoints.createChild('div', { className: 'text', text: getText('ui.levelUp.CaracPoints') });
	this.charac = charaPoints.createChild('div', { className: 'point' });
};


LevelUpWindow.prototype.updateSpellIcon = function (spellData) {
	var self = this;

	this.spellDescription.updateUI({ spell: spellData });

	assetPreloading.preloadImage('gfx/spells/sort_' + spellData.spell.iconId + '.png', function (url) {
		self.spellIcon.setStyle('backgroundImage', url);
	});
};


LevelUpWindow.prototype._setupEvents = function () {
	var self = this;
	var playerData = window.gui.playerData;

	playerData.on('characterLevelUp', function (params) {
		if (window.gui.tutorialManager.inTutorial) {
			return;
		}

		// Opening the window after a delay
		// Leaving some time for the level-up animation to play
		Delay(37, function () {
			self._levelUp(params.newLevel, params.previousLevel);
		}).start();
	});
};


LevelUpWindow.prototype._levelUp = function (newLevel, previousLevel) {
	windowsManager.open(this.id);

	this._setupSpellData();

	this.windowTitle.setText(getText('ui.levelUp.TitleLevel', newLevel));

	var spells = this.spells;

	for (var i = 0; i < spells.length; i++) {
		var spellData = spells[i];
		var level = spellData.getProperty('minPlayerLevel');

		if (newLevel === level) {
			this.updateSpellIcon(spellData);
			this.spellText.setText(getText('ui.levelUp.newSpell'));
			break;
		}

		if (newLevel < level) {
			this.updateSpellIcon(spellData);
			this.spellText.setText(getText('ui.levelUp.nextSpell') + ' ' + getText('ui.levelUp.nextSpellLevel', level));
			break;
		}
	}

	var levelDiff = newLevel - previousLevel;
	this.health.setText('+ ' + levelDiff * 5);
	this.spell.setText('+ ' + levelDiff);
	this.charac.setText('+ ' + levelDiff * 5);
	// this is also hardcoded in Dofus code
	// for each level, you gain 5 health points, 1 spell point and 5 charac points
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/LevelUpWindow/index.js
 ** module id = 786
 ** module chunks = 0
 **/