require('./styles.less');
var barTypes = require('ShortcutBarEnum');
var Button = require('Button');
var constants = require('constants');
var dimensions = require('dimensionsHelper').dimensions;
var dragManager = require('dragManager');
var GameContextEnum = require('GameContextEnum');
var gameOptions = require('gameOptions');
var getText = require('getText').getText;
var hoverBehavior = require('hoverBehavior');
var inherits = require('util').inherits;
var ItemSlot = require('./itemSlot.js');
var MenuDrawer = require('MenuDrawer');
var PaginationUI = require('PaginationUI');
var SpellSlot = require('./spellSlot.js');
var SwipingTabs = require('SwipingTabs');
var SpellFactory = require('SpellFactory');
var TooltipBox = require('TooltipBox');
var tweener = require('tweener');
var WuiDom = require('wuidom');
var playUiSound = require('audioManager').playUiSound;
var getExclusiveSelectorByGroup = require('ExclusiveSelector').getExclusiveSelectorByGroup;

var ITEM_TYPE = barTypes.GENERAL_SHORTCUT_BAR;
var SPELL_TYPE = barTypes.SPELL_SHORTCUT_BAR;
var panelType = {};
panelType[SPELL_TYPE] = 'spell';
panelType[ITEM_TYPE] = 'item';

var SlotByType = {
	spell: SpellSlot,
	item: ItemSlot
};

var ICON_SIZE = constants.SHORTCUT_ICON_SIZE;
var SLOT_PER_PAGE = 30;
var PAGE_COUNT = 3;

var dropSource = {
	spell: ['shortcutBar', 'spellsWindow'],
	item: ['shortcutBar', 'equipment', 'presets', 'characterBox']
};


function ShortcutBar() {
	MenuDrawer.call(this, { backDrawerSize: constants.SHORTCUT_GAUGE_SIZE });
	this.addClassNames('ShortcutBar');

	this.toolbarSwitched = null;

	this._createDom();
	this._setupEvents();
	var exclusiveSelector = getExclusiveSelectorByGroup('shortcutSlots');
	var self = this;
	exclusiveSelector.on('selectionChanged', function (newSelection) {
		if (newSelection instanceof SpellSlot || newSelection === null) {
			self._selectedSlot = newSelection;
		}
	});
}
inherits(ShortcutBar, MenuDrawer);
module.exports = ShortcutBar;

function addSlotToMap(slot, slotMap) {
	var slots = slotMap[slot.id];
	if (!slots) {
		slots = slotMap[slot.id] = [];
	}
	slot.exclusiveSelector = getExclusiveSelectorByGroup('shortcutSlots');
	slot.exclusiveSelector.register(slot);
	slots.push(slot);
}

function removeSlotFromMap(slot, slotMap) {
	var list = slotMap[slot.id];
	if (list) {
		var index = list.indexOf(slot);
		if (index !== -1) { list.splice(index, 1); }
	}
	if (slot.exclusiveSelector) {
		slot.exclusiveSelector.unregister(slot);
		delete slot.exclusiveSelector;
	}
}

ShortcutBar.prototype.computeBestSize = function (availableSize, mode) {
	var btnSpace;
	if (mode === 'narrow') {
		btnSpace = constants.ICONBAR_TAB_WIDTH + constants.ICONBAR_CORNER_WIDTH;
		this._iconsVisiblePerLine = ~~((availableSize - btnSpace) / ICON_SIZE);
		return this._iconsVisiblePerLine * ICON_SIZE + btnSpace;
	} else {
		btnSpace = constants.ICONBAR_TAB_HEIGHT;
		this._iconsVisiblePerColumn = ~~((availableSize - btnSpace) / ICON_SIZE);
		return this._iconsVisiblePerColumn * ICON_SIZE + btnSpace;
	}
};

ShortcutBar.prototype._selectSlot = function (slot, clear) {
	if (!this.isLocked) { return; }
	if (clear) {
		window.isoEngine.clearSpellDisplay();
	}
	if (this._selectedSlot === slot) {
		return this._unSelectSlot(slot);
	}
	if (this._selectedSlot) {
		this._selectedSlot.select(false);
	}

	if (slot.isEmpty) {
		this._selectedSlot = null;
		return;
	}
	this._selectedSlot = slot;
	slot.select(true);

	if (window.gui.fightManager.isInBattle()) {
		this._close(true);
	}
};

ShortcutBar.prototype._unSelectSlot = function (slot) {
	if (!slot || this._selectedSlot !== slot) { return; }
	this._selectedSlot.select(false);
	this._selectedSlot = null;
};

ShortcutBar.prototype._positionSlot = function (slot, index) {
	var pageIndex = index % SLOT_PER_PAGE;

	var column, line, x, y;
	if (window.gui.ipadRatio) {
		column = pageIndex % this._columns;
		line = Math.floor(pageIndex / this._columns);
		x = column * ICON_SIZE;
		y = line * ICON_SIZE;
	} else {
		column = pageIndex % this._lines;
		line = Math.floor(pageIndex / this._lines);
		x = line * ICON_SIZE;
		y = column * ICON_SIZE;
	}

	slot.index = index;
	slot.x = x;
	slot.y = y;
	slot.setStyles({
		left: x + 'px',
		top: y + 'px',
		webkitTransform: ''
	});
};

