require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var assetPreloading = require('assetPreloading');
var BidHouseShopWindow = require('BidHouseShopWindow');
var effectInstanceFactory = require('effectInstanceFactory');
var effectSorter = require('effectSorter');
var enableTooltip = require('TooltipBox').enableTooltip;
var getText = require('getText').getText;
var ItemDescription = require('ItemDescription');
var itemManager = require('itemManager');
var Item = itemManager.Item;
var ItemInstance = itemManager.ItemInstance;
var ProgressBar = require('ProgressBar');
var staticContent = require('staticContent');
var Table = require('Table');
var Tabs = require('Tabs');
var Button = require('Button');
var util = require('util');
var Scroller = require('Scroller');
var WuiDom = require('wuidom');
var windowsManager = require('windowsManager');
var MinMaxSelector = require('MinMaxSelector');
var tapBehavior = require('tapBehavior');

// const
var DURABILITY_EFFECT_ID = 812;
var TABLE_MIN_ROWS = 5;


//In all "BtnHandler" functions below, "this" is the corresponding button

function actionBtnHandler() {
	window.gui.openContextualMenuAround('item', this, {
		item: this.myWindow.itemInstance || this.myWindow.item,
		enableActions: true,
		enableSet: false,
		enableRecipe: false,
		enableInsertRecipe: true,
		enableSell: false,
		enableDestroy: false
	});
}

function bidHouseBtnHandler() {
	BidHouseShopWindow.openBidHouse(/*isSellMode=*/false, /*npcId=*/null, this.myWindow.itemId);
}

function bidHouseSellBtnHandler() {
	BidHouseShopWindow.openBidHouse(/*isSellMode=*/true, /*npcId=*/null, this.myWindow.itemInstance);
}

function recipeBtnHandler() {
	windowsManager.open('itemRecipes', { itemData: this.myWindow.item });
}

function destroyBtnHandler() {
	var self = this.myWindow;
	var item = self.itemInstance;

	if (item.quantity === 1) {
		window.gui.playerData.inventory.confirmDestroyItem(item, 1);
		return;
	}

	self._minMaxSelector.openAround(this, { min: 1, max: item.quantity });
}

function setBtnHandler() {
	windowsManager.open('itemSets', this.myWindow.itemInstance);
}


