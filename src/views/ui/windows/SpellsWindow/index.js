require('./styles.less');
var inherits = require('util').inherits;
var tapBehavior = require('tapBehavior');
var getText = require('getText').getText;
var Button = require('Button').DofusButton;
var Table = require('TableV2');
var Selector = require('Selector');
var WuiDom = require('wuidom');
var SpellDescription = require('SpellDescription');
var dragManager = require('dragManager');
var SpellFactory = require('SpellFactory');
var assetPreloading = require('assetPreloading');
var playUiSound = require('audioManager').playUiSound;

// original code reference file: modules/Ankama_Grimoire/src/ui/SpellTab.as

function defaultCompare(spellA, spellB) {
	if (spellA.isItem) { return -1; }
	if (spellB.isItem) { return 1; }

	var aLevel = spellA.getProperty('minPlayerLevel', 1);
	var bLevel = spellB.getProperty('minPlayerLevel', 1);

	if (aLevel < bLevel) { return -1; }
	if (aLevel > bLevel) { return 1; }
	if (spellA.id > spellB.id) { return 1; }
	if (spellA.id < spellB.id) { return -1; }

	return 0;
}

function compareSpellByLevel(spellA, spellB) {
	if (spellA.isItem) { return -1; }
	if (spellB.isItem) { return 1; }

	if (spellA.level > spellB.level) { return 1; }
	if (spellA.level < spellB.level) { return -1; }
	if (spellA.id > spellB.id) { return 1; }
	if (spellA.id < spellB.id) { return -1; }

	return 0;
}

/** Checks if current character can use a spell
 *  @param {object} spell - spell object
 *  @param {number} [level] - spell level; optional, if not given the current spell level (usually 1) is used
 *  @return true if current character can use the spell given */
function canUseSpell(spell, level) {
	if (spell.id === SpellFactory.WEAPON_SPELL_ID) { return true; } // always usable
	if (level === undefined) { level = spell.level; }
	return spell.getProperty('minPlayerLevel', level) <= window.gui.playerData.characterBaseInformations.level;
}


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class SpellsWindow
 * @desc  window for displaying and managing spells
 */
function SpellsWindow() {
	WuiDom.call(this, 'div', { className: 'SpellsWindow', name: 'spells' });

	this.mustRefreshAll = true;
	this.characterIdOnOpen = 0;

	this.once('open', function () {
		this._createDom();
		this._setupEvents();
	});

	var gui = window.gui;
	this.on('open', function () {
		var controlledCharacterId = gui.playerData.characters.controlledCharacterId;
		if (this.characterIdOnOpen !== controlledCharacterId) {
			this.characterIdOnOpen = controlledCharacterId;
			this.updateRemainingPoints();
			this.mustRefreshAll = true;
		}
		if (this.mustRefreshAll) {
			this._refreshAllContent();
		} else {
			this.table.sort(defaultCompare);
			this.table.selectFirstRow();
		}

		gui.shortcutBar.openPanel('spell');
	});

	this.on('focus', function () {
		gui.shortcutBar.openPanel('spell');
	});
}

inherits(SpellsWindow, WuiDom);
module.exports = SpellsWindow;

SpellsWindow.prototype._createDom = function () {
	var self = this;

	var col1 = this.createChild('div', { className: 'col1' });
	this.col2 = this.createChild('div', { className: 'col2' });

	this.selector = col1.appendChild(new Selector());

	function createSpellIcon(spell) {
		var icon = new WuiDom('div', { className: 'icon' });
		var iconUrl = spell.getIconUrl();
		if (iconUrl) {
			icon.setStyle('backgroundImage', iconUrl);
		}
		return icon;
	}

	function createSpellUpgradeCell(spell) {
		var button = new Button('', { name: 'addButton' });
		button.spell = spell;

		button.on('tap', function () {
			var boundingRect = this.rootElement.getBoundingClientRect();
			window.gui.openContextualMenu(
				'spellUpgrade',
				{
					spell: this.spell,
					remainingPoints: self.remainingPoints
				}, {
					x: boundingRect.left + boundingRect.width,
					y: boundingRect.top
				}
			);
			playUiSound('PLUS_BUTTON');
		});

		self._refreshAddButtonState(button);
		return button;
	}

	this.table = col1.appendChild(new Table([
			{ id: 'icon', format: createSpellIcon, sort: defaultCompare },
			{
				id: 'name',
				header: getText('ui.common.spellName'),
				getContent: function (spell) { return spell.getName(); },
				sort: true
			},
			{
				id: 'rank',
				header: getText('ui.common.level'), // Flash uses 'ui.social.guildRank' here, which is a bug
				format: function (spell) {
					return (spell.isItem || spell.id === SpellFactory.WEAPON_SPELL_ID) ? '-' : spell.level;
				},
				sort: compareSpellByLevel
			},
			{ id: 'add', format: createSpellUpgradeCell }
		],
		'id'
	));

	this.table.on('rowTap', function (row, spell) {
		self.displaySpell({ spell: spell, imageUri: row.icon.content.getStyle('backgroundImage') });
		playUiSound('GEN_BUTTON');
	});

	var noFilter = true;
	var filter;

	this.table.addFilter(function (spell) {
		return noFilter || spell.getProperty('typeId') === filter;
	});

	this.selector.on('change', function (value) {
		noFilter = false;

		if (value === '-') {
			noFilter = true;
		} else {
			filter = parseInt(value, 10);
		}

		self.table.filter();
	});

	var pointsBox = col1.createChild('div', { className: 'pointsBox' });
	pointsBox.createChild('div', { text: getText('ui.grimoire.spellCapital'), className: 'label' });
	this.remainingPointsBox = pointsBox.createChild('div', { className: 'remainingPoints' });
};


