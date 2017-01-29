require('./styles.less');
var BidHouseShopWindow = require('BidHouseShopWindow');
var constants = require('constants');
var dimensions = require('dimensionsHelper').dimensions;
var dragManager = require('dragManager');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Button = require('Button');
var userPref = require('UserPreferences');
var tweener = require('tweener');
var MenuDrawer = require('MenuDrawer');
var windowsManager = require('windowsManager');
var analytics = require('analytics');

var ICON_SIZE = constants.MENU_ICON_SIZE;

/**
 * Space in px we add between icons and menu bar's border.
 * NB: a bit smaller than "real" is fine and better than too much.
 */
var MARGIN = {
	narrow: 8,
	wide: 4
};

var LOCK_BTN_MARGIN = {
	narrow: 35,
	wide: 45
};

function toggleWindowOrTab(windowId, tabId) {
	if (!tabId) { return windowsManager.switch(windowId); }

	// TODO: windowsManager.switch does not know how to handle tabs. Move this to "Tab" component? (to be discussed)
	var windowElm = windowsManager.getWindow(windowId);
	var openedTabId = windowElm.getOpenedTabId();

	// if already open on the good tab, we close the window
	if (windowElm.openState && tabId === openedTabId) {
		windowsManager.close(windowId);
	} else {
		// otherwise we open it on the right tab OR switch it to the right tab
		windowsManager.open(windowId, { tabId: tabId });
	}
}

function toggleMyShop() {
	if (windowsManager.getWindow('tradeInventory').isMyShopOpen()) {
		windowsManager.close('tradeInventory');
	} else {
		// we close ANY dialog before opening our shop/inventory; this is simple enough.
		// Flash in 2.14 sometimes ignores the action, or closes the current inventory-related dialog
		window.dofus.sendMessage('LeaveDialogRequestMessage', null);
		window.dofus.sendMessage('ExchangeRequestOnShopStockMessage');
	}
}

function toggleBidHouse() {
	if (windowsManager.getWindow('bidHouseShop').openState) {
		windowsManager.close('bidHouseShop');
	} else {
		BidHouseShopWindow.openBidHouse(/*isSellMode=*/false);
	}
}

var iconDefinitions = { // static definition of the icons
	Carac: { tooltip: 'ui.banner.character', windowId: 'characteristics' },
	Spell: { tooltip: 'ui.grimoire.mySpell', windowId: 'grimoire', tabId: 'spells' },
	Bag: { tooltip: 'ui.banner.inventory', windowId: 'equipment' },
	Book: { tooltip: 'ui.common.quests', windowId: 'grimoire', tabId: 'quests' },
	Map: { tooltip: 'ui.banner.map', windowId: 'worldMap' },
	Friend: { tooltip: 'ui.banner.friends', windowId: 'social', tabId: 'friends' },
	Guild: { tooltip: 'ui.common.guild', windowId: 'social', tabId: 'guild' },
	BidHouse: { tooltip: 'ui.bidhouse.bigStore', action: toggleBidHouse },
	// TeamSearch: { tooltip: 'ui.common.teamSearch', action: xxx },
	// "Conquest" below is disabled in Flash if player level < 50 (see https://trello.com/c/c1pxSAvI)
	Conquest: { tooltip: 'ui.common.koliseum', windowId: 'arena' },
	Goultine: { tooltip: 'tablet.window.shop.title', windowId: 'market', tabId: 'shop' },
	Job: { tooltip: 'ui.common.myJobs', windowId: 'grimoire', tabId: 'jobs' },
	Alliance: { tooltip: 'ui.common.alliance', windowId: 'social', tabId: 'alliance' },
	Mount: { tooltip: 'ui.banner.mount', windowId: 'mount' },
	// Krosmaster: { tooltip: 'ui.krosmaster.krosmaster', action: xxx },
	Directory: { tooltip: 'ui.common.directory', windowId: 'social', tabId: 'directory' },
	Alignment: { tooltip: 'ui.common.alignment', windowId: 'grimoire', tabId: 'alignment' },
	Bestiary: { tooltip: 'ui.common.bestiary', windowId: 'grimoire', tabId: 'bestiary' },
	Title: { tooltip: 'ui.common.titles', windowId: 'grimoire', tabId: 'ornaments' },
	Achievement: { tooltip: 'ui.achievement.achievement', windowId: 'grimoire', tabId: 'achievements' },
	Almanax: { tooltip: 'ui.almanax.almanax', windowId: 'grimoire', tabId: 'almanax' },
	Spouse: { tooltip: 'ui.common.spouse', windowId: 'social', tabId: 'spouse' },
	Shop: { tooltip: 'ui.common.shop', action: toggleMyShop }
};