function ItemBox(options) {
	WuiDom.call(this, 'div', { className: 'ItemBox' });

	this.itemInstance = null;
	this.item = null;

	var self = this;

	options = options || {};
	this.showTitle = !!options.showTitle;
	this.showItemActions = options.hasOwnProperty('showItemActions') ? options.showItemActions : false;
	this.showDescription = options.hasOwnProperty('showDescription') ? options.showDescription : false;

	var itemTitle = this._itemTitle = this.createChild('div', { className: 'itemBox-title' });
	this._name = itemTitle.createChild('div', { className: 'itemBox-name' });
	this._level = itemTitle.createChild('div', { className: 'itemBox-level' });

	var infoContainer = this.createChild('div', { className: 'infoContainer' });
	var topLeftInfoContainer = infoContainer.createChild('div', { className: 'topLeftInfoContainer' });

	this.weight = topLeftInfoContainer.createChild('div', { className: 'weight' });
	this.twoHandedIcon = topLeftInfoContainer.createChild('div', { className: 'twoHandedIcon' });
	addTooltip(this.twoHandedIcon, getText('ui.common.twoHandsWeapon'));

	var itemContainer = topLeftInfoContainer.createChild('div', { className: 'itemContainer' });
	this.image = itemContainer.createChild('div', { className: 'itemImage' });
	this.etheralBar = itemContainer.appendChild(new ProgressBar({ className: ['etheralBar', 'red'] }));
	this.etheralBarDescription = new WuiDom('div');
	addTooltip(this.etheralBar, this.etheralBarDescription);
	this.tooltipItemDescription = new ItemDescription();
	addTooltip(this.image, this.tooltipItemDescription);

	tapBehavior(this.image);
	this.image.on('tap', function () {
		if (!self.item) {
			return;
		}
		window.gui.openContextualMenuAround('item', this, {
			item: self.item.getItemInstance() || self.item.getItem(),
			enableCertificate: true
		});
	});

	// TODO: itemContainer.on('tap', openBestiaryMenu);

	var tabs = [
		{ title: getText('ui.common.effects', 2), name: 'effects' },
		{ title: getText('ui.common.conditions'), name: 'conditions' },
		{ title: getText('ui.common.short.caracteristic'), name: 'characteristics' }
	];

	this.panelCollection = {};

	// Item info tabs
	this.topRightInfoContainer = infoContainer.createChild('div', { className: 'topRightInfoContainer' });
	this.itemInfoTabs = new Tabs();
	this.topRightInfoContainer.appendChild(this.itemInfoTabs);

	// Item info Panels container
	this.itemInfoPanels = this.topRightInfoContainer.createChild('div', { className: 'itemInfoPanels' });

	var tableParams = {
		colIds: ['info'],
		minRows: isNaN(options.minRows) ? TABLE_MIN_ROWS : options.minRows
	};

	for (var i = 0, len = tabs.length; i < len; i += 1) {
		var tab = tabs[i];

		this.panelCollection[tab.name] = this.itemInfoPanels.appendChild(new Table(tableParams));
		this.itemInfoTabs.addTab(tab.title, this.panelCollection[tab.name]);
	}

	// Item action buttons
	var itemActionContainer = this.itemActionContainer = this.createChild('div', { className: 'actionContainer' });
	var btn = this.actionBtn = itemActionContainer.appendChild(
		new Button({ text: getText('tablet.itemAction'), className: 'actionButton' }, actionBtnHandler));
	btn.myWindow = this;

	btn = this.bidHouseSellBtn = itemActionContainer.appendChild(
		new Button({ className: ['bidHouseSellButton', 'greenButton'], addIcon: true,
			tooltip: getText('tablet.itemSellInBidHouse') }, bidHouseSellBtnHandler));
	btn.myWindow = this;

	btn = this.setButton = itemActionContainer.appendChild(
		new Button({ className: 'setButton', tooltip: getText('ui.common.set') }, setBtnHandler));
	btn.myWindow = this;

	var recipeBtnParent = options.withCraftBtn ? this.image : itemActionContainer;
	btn = this.recipeButton = recipeBtnParent.appendChild(
		new Button({ className: 'recipeButton', tooltip: getText('ui.craft.associateReceipts') }, recipeBtnHandler));
	btn.myWindow = this;

	if (options.withBidHouseBtn) {
		btn = this.image.appendChild(
			new Button({ className: ['bidHouseButton', 'greenButton'], addIcon: true,
				tooltip: getText('tablet.itemSearchInBidHouse') }, bidHouseBtnHandler));
		btn.myWindow = this;
	}

	var minMaxSelector = this._minMaxSelector = window.gui.windowsContainer.appendChild(new MinMaxSelector());
	minMaxSelector.on('confirm', function (result) {
		window.gui.playerData.inventory.confirmDestroyItem(self.itemInstance, result);
	});

	btn = this.destroyButton = itemActionContainer.appendChild(
		new Button({ className: 'destroyButton', tooltip: getText('ui.common.destroyThisItem') }, destroyBtnHandler));
	btn.myWindow = this;

	// item description text
	this.itemDescriptionContainer = this.appendChild(new Scroller({ className: 'itemDescriptionContainer' }));
	this.categoryText = this.itemDescriptionContainer.content.createChild('div', { className: 'category' });
	this.descriptionText = this.itemDescriptionContainer.content.createChild('div', { className: 'description' });

	// Open the first tab
	this.itemInfoTabs.openTab(0);

	// events
	window.gui.playerData.inventory.on('itemModified', function (itemInstance) {
		// take reinitialized itemInstance which may have newly generate living object properties
		// NOTE: event only affects item box with itemInstances
		if (!self.itemInstance || self.itemInstance.objectUID !== itemInstance.objectUID) {
			return;
		}

		self.displayItem(itemInstance);
	});
}
util.inherits(ItemBox, WuiDom);