SpellsWindow.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;

	gui.on('SpellUpgradeFailureMessage', function () {
		window.gui.openPopup({
			title: getText('ui.common.error'),
			message: getText('ui.grimoire.popup.upgradeSpellFailMessage')
		});
	});

	gui.on('CharacterLevelUpMessage', function () {
		if (self.characterIdOnOpen !== gui.playerData.characters.mainCharacterId) {
			return;
		}
		self.enableSpellsOnLevelUp();
	});

	gui.on('disconnect', function () {
		self.mustRefreshAll = true;
	});

	gui.playerData.characters.mainCharacter.on('weaponChanged', function () {
		if (self.characterIdOnOpen !== gui.playerData.characters.mainCharacterId) {
			return;
		}
		self.updateWeaponSpell();
	});

	var characters = gui.playerData.characters;

	characters.mainCharacter.on('spellUpgrade', function (spellId, spellLevel) {
		if (self.characterIdOnOpen !== gui.playerData.characters.mainCharacterId) {
			return;
		}

		if (!self.table.getRow(spellId)) {
			return console.error(new Error('spell ' + spellId + ' does not exist in spell window'));
		}

		self._updateDisplayedSpellLevel(spellId, spellLevel);
	});

	characters.mainCharacter.on('newSpellLearned', function (spellId) {
		if (self.characterIdOnOpen !== gui.playerData.characters.mainCharacterId) {
			return;
		}

		// this spell already exists in the window
		if (self.table.getRow(spellId)) {
			return;
		}

		var spell = window.gui.playerData.characters.mainCharacter.spellData.spells[spellId];

		if (!spell) {
			return console.error(new Error('spell ' + spellId + ' is not loaded'));
		}

		var map = {};
		map[spell.id] = spell;
		self.table.addMap(map);

		// icon was already loaded
		if (spell.getIconUrl()) {
			return;
		}

		// load the icon
		assetPreloading.preloadImage(spell.getIconUri(), function (url) {
			spell.spell.image = url;
			var icon = self.table.getCell(spell.id, 'icon');
			icon.setStyle('backgroundImage', url);
			if (self.currentSpellId === spell.id) {
				self.displaySpell({ spell: spell, imageUri: url });
			}
			self.refreshAllSpellState();
		});
	});

	gui.playerData.on('spellsPointsUpdated', function () {
		if (self.characterIdOnOpen !== this.characters.controlledCharacterId) {
			return;
		}
		self.updateRemainingPoints();
		self._refreshAllAddButtonState();
	});

	characters.on('spellList', function () {
		if (self.characterIdOnOpen !== this.controlledCharacterId) {
			return;
		}
		self._askForRefresh();
	});

	characters.on('switchControlledCharacter', function () {
		if (self.characterIdOnOpen === this.controlledCharacterId) {
			return;
		}
		dragManager.cancelDragFromSource('spellsWindow');
	});
};

SpellsWindow.prototype._refreshAllContent = function () {
	this.mustRefreshAll = false;

	var charactersData = window.gui.playerData.characters;
	var controlledCharacter = charactersData.getControlledCharacter();
	this._onMainCharacter = charactersData.isMainCharacterControlled();
	this.table.setSorter(defaultCompare);
	this._loadAllSpells(controlledCharacter.spellData.spells);
	this.setupSelectorOptions();
	this.table.selectFirstRow();
};

SpellsWindow.prototype._askForRefresh = function () {
	// if the window is visible we are refreshing it right now
	if (this.isVisible()) {
		this._refreshAllContent();
	} else {
		this.mustRefreshAll = true;
	}
};