/** If you modify defaultOrder, please read the comment below about MENU_BAR_ORDER_ENTRY */
var defaultOrder = [
	'Carac', 'Spell', 'Bag', 'BidHouse', 'Map', 'Friend', 'Book', 'Guild', 'Conquest', 'Goultine', 'Job', 'Alliance',
	'Mount', 'Directory', 'Alignment', 'Bestiary', 'Title', 'Achievement', 'Almanax', 'Spouse', 'Shop'
];

/**
 * User preference entry name. We can add and update a version number to it when we need to "force-reset"
 * the icon order in the icon bar. E.g. menuBarOrder.1, menuBarOrder.2, etc.
 * If we don't force-reset, a new icon will be inserted in player's menu bar according to its position in
 * the defaultOrder list above, and icons after it will "shift" 1 rank to the right.
 * If we delete an icon, it will disappear from player's menus and icons after it will simply "shift" 1 rank
 * to the left.
 */
var MENU_BAR_ORDER_ENTRY = 'menuBarOrder';


/** @class */
function MenuBar() {
	MenuDrawer.call(this, { autoClose: true });
	this.addClassNames('MenuBar');

	this._sizeInIcons = -1;

	this._iconOrder = []; // saved to/loaded from user preferences
	this._plusIconList = []; // list of icons with plusIcon

	this._manualMode = false; // a mode where all enable and disable events are ignored

	this._createDom();
	this._listenToServerEvents();
	this._listenToInternalEvents();
}
inherits(MenuBar, MenuDrawer);
module.exports = MenuBar;


MenuBar.prototype._createDom = function () {
	this._iconsBox = this.content.createChild('div', { className: 'iconsBoxContainer' });
	this._icons = this.content.createChild('div', { className: 'iconsContainer' });

	var self = this;
	this._unlock = false;
	this._lockBtn = this.content.appendChild(new Button({ className: 'lockBtn', scaleOnPress: true }, function () {
		self._toggleIconsDrag(!self._unlock);
	}));

	for (var i = 0; i < defaultOrder.length; i++) {
		this._createIcon(i, defaultOrder[i]);
	}
};

/** Enable/disable an icon by name (default is set to unavailable)
 *  @param {string} iconName
 *  @param {boolean} [enabled=false]
 */
MenuBar.prototype.setIconAvailability = function (iconName, enabled) {
	if (enabled === undefined) {
		console.error(new Error('setIconAvailability: enabled param should not be undefined'));
		enabled = false;
	}

	var icon = this._icons.getChild(iconName);
	icon.toggleClassName('disabled', !enabled);
	//NB: isDisabled will disable the associated action of the button but WILL NOT disable the emit of the tap event
	icon.isDisabled = !enabled;
};

MenuBar.prototype.enableDragButton = function (enable) {
	this._lockBtn.setEnable(enable);
};

MenuBar.prototype._toggleIconsDrag = function (canDrag) {
	var icons = this._icons.getChildren();
	for (var i = 0, len = icons.length; i < len; i += 1) {
		dragManager.setDragEnable(icons[i], canDrag);
	}
	this._lockBtn.toggleClassName('on', !canDrag);
	this.toggleClassName('draggable', canDrag);
	this._unlock = canDrag;
};