ShortcutBar.prototype.openPanel = function (type) {
	var otherType = type === 'spell' ? 'item' : 'spell';
	this.currentPanelType = type;
	this.panels[type].show();
	this.panels[otherType].hide();
	this.panel = this.panels[type];
	this.replaceClassNames([otherType], [type]);
	this.emit('panel', type);
};

ShortcutBar.prototype.getSlot = function (type, index) {
	var panel = this.panels[type];
	if (!panel) { return; }
	return panel.slotList[index];
};

function createHoverArrow(side, action) {
	var arrow = new WuiDom('div', { className: 'hoverBorder' });
	arrow.addClassNames(side);
	arrow.createChild('div', { className: 'arrow' });
	hoverBehavior(arrow);

	var timeout;
	function clearTimeout() {
		window.clearTimeout(timeout);
		arrow.delClassNames('over');
	}

	function startTimeout() {
		timeout = window.setTimeout(function () {
			action();
			startTimeout();
		}, 700);
	}

	arrow.on('touchenter', function () {
		this.addClassNames('over');
		window.gui.wBody.once('dom.touchend', clearTimeout);
		startTimeout();
	});

	arrow.on('touchleave', function () {
		clearTimeout();
		window.gui.wBody.removeListener('dom.touchend', clearTimeout);
	});

	return arrow;
}

ShortcutBar.prototype._setPanelContent = function (panelType, shortcuts) {
	var panel = this.panels[panelType];
	var slotList = panel.slotList;
	var slotMap = panel.slotMap = {};

	var newList = new Array(slotList.length);
	var i, len, shortcut;
	for (i = 0, len = shortcuts.length; i < len; i += 1) {
		shortcut = shortcuts[i];
		if (!this._isSlotIndexValid(shortcut.slot)) { continue; }
		newList[shortcut.slot] = shortcut;
	}

	for (i = 0, len = slotList.length; i < len; i += 1) {
		shortcut = newList[i];
		var slot = slotList[i];

		if (!shortcut) {
			if (!slot.isEmpty) {
				slot.unset();
				removeSlotFromMap(slot, slotMap);
			}
			continue;
		}

		if (slot.isEmpty || slot.id !== SlotByType[panelType].getId(shortcut)) {
			slot.setShortcut(shortcut);
			addSlotToMap(slot, slotMap);
		}
	}
};

ShortcutBar.prototype._setPlaceHolder = function (panelType, shortcuts) {
	var panel = this.panels[panelType];
	var slotList = panel.slotList;

	for (var i = 0, len = shortcuts.length; i < len; i += 1) {
		var shortcut = shortcuts[i];
		if (!this._isSlotIndexValid(shortcut.slot)) { continue; }
		slotList[shortcut.slot].setImage(SpellFactory.placeHolder); // yeah same for items, looks ok
	}
};

ShortcutBar.prototype._emptyPanel = function (panelType) {
	var panel = this.panels[panelType];
	var slotList = panel.slotList;
	panel.slotMap = {};

	for (var i = 0, len = slotList.length; i < len; i += 1) {
		var slot = slotList[i];
		if (!slot.isEmpty) {
			slot.unset();
		}
	}
};