SpellsWindow.prototype.updateRemainingPoints = function () {
	var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
	var remainingPoints = controlledCharacter.characteristics.spellsPoints;
	if (this.remainingPoints === remainingPoints) {
		return;
	}
	this.remainingPointsBox.setText(remainingPoints);
	this.remainingPoints = remainingPoints;
};

SpellsWindow.prototype.setupSelectorOptions = function () {
	var self = this;

	this.selector.clearContent();
	this.selector.addOption(getText('ui.common.allTypes'), '-');
	this.selector.setValue('-');

	var inserted = {};
	var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
	for (var spellId in controlledCharacter.spellData.spells) {
		var spell = controlledCharacter.spellData.spells[spellId];
		var typeId = spell.getProperty('typeId');
		if (!inserted[typeId]) {
			self.selector.addOption(spell.getHumanReadableSpellType(), typeId);
			inserted[typeId] = true;
		}
	}
};

SpellsWindow.prototype.updateWeaponSpell = function () {
	var self = this;

	// retrieve the new weapon spell
	var weaponSpell = window.gui.playerData.characters.mainCharacter.spellData.spells[SpellFactory.WEAPON_SPELL_ID];

	assetPreloading.preloadImage(weaponSpell.getIconUri(), function (url) {
		self.table.updateRow(weaponSpell);
		var icon = self.table.getCell(weaponSpell.id, 'icon');
		icon.setStyle('backgroundImage', url);
		self.refreshSpellState(weaponSpell.id);

		// if the currently selected line is the weapon spell we have to update the description
		if (self.currentSpellId === weaponSpell.id) {
			self.displaySpell({ spell: weaponSpell, imageUri: url });
		}
	});
};

/** Loads or reloads ALL spells.
 *  Happens when your character initializes OR when control switches to your slave.
 *  @param {map} spells
 */
SpellsWindow.prototype._loadAllSpells = function (spells) {
	this.spellMap = spells;

	// Clear spell table and refresh it from given spells
	this.table.clearContent();
	this.table.addMap(spells);

	// Review the spell list to find which ones did not have their icon loaded yet.
	// This is the case for spells we do not have in our shortcut bar (since shortcut bar loads the icons).
	var images = [];
	var spellList = [];
	for (var spellId in spells) {
		var spell = spells[spellId];

		if (!spell.getIconUrl()) {
			spellList.push(spell);
			images.push(spell.getIconUri());
		}
	}
	// Now we load the icons...
	var self = this;
	assetPreloading.preloadImages(images, function (urls) {
		for (var i = 0; i < urls.length; i++) {
			var spell = spellList[i];
			var url = spell.spell.image = urls[i];

			var icon = self.table.getCell(spell.id, 'icon');
			icon.setStyle('backgroundImage', url);

			if (self.currentSpellId === spell.id) {
				self.displaySpell({ spell: spell, imageUri: url });
			}
		}
		// Once we have all the icons we refresh the state of all spells.
		// NB: We waited so we can pass the icons to drag and drop manager directly.
		self.refreshAllSpellState();
	});
};

/** Give or remove the draggable behavior of a spell */
SpellsWindow.prototype.setSpellDraggable = function (spellId, mustEnable) {
	var icon = this.table.getCell(spellId, 'icon');
	if (dragManager.isDraggable(icon)) {
		if (mustEnable) {
			dragManager.enableDrag(icon);
		} else {
			dragManager.disableDrag(icon);
		}
		return;
	}
	// Spell is not yet "draggable". Give draggable behavior only if we came to enable it
	if (mustEnable) {
		var url = this.spellMap[spellId].getIconUrl();
		if (url) {
			dragManager.setDraggable(
				icon,
				{ backgroundImage: url },
				'spellsWindow',
				{ spellId: spellId },
				{ dragOnTouchstart: true }
			);
		}
	}
};

SpellsWindow.prototype.setSpellEnabled = function (spellId, enable) {
	this.table.getRow(spellId).toggleClassName('grayed', !enable);
};

/** Give or remove the draggable behavior & enabled state of one spell.
 *  This depends on the level the player AND if this is the main character
 */
SpellsWindow.prototype.refreshSpellState = function (spellId) {
	var spell = this.spellMap[spellId];

	var mustEnable = spell.isItem || canUseSpell(spell); // items are always enabled
	var mustBeDraggable = mustEnable && this._onMainCharacter; // cannot drag spells of controlled entity

	this.setSpellEnabled(spellId, mustEnable);
	this.setSpellDraggable(spellId, mustBeDraggable);
};

/** Give or remove the draggable behavior & enabled state of all spells
 */
SpellsWindow.prototype.refreshAllSpellState = function () {
	for (var spellId in this.spellMap) {
		this.refreshSpellState(spellId);
	}
};