/**
 * @private
 * @desc    Describe how this class should react to server events.
 */
MenuBar.prototype._listenToServerEvents = function () {
	var self = this;
	var gui = window.gui;

	gui.uiLocker.on('updated', function (options) {
		if (options.menuButtonId) {
			if (!iconDefinitions[options.menuButtonId]) {
				return console.error(new Error('Unknown button id `' + options.menuButtonId + '` in MenuBar.'));
			}
			self.setIconAvailability(options.menuButtonId, !options.locked);
			if (!options.locked) {
				var icon = self.getIcon(options.menuButtonId);
				if (icon) {
					var plusIconList = self._plusIconList;
					if (plusIconList.indexOf(options.menuButtonId) !== -1 && !icon.hasClassName('plusIcon')) {
						icon.addClassNames('plusIcon');
					}
				}
			}
		}
	});

	gui.tutorialManager.on('inTutorialStateChanged', function (inTutorial) {
		if (inTutorial) {
			self._manualMode = true;
			self._setButtonsOrder(defaultOrder);
			self.enableDragButton(false);
			gui.uiLocker.lockAllFeatures('tutorial');
			self._clearPlusIconsStyle();
			return;
		}
		if (self._manualMode) {
			// We just exited the tutorial
			self._setButtonsOrder(self._iconOrder); // if we were not in tutorial, order is already fine
		}
		self._manualMode = false;
		self.enableDragButton(true);
		self._showPlusIcons();
		gui.uiLocker.unlockAllFeatures('tutorial');
	});

	// do not show the plusIcon when in fight, show it again if fight end
	gui.fightManager.on('fightStart', function () {
		self._clearPlusIconsStyle();
	});

	gui.fightManager.on('fightEnd', function () {
		self._showPlusIcons();
	});

	function isInTutorialOrFight() {
		return gui.tutorialManager.inTutorial || gui.playerData.isFighting;
	}

	gui.playerData.characters.mainCharacter.on('newSpellLearned', function () {
		self._addPlusIcon('Spell', { doNotShow: isInTutorialOrFight() });
	});

	gui.playerData.on('characterLevelUp', function () {
		self._addPlusIcon('Carac', { doNotShow: isInTutorialOrFight() });
	});

	// windows are created before menuBar, this logic will be fine
	var grimoireWindow = windowsManager.getWindow('grimoire');
	grimoireWindow.tabs.on('openTab', function (tabId) {
		if (tabId === 'spells' && !isInTutorialOrFight()) {
			self._removePlusIcon('Spell');
		}
	});

	var characWindow = windowsManager.getWindow('characteristics');
	characWindow.on('open', function () {
		if (isInTutorialOrFight()) {
			return;
		}
		self._removePlusIcon('Carac', false);
	});
};

/**
 * @private
 * @desc    Describe how this class should react to events that fire internally.
 */
MenuBar.prototype._listenToInternalEvents = function () {
	var self = this;
	var gui = window.gui;

	gui.on('connected', function () {
		self._loadButtonOrderFromAccountPref();
		self._setButtonsOrder(self._iconOrder);
	});

	gui.on('disconnect', function () {
		self._manualMode = false;
		self._clearPlusIconsStyle();
		self._plusIconList = [];
	});

	this.on('close', function () {
		this._toggleIconsDrag(false);
	});
};

MenuBar.prototype._onDrop = function (targetIcon, draggedIcon) {
	if (targetIcon.id === draggedIcon.id) { return; }
	targetIcon.delClassNames('vibrate');

	var targetIndex = targetIcon.index;
	var dragIndex = draggedIcon.index;

	var self = this;
	tweener.tween(targetIcon, { webkitTransform: 'translate3d(' +
	(draggedIcon.x - targetIcon.x) + 'px,' +
	(draggedIcon.y - targetIcon.y) + 'px,0)'
	}, { time: 100, easing: 'ease-out' }, function () {
		self._positionIcon(targetIcon, dragIndex);
		self._iconOrder[targetIcon.index] = targetIcon.id;
		self._iconOrder[draggedIcon.index] = draggedIcon.id;
		userPref.setValue(MENU_BAR_ORDER_ENTRY, self._iconOrder);
		targetIcon.addClassNames('vibrate');
	});

	this._positionIcon(draggedIcon, targetIndex);
};