ShortcutBar.prototype._resize = function () {
	var panelWidth, panelHeight;
	var spellPanel = this.panels.spell;
	var itemPanel = this.panels.item;

	if (window.gui.ipadRatio) {
		this.setStyles({
			top: '',
			right: '',
			left: dimensions.posShortcutBar + 'px',
			bottom: '0px',
			width: dimensions.shortcutBarSize + 'px',
			height: dimensions.bottomBarHeight + 'px'
		});
		panelWidth = dimensions.shortcutBarSize - 75; // 75 is the button box width
		this._columns = Math.floor(panelWidth / ICON_SIZE);
		this._lines = Math.ceil(SLOT_PER_PAGE / this._columns);
		panelHeight = this._lines * ICON_SIZE + 8; // 8 is the progress bar height
		this.setOpeningSide('top');
		spellPanel.setSwipeDirection('horizontal');
		itemPanel.setSwipeDirection('horizontal');
		this.arrowNeg.setStyle('bottom', dimensions.bottomBarHeight + 'px');
		this.arrowPos.setStyle('bottom', dimensions.bottomBarHeight + 'px');
		this.trashZone.setStyle('width', panelWidth + 'px');
		this._buttonBox.appendChild(this._lockBtn);
		this._buttonBox.appendChild(this._pagination);
		this._pagination.setDirection('horizontal');
	} else {
		this.setStyles({
			bottom: '',
			left: '',
			right: '0px',
			top: dimensions.posShortcutBar + 'px',
			width: dimensions.sideBarWidth + 'px',
			height: dimensions.shortcutBarSize + 'px'
		});
		panelHeight = dimensions.shortcutBarSize - 29; // 29 is the buttonBox height
		this._lines = Math.floor(panelHeight / ICON_SIZE);
		this._columns = Math.ceil(SLOT_PER_PAGE / this._lines);
		panelWidth = this._columns * ICON_SIZE + 13 + 30; // 30 is the PaginationUI width, 13 is the progress bar width
		this.setOpeningSide('left');
		spellPanel.setSwipeDirection('vertical');
		itemPanel.setSwipeDirection('vertical');
		this.arrowPos.setStyles({
			bottom: -dimensions.posShortcutBar + 'px',
			right: dimensions.sideBarWidth + 'px',
			height: dimensions.posShortcutBar + 'px'
		});
		this.arrowNeg.setStyles({
			top: -dimensions.posShortcutBar + 'px',
			right: dimensions.sideBarWidth + 'px',
			height: dimensions.posShortcutBar + 'px'
		});
		this.trashZone.setStyle('height', panelHeight + 'px');
		this._panelBox.appendChild(this._lockBtn);
		this._panelBox.appendChild(this._pagination);
		this._pagination.setDirection('vertical');
	}
	this._panelBox.setStyles({
		width: panelWidth + 'px',
		height: panelHeight + 'px'
	});

	var spellSlotList = spellPanel.slotList;
	var itemSlotList = itemPanel.slotList;
	for (var i = 0, len = spellSlotList.length; i < len; i += 1) {
		this._positionSlot(spellSlotList[i], i);
		this._positionSlot(itemSlotList[i], i);
	}
};

function setContextMenuEnable(slotList, enable) {
	for (var i = 0, len = slotList.length; i < len; i += 1) {
		var slot = slotList[i];
		slot.enableContextMenu(enable);
	}
}

ShortcutBar.prototype._enableSlotContextMenus = function (enable) {
	setContextMenuEnable(this.panels.item.slotList, enable);
	setContextMenuEnable(this.panels.spell.slotList, enable);
};

ShortcutBar.prototype.updateSpellsAvailability = function () {
	if (this.currentCharacterId !== window.gui.playerData.characters.controlledCharacterId) {
		this.requestSpellsAvailibilityUpdate = true;
		return;
	}

	var slotList = this.panels.spell.slotList;
	for (var i = 0, len = slotList.length; i < len; i += 1) {
		var slot = slotList[i];
		if (!slot.isEmpty) {
			this._updateSpellSlotAvailability(slot);
		}
	}
};

ShortcutBar.prototype.updateSpellAvailability = function (spellId) {
	if (this.currentCharacterId !== window.gui.playerData.characters.controlledCharacterId) {
		this.requestSpellAvailibilityUpdate = spellId;
		return;
	}

	var slotList = this.panels.spell.slotMap[spellId];
	if (!slotList) { return; }
	for (var i = 0, len = slotList.length; i < len; i += 1) {
		this._updateSpellSlotAvailability(slotList[i]);
	}
};

ShortcutBar.prototype.setAvailability = function (shouldEnable) {
	this.overlay.toggleDisplay(!shouldEnable);
	this.lockDrawer(!shouldEnable);
};

ShortcutBar.prototype.deselectIcon = function () {
	this._unSelectSlot(this._selectedSlot);
};

ShortcutBar.prototype._updateSpellSlotAvailability = function (slot) {
	var cooldown;
	if (window.gui.gameContext === GameContextEnum.FIGHT && slot.id !== undefined) {
		slot.isDisabled = !window.gui.fightManager.canCastThisSpell(slot.id);
		cooldown = window.gui.fightManager.getSpellCooldown(slot.id);
	} else {
		slot.isDisabled = false;
		cooldown = 0;
	}

	// unselect spell if it becomes unavailable
	if (slot.isDisabled) {
		this._unSelectSlot(slot);
	}

	slot.icon.toggleClassName('disabled', slot.isDisabled);
	slot.setCooldown(cooldown);
};

ShortcutBar.prototype._updateWeaponSpell = function () {
	var weaponSpell = window.gui.playerData.characters.mainCharacter.spellData.spells[SpellFactory.WEAPON_SPELL_ID];
	if (!weaponSpell) {
		return console.warn('the player weapon spell has not been created yet');
	}

	var slotList = this.panels.spell.slotMap[SpellFactory.WEAPON_SPELL_ID];
	if (!slotList) { return; }

	for (var i = 0; i < slotList.length; i++) {
		slotList[i].setSpell(weaponSpell);
	}
};