function addEffects(table, effectInstances) {
	if (!effectInstances) {
		return;
	}

	// adding effects to the display
	for (var i = 0; i < effectInstances.length; i += 1) {
		var effectInstance = effectInstances[i];
		var effect = effectInstance.effect;
		var description = effectInstance.description;
		var monsterCount = effectInstance.monsterCount;

		if (monsterCount) {
			description += monsterCount;
		}

		// add the effect description row
		var row = table.addRow([description]);

		// TODO: add specific className according to the effect
		/*if (exoticEffects[effect.id]) {
			row.addClassNames('exotic');
		} else */
		if (effect.bonusType === -1) {
			row.addClassNames('malus');
		} else if (effect.bonusType === 1) {
			row.addClassNames('bonus');
		}
	}
}

function addConditionRow(text, isMalus, table) {
	var row = table.addRow([text]);

	if (isMalus) {
		row.addClassNames('malus');
	}
}

function displayConditions(conditions, table) {
	for (var i = 0;	i < conditions.length; i++) {
		var condition = conditions[i];
		var conditionText = condition.text;
		if (typeof conditionText === 'string') {
			addConditionRow(conditionText, condition.isMalus, table);
		} else {
			for (var j = 0; j < conditionText.length; j++) {
				var subConditionText = conditionText[j];
				addConditionRow(subConditionText, condition.isMalus, table);
			}
		}
	}
}

function displayStats(stats, table) {
	for (var i = 0; i < stats.length; i++) {
		table.addRow([stats[i]]);
	}
}

/**
 * Toggle available actions for the specified item
 * @param {Object|null} item - an ItemInstance or an Item or null for a mount
 */
ItemBox.prototype._toggleItemActions = function (item) {
	if (!this.showItemActions) {
		this.itemActionContainer.hide();
	} else {
		var isItemInstance = !!(item && item.getItemInstance());
		this.actionBtn.setEnable(isItemInstance);
		this.bidHouseSellBtn.setEnable(!!item);

		if (item && item.getProperty('itemSetId') !== -1) {
			this.setButton.enable();
		} else {
			this.setButton.disable();
		}

		this.recipeButton.setEnable(!!item);
		this.destroyButton.setEnable(isItemInstance);
	}
};

ItemBox.prototype._canDisplayDescription = function () {
	return this.showDescription &&
		(this.showDescription !== 'auto' || this.itemDescriptionContainer.rootElement.clientHeight > 30);
};

ItemBox.prototype.displayMount = function (mountData, options) {
	options = options || {};
	this.item = null;
	this.itemInstance = null;

	this.showTitle = options.hasOwnProperty('showTitle') ? options.showTitle : this.showTitle;
	this.showDescription = options.hasOwnProperty('showDescription') ? options.showDescription : this.showDescription;

	this.weight.setText(getText('ui.common.short.weight', 0));
	this.twoHandedIcon.hide();
	this.etheralBar.hide();

	var self = this;
	assetPreloading.preloadImage('gfx/mounts/' + mountData.model + '.png', function (url) {
		self.image.setStyle('backgroundImage', url);
	});

	enableTooltip(this.image, false);

	this._toggleItemActions();

	if (this._canDisplayDescription()) {
		this.categoryText.setText(getText('ui.common.category') + getText('ui.common.colon') + getText('ui.common.ride'));

		var mountDescription = getText('ui.mount.description', mountData.name, mountData.level, mountData.xpRatio);
		this.descriptionText.setText(mountDescription);
		this.itemDescriptionContainer.show();
		this.itemDescriptionContainer.refresh();
	} else {
		this.itemDescriptionContainer.hide();
	}

	// display the title and the level of the item
	this._itemTitle.toggleDisplay(!!this.showTitle);
	if (this.showTitle) {
		staticContent.getData('Mounts', mountData.model, function (error, dbMount) {
			if (error) {
				return console.error(error);
			}
			self._name.setText(dbMount.nameId);
		});
		this._level.setText(getText('ui.common.short.level') + ' ' + mountData.level);
	}

	// display effects
	for (var tabName in this.panelCollection) {
		this.panelCollection[tabName].clearContent();
	}
	this.itemInfoTabs.toggleTabDisplay(2, false);
	effectInstanceFactory.createEffectInstances(mountData.effectList, function (error, effects) {
		if (error) {
			return console.error(error);
		}
		var sortedEffectInstances = effectSorter.sortEffects(effects);
		addEffects(self.panelCollection.effects, sortedEffectInstances);
	});

	// NOTE: mounts do not have conditions
};