MenuBar.prototype._createIcon = function (index, id) {
	var self = this;

	this._iconsBox.createChild('div', { className: 'iconBox' });

	var definition = iconDefinitions[id];
	var icon = this._icons.appendChild(new Button(
		{
			className: ['vibrate', 'anim' + Math.floor(Math.random() * 9), 'menuIcon' + id, 'menuBarIcon'],
			tooltip: getText(definition.tooltip),
			name: id,
			scaleOnPress: true
		},
		function () {
			self.close();

			// send the kpi if it is the shop button
			if (id === 'Goultine') {
				//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
				analytics.log('HUD.Click_on_button', {
					interface_id: 'MenuBar',
					button_id: 'BTN_MENUBAR_SHOP',
					clic_parameter_key: 'position',
					clic_parameter_value: icon.index + 1,
					clic_type: 'Simple_court'
				});
				//jscs:enable requireCamelCaseOrUpperCaseIdentifiers
			}

			if (this.isDisabled) { // this is icon
				return;
			}

			if (definition.action) {
				definition.action();
			} else {
				toggleWindowOrTab(definition.windowId, definition.tabId);
			}
		}
	));

	icon.id = id;
	icon.index = index;

	dragManager.setDraggable(icon, null, 'menuBar', null, { dragElement: true, dragOnTouchstart: true });
	dragManager.setDroppable(icon, ['menuBar'], { matchPositionOnDrop: true });
	dragManager.disableDrag(icon);

	icon.on('drop', function (draggedIcon) {
		self._onDrop(this, draggedIcon);
	});

	icon.on('tooltipOn', function () {
		this.setStyle('webkitTransform', 'scale(1.1)');
	});

	icon.on('tooltipOut', function () {
		this.setStyle('webkitTransform', 'scale(1)');
	});
};

MenuBar.prototype.getIcon = function (name) {
	return this._icons.getChild(name);
};

// Called after a resize (the "shape" of the deployed icon bar rectangle might change - more or less rows/columns)
MenuBar.prototype._reorderButtons = function () {
	var icons = this._icons.getChildren();
	var iconBoxes = this._iconsBox.getChildren();
	for (var i = 0, len = icons.length; i < len; i += 1) {
		var icon = icons[i];
		this._positionIcon(icon, icon.index);
		this._positionIcon(iconBoxes[i], icon.index);
	}
};

MenuBar.prototype._setButtonsOrder = function (iconOrder) {
	for (var i = 0; i < iconOrder.length; i++) {
		var id = iconOrder[i];
		var icon = this._icons.getChild(id); // icon is never undefined here
		icon.index = i;
		this._positionIcon(icon, i);
	}
};

MenuBar.prototype._loadButtonOrderFromAccountPref = function () {
	this._iconOrder = userPref.getValue(MENU_BAR_ORDER_ENTRY, null);
	if (!this._iconOrder) {
		// We did not have the icon order => use the default one
		this._iconOrder = defaultOrder.concat();
	} else {
		// Insert any new icon in the current order
		for (var j = 0; j < defaultOrder.length; j++) {
			if (this._iconOrder.indexOf(defaultOrder[j]) === -1) {
				this._iconOrder.splice(j, 0, defaultOrder[j]);
			}
		}
	}
	// Look for which icons are enabled AND remove any deleted icon
	for (var i = 0; i < this._iconOrder.length; i++) {
		var id = this._iconOrder[i];
		var icon = this._icons.getChild(id);
		if (!icon) { // old icon ID still in our userPref - remove it
			this._iconOrder.splice(i, 1);
			i--; // we need to loop again on same "i"
			continue;
		}
		var shouldEnable = window.gui.uiLocker.isMenuButtonAvailable(id);
		this.setIconAvailability(id, shouldEnable);
	}
};