// some shortcuts may be out of DofusTouch client range
ShortcutBar.prototype._isSlotIndexValid = function (index) {
	return index < SLOT_PER_PAGE * PAGE_COUNT;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DRAG RELATED
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ShortcutBar.prototype._setDragEnableItems = function (enable) {
	var slots = this.panels.item.slotList;
	for (var i = 0; i < slots.length; i++) {
		this._setDragEnable(slots[i], enable);
	}
};

ShortcutBar.prototype._setDragEnableSpells = function (enable) {
	var slots = this.panels.spell.slotList;
	for (var i = 0; i < slots.length; i++) {
		this._setDragEnable(slots[i], enable);
	}
};

ShortcutBar.prototype._onDrop = function (targetSlot, draggedSlot, sourceId, data) {
	if (window.gui.fightManager.isInBattle() && this.isLocked) {
		return;
	}
	var self = this;
	var panel = this.panels[panelType[draggedSlot.type]];

	function swapSlots(error) {
		var tempIndex = draggedSlot.index;
		var tempParent = draggedSlot.getParent();
		var posX = draggedSlot.x - targetSlot.x;
		var posY = draggedSlot.y - targetSlot.y;

		draggedSlot.index = targetSlot.index;
		panel.slotList[draggedSlot.index] = targetSlot.getParent().appendChild(draggedSlot);
		self._positionSlot(draggedSlot, draggedSlot.index);
		targetSlot.index = tempIndex;
		panel.slotList[targetSlot.index] = tempParent.appendChild(targetSlot);

		if (error || self._dragStartPage !== self._pagination.current) {
			targetSlot.addClassNames('vibrate');
			draggedSlot.waitingForConfirmation = false;
			self._positionSlot(targetSlot, targetSlot.index);
			self._positionSlot(draggedSlot, draggedSlot.index);
			return;
		}
		tweener.tween(
			targetSlot,
			{ webkitTransform: 'translate3d(' + posX + 'px,' + posY + 'px,0)' },
			{ time: 100, easing: 'ease-out' }, function () {
				self._positionSlot(targetSlot, targetSlot.index);
				targetSlot.addClassNames('vibrate');

				window.dofus.sendMessage('ShortcutBarSwapRequestMessage', {
					barType: draggedSlot.type,
					firstSlot: draggedSlot.index,
					secondSlot: targetSlot.index
				});
			}
		);
	}

	if (sourceId === 'shortcutBar') {
		if (targetSlot.index === draggedSlot.index || draggedSlot.waitingForConfirmation) {
			return draggedSlot.setStyle('webkitTransform', 'translate3d(0,0,0)');
		}
		draggedSlot.waitingForConfirmation = true;
		window.gui.removeAllListeners('ShortcutBarSwapErrorMessage');
		targetSlot.delClassNames('vibrate');

		swapSlots();

		window.gui.once('ShortcutBarSwapErrorMessage', swapSlots);
		return;
	}

	function assignSlot(shortcut) {
		window.gui.removeAllListeners('ShortcutBarAddErrorMessage');

		var oldShortcut = targetSlot.shorcut;
		var type = panelType[targetSlot.type];
		self._setShortcut(type, shortcut);
		window.dofus.sendMessage('ShortcutBarAddRequestMessage', {
			barType: targetSlot.type,
			shortcut: shortcut
		});

		window.gui.once('ShortcutBarAddErrorMessage', function () {
			if (targetSlot.isEmpty) {
				self._removeShortcut(type, targetSlot.index);
			} else {
				self._setShortcut(type, oldShortcut);
			}
		});
	}

	switch (sourceId) {
	case 'characterBox':
	case 'equipment':
		var item = draggedSlot.itemInstance;
		assignSlot({
			_type: 'ShortcutObjectItem',
			slot: targetSlot.index,
			itemUID: item.objectUID,
			itemGID: item.objectGID
		});
		break;
	case 'presets':
		assignSlot({
			_type: 'ShortcutObjectPreset',
			slot: targetSlot.index,
			presetId: draggedSlot.preset.presetId
		});
		break;
	case 'spellsWindow':
		assignSlot({
			_type: 'ShortcutSpell',
			slot: targetSlot.index,
			spellId: data.spellId
		});
		break;
	}
};

ShortcutBar.prototype._createSlot = function (panelType) {
	var slot;
	if (panelType === 'spell') {
		slot = this._createSpellSlot();
	} else {
		slot = this._createItemSlot();
	}

	this._setDroppable(slot, dropSource[panelType], { matchPositionOnDrop: true });
	var self = this;
	slot.on('drop', function (draggedSlot, source, data) {
		self._onDrop(this, draggedSlot, source, data);
	});

	slot.addClassNames('anim' + Math.round(Math.random() * 9));

	return slot;
};

ShortcutBar.prototype._baseSlot = function (Slot) {
	var slot = new Slot({ scaleOnPress: true });
	slot.addClassNames('vibrate', 'ShortcutSlot');
	var self = this;

	// this touchstart has to be called before the setDraggable
	slot.on('dom.touchstart', function () {
		if (self.isLocked) { return; }
		this.delClassNames('vibrate');
	});

	this._setDraggable(slot, null, 'shortcutBar', null, { dragOnTouchstart: false, dragElement: true });

	slot.on('dragStart', function () {
		self._dragStartPage = self._pagination.current;
		if (!self.isLocked) {
			self.addClassNames('dragging'); // this is for the display of the trash
		}
	});

	slot.on('dragEnd', function () {
		self.delClassNames('dragging');
		if (!this.isLocked) {
			slot.addClassNames('vibrate');
		}
	});

	this._disableDrag(slot);

	slot.on('removed', function () {
		window.gui.removeAllListeners('ShortcutBarRemoveErrorMessage');

		var shortcut = this.shortcut;
		var type = panelType[slot.type];
		tweener.tween(this, { webkitTransform: 'scale(0)' }, { time: 100, easing: 'ease-out' }, function () {
			self._removeShortcut(type, slot.index);
			tweener.tween(slot, { webkitTransform: 'scale(1)' }, { time: 100, easing: 'ease-out' });
			window.dofus.sendMessage('ShortcutBarRemoveRequestMessage', {
				barType: slot.type,
				slot: slot.index
			});
		});

		window.gui.once('ShortcutBarRemoveErrorMessage', function () {
			self._setShortcut(type, shortcut);
		});
	});

	slot.on('unset', function () {
		if (self._selectedSlot === slot) {
			self._unSelectSlot(slot);
		}
	});

	slot.on('setData', function () {
		if (self._selectedSlot === slot) {
			self._unSelectSlot(slot);
		}
	});

	return slot;
};

ShortcutBar.prototype._createItemSlot = function () {
	var slot = this._baseSlot(ItemSlot);
	this._setDragEnable(slot, !this.isLocked);

	var self = this;
	slot.on('tap', function () {
		var clear = true;
		self._selectSlot(this, clear);
	});
	return slot;
};

ShortcutBar.prototype._createSpellSlot = function () {
	var slot = this._baseSlot(SpellSlot);
	this._updateSpellSlotAvailability(slot);

	var self = this;
	slot.on('tap', function () {
		if (this.isDisabled) { return; }
		var clear = true;
		self._selectSlot(this, clear);
	});

	this._setDragEnable(slot, !this.isLocked && window.gui.playerData.characters.isMainCharacterControlled());
	return slot;
};

ShortcutBar.prototype._createPanel = function (panelType) {
	var panel = new SwipingTabs({ noHeader: true });

	var slotList = panel.slotList = new Array(SLOT_PER_PAGE * PAGE_COUNT);
	panel.slotMap = {};

	for (var i = 0; i < PAGE_COUNT; i += 1) {
		var page = new WuiDom('div', { className: 'page' });
		panel.addTab('', page, i);

		for (var j = 0; j < SLOT_PER_PAGE; j += 1) {
			var slot = this._createSlot(panelType);
			this._disableDrag(slot);
			var index = i * SLOT_PER_PAGE + j;
			slotList[index] = page.appendChild(slot);
			this._positionSlot(slot, index);
		}
	}

	panel.openTab(0);
	return panel;
};


ShortcutBar.prototype.lockDrag = function (isLocked) {
	this.isLocked = isLocked;
	this.toggleClassName('draggable', !isLocked);
	this._setDragEnableItems(!this.isLocked);
	this._setDragEnableSpells(!this.isLocked);
	if (isLocked) {
		this.spellBtn.enable();
		this.itemBtn.enable();
		if (this.toolbarSwitched !== null) {
			this.shouldKeepOpen = false;
			window.gui.resizeToolbar(!this.toolbarSwitched);
			this.toolbarSwitched = null;
		} else {
			this.close();
		}
	} else { // going into "reorg" mode...
		this.spellBtn.disable();
		this.itemBtn.disable();
		var isShowingSpellPanel = this.currentPanelType === 'spell';
		var isSizeDifferent = gameOptions.menubarSizeInFight !== gameOptions.menubarSize;
		var isEditingDifferentMode = isShowingSpellPanel !== window.gui.playerData.isFighting;
		if (isSizeDifferent && isEditingDifferentMode) {
			this.toolbarSwitched = isShowingSpellPanel;
			this.shouldKeepOpen = true;
			var textId = isShowingSpellPanel ? 'tablet.nowShowingFightToolbar' : 'tablet.nowShowingRpToolbar';
			TooltipBox.showNotification(getText(textId), this);
			window.gui.showFightingToolbar(isShowingSpellPanel);
		}
	}
};

ShortcutBar.prototype.getSlot = function (type, index) {
	var panel = this.panels[type];
	if (!panel) { return; }
	return panel.slotList[index];
};

ShortcutBar.prototype._createDom = function () {
	var self = this;

	// overlay to disable the whole shortcut
	this.overlay = this.content.createChild('div', { className: 'overlay', hidden: true });

	var panelBox = this._panelBox = this.content.createChild('div', { className: 'panelBox' });
	this.panels = {};

	function onOpenTab(id) {
		pagination.setCurrent(id);
	}
	var panel;
	panel = this.panels.spell = panelBox.appendChild(this._createPanel('spell'));
	panel.on('openTab', onOpenTab);

	panel = this.panels.item = panelBox.appendChild(this._createPanel('item'));
	panel.on('openTab', onOpenTab);

	this.arrowNeg = this.appendChild(createHoverArrow('negative', function () {
		self.panel.swipeNegative();
	}));

	this.arrowPos = this.appendChild(createHoverArrow('positive', function () {
		self.panel.swipePositive();
	}));

	this.on('panel', function () {
		pagination.setCurrent(self.panel.currentTab.id);
	});

	var buttonBox = this._buttonBox = this.content.createChild('div', { className: 'buttonBox' });
	this.spellBtn = buttonBox.appendChild(new Button({
		className: 'spellBtn',
		tooltip: getText('ui.charcrea.spells'),
		sound: 'BANNER_SPELL_TAB'
	}, function () {
		self.openPanel('spell');
	}));

	this.itemBtn = buttonBox.appendChild(new Button({
		className: 'itemBtn',
		tooltip: getText('ui.common.objects'),
		sound: 'BANNER_SPELL_TAB'
	}, function () {
		self.openPanel('item');
	}));

	var pagination = this._pagination = buttonBox.appendChild(new PaginationUI({
		disableInput: true,
		soundPrev: 'SCROLL_DOWN',
		soundNext: 'SCROLL_UP'
	}));
	pagination.setPageCount(PAGE_COUNT);
	pagination.setCurrent(0);
	pagination.on('next', function () {
		self.panel.openTab(this.current + 1);
	});

	pagination.on('previous', function () {
		self.panel.openTab(this.current - 1);
	});

	this._lockBtn = buttonBox.appendChild(new Button({ className: 'lockBtn', scaleOnPress: true }, function () {
		if (!window.gui.playerData.characters.isMainCharacterControlled()) { return; }

		self.lockDrag(!self.isLocked);
	}));
	this.isLocked = true;

	this.openPanel('spell');

	var trashZone = this.trashZone = this.createChild('div', { className: 'trashZone' });
	trashZone.createChild('div', { className: 'trashBin', text: getText('ui.common.remove') });
	this._setDroppable(trashZone, ['shortcutBar']);
	trashZone.on('drop', function (slot) {
		window.gui.removeAllListeners('ShortcutBarRemoveErrorMessage');

		var shortcut = this.shortcut;
		var type = panelType[slot.type];
		tweener.tween(slot, { opacity: 0 }, { time: 100, easing: 'ease-out' }, function () {
			self._removeShortcut(type, slot.index);
			slot.setStyles({ webkitTransform: 'scale(0)', opacity: 1 });
			tweener.tween(slot, { webkitTransform: 'scale(1)' }, { time: 100, easing: 'ease-out' });
			window.dofus.sendMessage('ShortcutBarRemoveRequestMessage', {
				barType: slot.type,
				slot: slot.index
			});
		});

		window.gui.once('ShortcutBarRemoveErrorMessage', function () {
			slot.setStyles({ webkitTransform: 'scale(1)', opacity: 1 });
			self._setShortcut(type, shortcut);
		});
	});
};

ShortcutBar.prototype._setShortcut = function (panelType, shortcut) {
	if (!this._isSlotIndexValid(shortcut.slot)) { return null; }
	var panel = this.panels[panelType];
	var slot = panel.slotList[shortcut.slot];
	if (slot.id === SlotByType[panelType].getId(shortcut)) { return slot; }

	if (this._selectedSlot === slot) { this._unSelectSlot(slot); }
	removeSlotFromMap(slot, panel.slotMap);
	slot.setShortcut(shortcut);
	addSlotToMap(slot, panel.slotMap);

	TooltipBox.enableTooltip(slot, !slot.isEmpty && this.isLocked);
	this._setDragEnable(slot, !this.isLocked);
	return slot;
};

ShortcutBar.prototype._removeShortcut = function (panelType, index) {
	if (!this._isSlotIndexValid(index)) { return; }
	var panel = this.panels[panelType];

	// handle old slot
	var slot = panel.slotList[index];
	if (slot.isEmpty) { return; }

	removeSlotFromMap(slot, panel.slotMap);
	if (this._selectedSlot === slot) { this._unSelectSlot(slot); }
	slot.unset();

	this._setDragEnable(slot, false);
	return slot;
};

ShortcutBar.prototype._setupEvents = function () {
	var gui = window.gui;
	var self = this;

	gui.on('disconnect', function () {
		self.close();
		self.delClassNames('dragging');
		self._selectedSlot = null;
		self._emptyPanel('spell');
		self._emptyPanel('item');
		self.currentCharacterId = null;
	});

	var loadingRequest = {};
	this.requestSpellsAvailibilityUpdate = null;
	this.requestSpellAvailibilityUpdate = null;
	this.currentCharacterId = null;

	function setPanelContent(panelType, shortcuts) {
		var dataContainer;
		var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
		if (panelType === 'spell') {
			dataContainer = controlledCharacter.spellData;

			// unset weapon slot. no choice -_-
			var weaponSlotList = self.panels.spell.slotMap[SpellFactory.WEAPON_SPELL_ID];
			if (weaponSlotList) {
				for (var i = 0; i < weaponSlotList.length; i += 1) {
					weaponSlotList[i].unset();
				}
				self.panels.spell.slotMap[SpellFactory.WEAPON_SPELL_ID] = [];
			}
		} else {
			dataContainer = window.gui.playerData.inventory;
		}

		if (loadingRequest[panelType]) {
			dataContainer.removeListener('loaded', loadingRequest[panelType]);
		}

		function onceDataLoaded() {
			self._setPanelContent(panelType, shortcuts);
			self.emit('panelLoaded', panelType, controlledCharacter);
		}

		if (!dataContainer.isLoaded) {
			self._setPlaceHolder(panelType, shortcuts);
			loadingRequest[panelType] = onceDataLoaded;
			dataContainer.once('loaded', onceDataLoaded);
		} else {
			onceDataLoaded();
		}
	}

	this.on('panelLoaded', function (panelType, controlledCharacter) {
		if (panelType !== 'spell') { return; }

		this.currentCharacterId = controlledCharacter.spellData.characterId;

		if (this.requestSpellsAvailibilityUpdate) {
			this.updateSpellsAvailability();
		} else if (this.requestSpellAvailibilityUpdate) {
			this.updateSpellAvailability(self.requestSpellAvailibilityUpdate);
		}

		this.requestSpellsAvailibilityUpdate = false;
		this.requestSpellAvailibilityUpdate = false;
	});

	gui.on('ShortcutBarContentMessage', function (msg) {
		if (msg.barType === SPELL_TYPE) {
			var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
			controlledCharacter.spellShortcuts = msg.shortcuts;
			controlledCharacter.emit('spellShortcuts');
		}

		setPanelContent(panelType[msg.barType], msg.shortcuts);
	});

	function updateSpellShortcut(shortcut) {
		// we need to update character's spellShortcut array
		var controlledCharacter = window.gui.playerData.characters.getControlledCharacter();
		var spellShortcuts = controlledCharacter.spellShortcuts;
		// going through it to see if this slot number already exists
		var slotIndex = null;
		for (var i = 0; i < spellShortcuts.length; i++) {
			if (spellShortcuts[i].slot === shortcut.slot) {
				// this slot is already in the array, we keep its index
				slotIndex = i;
				break;
			}
		}
		// if the slot was already in spellShortcut we update it, else we push it
		if (slotIndex !== null) {
			spellShortcuts[slotIndex].slot = shortcut;
		} else {
			spellShortcuts.push(shortcut);
		}
	}

	gui.on('ShortcutBarRefreshMessage', function (msg) {
		if (!self._isSlotIndexValid(msg.shortcut.slot)) { return; }
		var uiSlot = self._setShortcut(panelType[msg.barType], msg.shortcut);
		uiSlot.waitingForConfirmation = false;

		if (msg.barType === SPELL_TYPE) {
			updateSpellShortcut(msg.shortcut);
		}
	});

	gui.on('ShortcutBarRemovedMessage', function (msg) {
		self._removeShortcut(panelType[msg.barType], msg.slot);
	});

	var characters = gui.playerData.characters;
	characters.on('switchControlledCharacter', function () {
		var controlledCharacter = gui.playerData.characters.getControlledCharacter();
		if (!controlledCharacter.spellShortcuts) {
			return controlledCharacter.once('spellShortcuts', function () {
				setPanelContent('spell', controlledCharacter.spellShortcuts);
			});
		} else {
			setPanelContent('spell', controlledCharacter.spellShortcuts);
		}
	});

	characters.mainCharacter.on('spellsUpdate', function () {
		if (self.currentCharacterId !== this.spellData.characterId) { return; }
		self._setPanelContent('spell', this.spellShortcuts);
	});

	characters.mainCharacter.on('spellUpgrade', function (spellId, spellLevel) {
		if (self.currentCharacterId !== this.spellData.characterId || spellLevel <= 1) { return; }
		var slots = self.panels.spell.slotMap[spellId];
		for (var i = 0; i < slots.length; i += 1) {
			var slot = slots[i];
			slot.setShortcut(slot.shortcut);
		}
	});

	characters.mainCharacter.on('weaponChanged', function () {
		if (self.currentCharacterId !== this.spellData.characterId) { return; }
		self._updateWeaponSpell();
	});

	var inventory = gui.playerData.inventory;
	inventory.on('presetUpdated', function (presetId) {
		var preset = this.presets[presetId];
		var presetList = self.panels.item.slotMap['preset' + presetId];
		if (!presetList) { return; }
		for (var i = 0; i < presetList.length; i += 1) {
			presetList[i].setShortcut(preset);
		}
	});

	function disableItems(ids) {
		for (var i = 0, len = ids.length; i < len; i += 1) {
			var slotList = self.panels.item.slotMap['item' + ids[i]];
			if (!slotList) { continue; }
			for (var j = 0, len2 = slotList.length; j < len2; j += 1) {
				var slot = slotList[j];
				slot.icon.addClassNames('disabled');
				slot.isDisabled = true;
			}
		}
	}

	inventory.on('itemDeleted', function (objectUID) { disableItems([objectUID]); });
	inventory.on('itemDeleted', disableItems);

	function updateItemsQuantity(quantities) {
		for (var objectUID in quantities) {
			var slotList =  self.panels.item.slotMap['item' + objectUID];
			if (!slotList) { continue; }

			var quantity = quantities[objectUID];
			for (var j = 0, len2 = slotList.length; j < len2; j += 1) {
				slotList[j].setQuantity(quantity);
			}
		}
	}

	inventory.on('itemQuantity', function (objectUID, quantity) {
		var quantities = {};
		quantities[objectUID] = quantity;
		updateItemsQuantity(quantities);
	});

	inventory.on('itemsQuantity', updateItemsQuantity);

	function enableItems(items) {
		for (var objectUID in items) {
			var slotList = self.panels.item.slotMap['item' + objectUID];
			if (!slotList) { continue; }

			for (var i = 0, len = slotList.length; i < len; i += 1) {
				var slot = slotList[i];
				slot.setShortcut({ itemUID: objectUID });
			}
		}
	}

	inventory.on('itemAdded', function (item) {
		var items = {};
		items[item.objectUID] = item;
		enableItems(item);
	});
	inventory.on('itemsAdded', enableItems);

	function updateSpellsAvailability() {
		self.updateSpellsAvailability();
	}

	gui.playerData.on('actionPointsCurrentUpdated', updateSpellsAvailability);
	gui.fightManager.on('UpdatePreFightersList', updateSpellsAvailability);
	gui.fightManager.on('TurnCountUpdated', updateSpellsAvailability);
	gui.fightManager.on('updateSpellsAvailability', updateSpellsAvailability);

	gui.fightManager.on('fightEnterPreparation', function () {
		self.openPanel('item');
	});

	self.addClassNames('notInFight');
	gui.fightManager.on('fightEnterBattle', function () {
		self._fightEntered();
	});

	gui.fightManager.on('fightEnd', function () {
		self._fightExited();
		self._unSelectSlot(self._selectedSlot);
	});

	this.on('open', function () {
		playUiSound('WINDOW_OPEN');
	});

	this.on('close', function () {
		playUiSound('WINDOW_CLOSE');
		if (!this.isLocked) { this.lockDrag(true); }
	});
};

ShortcutBar.prototype._fightEntered = function () {
	this.delClassNames('notInFight');
	this.openPanel('spell');
	this._enableSlotContextMenus(false);
	this._turnOnDragToCast();
};

ShortcutBar.prototype._fightExited = function () {
	this.addClassNames('notInFight');
	this.openPanel('item');
	this._enableSlotContextMenus(true);
	this._turnOffDragToCast();
};

ShortcutBar.prototype._turnOnDragToCast = function () {
	this._setDragEnableSpells(true);
};

ShortcutBar.prototype._turnOffDragToCast = function () {
	this._setDragEnableSpells(!this.isLocked);
};

ShortcutBar.prototype._setDroppable = function (slot, source, options) {
	var self = this;
	options = options || {};
	options.isAllowed = function () {
		return !(window.gui.fightManager.isInBattle() && self.isLocked);
	};
	dragManager.setDroppable(slot, source, options);
};

ShortcutBar.prototype._disableDrag = function (slot) {
	if (!window.gui.fightManager.isInBattle()) {
		dragManager.disableDrag(slot);
	}
};

ShortcutBar.prototype._setDragEnable = function (slot, enable) {
	dragManager.setDragEnable(slot, (enable ||  window.gui.fightManager.isInBattle()) && !slot.isEmpty);
};

ShortcutBar.prototype._setDraggable = function (slot, uiInfo, source, data, options) {
	options.noHover = true;
	dragManager.setDraggable(slot, uiInfo, source, data, options);
	var self = this;
	slot.on('dragMove', function (x, y) {   //TODO: disconnect on spell removal from bar
		var isInFight = window.gui.fightManager.isInBattle();
		if (isInFight && self.isLocked) {
			window.background.colorCurrentDragCell(x, y, slot);
		}
	});
	slot.on('dragStart', function () {
		if (window.gui.fightManager.isInBattle() && self.isLocked) {
			self._selectSlot(slot, false);
			slot.customScale = 1.0; // adjust icon position under finger while dragging
			slot.customXOffset = 0;
			slot.customYOffset = -24;
			slot.customRotation = 45;
		}
	});
	slot.on('dragEnd', function (x, y) {
		var isInFight = window.gui.fightManager.isInBattle();
		if (isInFight && self.isLocked) {
			window.background.dragCellRelease(x, y, slot);
			if (!window.foreground.confirmBox.isOpen) {
				self._unSelectSlot(slot);
			}
			slot.customScale = null;
			slot.customXOffset = null;
			slot.customYOffset = null;
			slot.customRotation = null;
		}
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/ShortcutBar/index.js
 ** module id = 561
 ** module chunks = 0
 **/