/**
 * Fill the itemBox with the given item data
 * @param {Item|ItemInstance} item - an itemInstance or an item
 * @param {object} [options]
 * @param {boolean} [options.showTitle]
 * @param {boolean} [options.showDescription]
 */
ItemBox.prototype.displayItem = function (item, options) {
	if (!(item instanceof Item) && !(item instanceof ItemInstance)) {
		return console.error(new Error('ItemBox: item is not Item or ItemInstance'));
	}
	options = options || {};
	this.showTitle = options.hasOwnProperty('showTitle') ? options.showTitle : this.showTitle;
	this.showDescription = options.hasOwnProperty('showDescription') ? options.showDescription : this.showDescription;

	this.itemInstance = item.getItemInstance();
	this.item = item;

	this.itemId = item.getProperty('id');

	this.weight.setText(getText('ui.common.short.weight', item.getProperty('weight')));
	this.twoHandedIcon.toggleDisplay(!!item.getProperty('twoHanded'));

	this.image.setStyle('backgroundImage', item.getProperty('image'));

	enableTooltip(this.image, true);
	this.tooltipItemDescription.updateUI(item);

	this._toggleItemActions(item);

	if (this._canDisplayDescription()) {
		var categoryStr = itemManager.getItemTypeMap()[item.getProperty('typeId')].nameId;
		this.categoryText.setText(getText('ui.common.category') + getText('ui.common.colon') + categoryStr);
		this.descriptionText.setText(item.getProperty('descriptionId'));
		this.itemDescriptionContainer.show();
		this.itemDescriptionContainer.refresh();
	} else {
		this.itemDescriptionContainer.hide();
	}

	// display the title and the level of the item
	this._itemTitle.toggleDisplay(!!this.showTitle);
	if (this.showTitle) {
		this._name.setText(item.getProperty('nameId'));
		this._level.setText(getText('ui.common.short.level') + ' ' + item.getProperty('level'));
	}

	//TODO MIMICRY
	/*
	// Affichage du picto objet mimibioté
	if(_item.isMimicryObject)
		tx_mimicry.visible = true;
	else
		tx_mimicry.visible = false;
	*/

	// Tabs
	for (var tabName in this.panelCollection) {
		this.panelCollection[tabName].clearContent();
	}

	if (item.getProperty('hideEffects')) {
		this.panelCollection.effects.addRow([getText('ui.set.secretBonus')]);
	} else {
		var sortedEffectInstances = effectSorter.getSortedEffectInstances(item);
		addEffects(this.panelCollection.effects, sortedEffectInstances);
	}

	displayConditions(item.getProperty('conditionsFormatted'), this.panelCollection.conditions);
	displayConditions(item.getProperty('targetConditionsFormatted'), this.panelCollection.conditions);

	if (item.getProperty('isWeapon')) {
		displayStats(item.getProperty('statsFormatted'), this.panelCollection.characteristics);
		this.itemInfoTabs.toggleTabDisplay(2, true);
	} else {
		this.itemInfoTabs.toggleTabDisplay(2, false);
	}

	var shouldShowDurability = item.getProperty('etheral') && this.itemInstance;
	this.etheralBar.toggleDisplay(!!shouldShowDurability);
	if (shouldShowDurability) {
		var effect = this.itemInstance.effectsMap[DURABILITY_EFFECT_ID];
		var diceNum = effect.diceNum || 0;
		this.etheralBar.setValue(diceNum / effect.value);
		this.etheralBarDescription.setText(effect.description);
	}
};

module.exports = ItemBox;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ItemBox/index.js
 ** module id = 699
 ** module chunks = 0
 **/