MenuBar.prototype._positionIcon = function (icon, index) {
	if (window.gui.ipadRatio) {
		icon.x = (ICON_SIZE + 1) * (index % this._iconsPerLine);
		icon.y = (ICON_SIZE + 2) * Math.floor(index / this._iconsPerLine);
	} else {
		icon.x = (ICON_SIZE + 4) * Math.floor(index / this._iconsPerColumn);
		icon.y = ICON_SIZE * (index % this._iconsPerColumn);
	}

	icon.index = index;
	icon.setStyles({
		left: icon.x + 'px',
		top: icon.y + 'px',
		webkitTransform: ''
	});
};

// Called by dimensionsHelper
MenuBar.prototype.computeMinimumSize = function (menuBarSizeInIcons, mode) {
	this._sizeInIcons = menuBarSizeInIcons;
	return menuBarSizeInIcons * ICON_SIZE + MARGIN[mode];
};

MenuBar.prototype._resize = function () {
	var mode = window.gui.ipadRatio ? 'narrow' : 'wide';

	var direction;
	if (window.gui.ipadRatio) {
		this._iconsPerLine = this._sizeInIcons;
		this._iconsPerColumn = Math.ceil(defaultOrder.length / this._iconsPerLine);

		this.setStyles({
			top: '',
			right: '',
			bottom: 0,
			left: dimensions.posMenuBar + 'px',
			width: dimensions.menuBarSize + 'px',
			height: dimensions.bottomBarHeight + 'px'
		});

		this._icons.setStyle('height', (ICON_SIZE * this._iconsPerColumn + LOCK_BTN_MARGIN[mode]) + 'px');
		this._icons.setStyle('width', (ICON_SIZE * this._iconsPerLine) + 'px');
		direction = 'top';
	} else {
		this._iconsPerColumn = this._sizeInIcons;
		this._iconsPerLine = Math.ceil(defaultOrder.length / this._iconsPerColumn);

		this.setStyles({
			bottom: '',
			left: '',
			top: dimensions.posMenuBar + 'px',
			right: 0,
			width: dimensions.sideBarWidth + 'px',
			height: dimensions.menuBarSize + 'px'
		});

		this._icons.setStyle('width', (ICON_SIZE * this._iconsPerLine + LOCK_BTN_MARGIN[mode]) + 'px');
		direction = 'left';
	}

	this._reorderButtons();
	this.setOpeningSide(direction);
};

MenuBar.prototype._addPlusIcon = function (iconName, options) {
	options = options || {};

	var icon = this.getIcon(iconName);
	if (!icon) { return; }

	if (!options.doNotShow && window.gui.uiLocker.isMenuButtonAvailable(iconName)) {
		icon.addClassNames('plusIcon');
	}

	var plusIconList = this._plusIconList;
	if (plusIconList.indexOf(iconName) === -1) {
		plusIconList.push(iconName);
	}
};

MenuBar.prototype._removePlusIcon = function (iconName) {
	var icon = this.getIcon(iconName);
	if (!icon) { return; }

	var plusIconList = this._plusIconList;
	var index = plusIconList.indexOf(iconName);
	if (index >= 0) {
		icon.delClassNames('plusIcon');
		plusIconList.splice(index, 1);
	}
};

MenuBar.prototype._clearPlusIconsStyle = function () {
	var icons = this._icons.getChildren();
	for (var i = 0; i < icons.length; i += 1) {
		var icon = icons[i];
		icon.delClassNames('plusIcon');
	}
};

MenuBar.prototype._showPlusIcons = function () {
	var plusIconList = this._plusIconList;
	for (var i = 0; i < plusIconList.length; i += 1) {
		var iconName = plusIconList[i];
		var icon = this.getIcon(iconName);
		icon.addClassNames('plusIcon');
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/MenuBar/index.js
 ** module id = 488
 ** module chunks = 0
 **/