/** Sets a displayed spell's level (inside displayed table)
 *  @param  {Number} spellId
 *  @param  {Number} level - level to display
 */
SpellsWindow.prototype._updateDisplayedSpellLevel = function (spellId, level) {
	if (this.table.hasRow(spellId)) {
		var levelCell = this.table.getCell(spellId, 'rank');
		levelCell.setText(level);
	}
};

// NB: we only *enable* new spells, never disable any
SpellsWindow.prototype.enableSpellsOnLevelUp = function () {
	if (!this.table.getRowCount()) {
		return;
	}
	this.refreshAllSpellState();
	this._refreshAllAddButtonState();
};

SpellsWindow.prototype._refreshAllAddButtonState = function () {
	for (var spellId in this.spellMap) {
		if (this.table.hasRow(spellId)) {
			var button = this.table.getCell(spellId, 'add');
			this._refreshAddButtonState(button);
		}
	}
};

SpellsWindow.prototype._refreshAddButtonState = function (button) {
	var spell = button.spell;
	var level = spell.level;

	// spell cannot be upgraded reached max level => no button
	if (level === 0 || level === spell.getMaxLevel()) {
		button.hide();
		return;
	}
	// we don't yet have the level to use this spell at next level => no button
	if (!canUseSpell(spell, level + 1)) {
		button.hide();
		return;
	}
	// there is / or will be a possibility to upgrade this spell => button is visible
	button.show();

	// if we need more points to upgrade this spell => disable button
	var upgradeCost = spell.getUpgradeCost();
	if (this.remainingPoints < upgradeCost) {
		button.disable();
		return;
	}

	// button is active!
	button.enable();
};


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method displaySpell
 * @desc   ...
 *
 * @param  {Object} spellInfo
 * @param  {Object} spellInfo.spell        - spell object
 * @param  {number} [spellInfo.spellLevel] - optional spell level
 * @param  {string} spellInfo.imageUri     - image of the spell
 */
SpellsWindow.prototype.displaySpell = function (spellInfo) {
	var self = this;
	var spell;
	if (!spellInfo.spellLevel || spellInfo.spellLevel === spellInfo.spell.level) {
		// the spell level selected is the same as the current player's one: we can use the original object
		spell = spellInfo.spell;
	} else {
		// another spell level has been selected: we don't want to modify the original object so we clone it
		spell = spellInfo.spell.clone();
		spell.setLevel(spellInfo.spellLevel);
	}
	var level = spell.level;
	var spellLevelId = spell.getSpellLevelId(level);

	var imageUri = spellInfo.imageUri;

	function addTab(tabs, rankNum) {
		var tabLevel = Number(rankNum) + 1;
		var tab = tabs.createChild('div', { className: 'tab', text: tabLevel });
		tab.rankNum = rankNum;

		if (spell.getSpellLevelId(tabLevel) === spellLevelId) {
			tab.addClassNames('on');
		}

		tapBehavior(tab);

		tab.on('tap', function () {
			self.displaySpell({
				spell: spellInfo.spell,
				imageUri: spellInfo.imageUri,
				spellLevel: tabLevel
			});
			playUiSound('TAB');
		});
	}

	// TODO: for the weapon, the spellLevelId should include the weapon ID
	if (this.currentSpellLevelId === spellLevelId) {
		this.tabIcon.setStyle('backgroundImage', imageUri);
		return;
	}

	this.col2.clearContent();
	this.currentSpellLevelId = spellLevelId;
	this.currentSpellId = spell.id;

	var tabs = self.col2.createChild('div', { className: 'tabs' });

	// Add one tab per spell level
	var maxLevel = spell.getMaxLevel(); // items and weapon-spell have max level of 1
	for (var lvl = 0; lvl < maxLevel; lvl++) {
		addTab(tabs, lvl.toString());
	}

	var detailsPanel = self.col2.createChild('div', { className: 'panel' });
	var header = detailsPanel.createChild('div', { className: 'header' });

	var icon = this.tabIcon = header.createChild('div', { className: 'icon' });
	icon.setStyle('backgroundImage', imageUri);

	var panelTop = header.createChild('div', { className: 'panelTop' });
	panelTop.createChild('div', { className: 'spellName', text: spell.getName() });
	panelTop.createChild('div', {
		className: 'minPlayerLevel',
		text: getText('ui.spell.requiredLevel') + ' ' +
			(spell.getProperty('minPlayerLevel', level) || 1) // 1 because we don't want "0" displayed for items
	});

	detailsPanel.appendChild(new SpellDescription({
		spell: spell,
		level: level
	}, {
		spellTooltipAll: true
	}));
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SpellsWindow/index.js
 ** module id = 750
 ** module chunks = 0
 **/