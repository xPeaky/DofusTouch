var BidHouseShopWindow = require('BidHouseShopWindow');
var dragManager = require('dragManager');
var inherits = require('util').inherits;
var isEquippable = require('itemManager').isEquippable;
var isEquipped = require('itemManager').isEquipped;
//var itemCategories = require('itemManager').categories; TODO uncomment for krosMaster
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;
var MinMaxSelector = require('MinMaxSelector');
var windowsManager = require('windowsManager');
var GameContextEnum = require('GameContextEnum');

// const
var ITEM_TYPEID_MOUNT_CERTIFICATE = 97;
var ICON_SIZE = 40;

// class
function ContextualMenuItem() {
	ContextualMenu.call(this);

	var entries = {};
	var iconUI = {};
	var onClose;

	this.once('open', function () {
		this._setupDom(entries, iconUI);
	});

	this.on('open', function (params, contentReady) {
		this._params = params;
		var item = this._item = params.item; // item data

		this._action = null;
		onClose = params.onClose;

		var itemInstance = item.objectUID ? item : null;
		var dbItem = this._dbItem = itemInstance ? itemInstance.item : item;
		this.header.setText(dbItem.nameId || (dbItem.mountLocation ? getText('ui.common.ride') : ''));

		iconUI.backgroundImage = dbItem.image;

		// TODO uncomment for krosMaster
		// entries.krosMaster.toggleDisplay(dbItem.type.category === itemCategories.consumables && dbItem.type.id === 157):

		// toggle menu entries based on item data then on options
		for (var id in entries) {
			entries[id].hide();
		}

		var isInTutorial = window.gui.tutorialManager.inTutorial;
		var isSetEnabled = params.hasOwnProperty('enableSet') ? params.enableSet : true;
		var isRecipeEnabled = params.hasOwnProperty('enableRecipe') ? params.enableRecipe : true;
		var isInsertRecipeEnabled = params.hasOwnProperty('enableInsertRecipe') ? params.enableInsertRecipe : true;
		var isDestroyEnabled = params.hasOwnProperty('enableDestroy') ? params.enableDestroy : true;
		var isSellEnabled = params.hasOwnProperty('enableSell') ? params.enableSell : false;
		var isCertificateEnabled = params.hasOwnProperty('enableCertificate') ? params.enableCertificate : true;

		var canShowRecipes = !!dbItem && !isInTutorial && !dbItem.mountLocation;
		// should be itemInstance to show certif
		var canShowMountCertif = !!item.getItemInstance() && item.getItem().typeId === ITEM_TYPEID_MOUNT_CERTIFICATE;

		entries.itemSet.toggleDisplay(!!dbItem.itemSetId && dbItem.itemSetId !== -1 && !isInTutorial && isSetEnabled);
		entries.recipes.toggleDisplay(isRecipeEnabled && canShowRecipes);
		entries.insertRecipe.toggleDisplay(isInsertRecipeEnabled && canShowRecipes);
		entries.findInBestiary.toggleDisplay(!!item.getProperty('dropMonsterIds').length);
		entries.bidHouseSell.toggleDisplay(!!itemInstance && isSellEnabled);
		entries.dismount.toggleDisplay(dbItem.mountLocation === 'equip');
		entries.remove.toggleDisplay(!!params.remove && !isInTutorial);
		entries.mount.toggleDisplay(isCertificateEnabled && canShowMountCertif);

		if (itemInstance && params.enableActions) {
			var isInModeFight = window.gui.gameContext === GameContextEnum.FIGHT;
			var showEquip = isEquippable(dbItem.type && dbItem.type.superTypeId) && !isEquipped(item.position);

			entries.feed.toggleDisplay(!!dbItem.isPet && !isInTutorial);
			entries.multiUse.toggleDisplay(!!dbItem.usable && item.quantity > 1 && !!item.isOkForMultiUse && !isInTutorial);
			entries.use.toggleDisplay(!!dbItem.usable);
			entries.target.toggleDisplay(!isInModeFight && !!dbItem.targetable && !dbItem.nonUsableOnAnother && !isInTutorial);
			entries.equip.toggleDisplay(showEquip);
			entries.unequip.toggleDisplay(isEquipped(item.position));
			entries.mount.toggleDisplay(canShowMountCertif);
			entries.destroy.toggleDisplay(item.quantity > 0  && !isInTutorial && isDestroyEnabled);
			entries.manage.toggleDisplay(!!item.livingObjectCategory && !isInTutorial);
		}

		contentReady();
	});

	this.on('close', function () {
		if (onClose) { onClose(this._action); }
	});
}

inherits(ContextualMenuItem, ContextualMenu);
module.exports = ContextualMenuItem;

// private
ContextualMenuItem.prototype._setupDom = function (entries, iconUI) {
	var self = this;
	var inventory = window.gui.playerData.inventory;

	var minMaxSelector = this._minMaxSelector = window.gui.windowsContainer.appendChild(new MinMaxSelector());
	var minMaxMode;

	function openMinMaxBox(mode, min, max) {
		minMaxMode = mode;
		minMaxSelector.open({
			min: min,
			max: max,
			x: self._position.x,
			y: self._position.y
		});
	}

	// TODO uncomment for krosMaster
	// entries.krosMaster = this._addEntry(getText('ui.krosmaster.collection'), krosMaster);

	// EQUIP ITEM
	entries.equip = this._addEntry(getText('ui.common.equip'), function () {
		inventory.equipItem(self._item.objectUID);
	});
	entries.unequip = this._addEntry(getText('tablet.common.unequip'), function () {
		inventory.unEquipItem(self._item.objectUID);
	});

	// USE ITEM ON TARGET
	var target = entries.target = this._addEntry(getText('ui.common.target'), function () {
		return window.gui.openSimplePopup(getText('tablet.ui.item.targetInfo'));
	});
	dragManager.setDraggable(
		target,
		iconUI,
		'itemContextMenu',
		null,
		{ containerWidth: ICON_SIZE, containerHeight: ICON_SIZE }
	);
	target.on('dragStart', function () {
		this.item = self._item;
		windowsManager.closeAll();
		self.close();
	});

	// USE ITEM
	entries.feed = this._addEntry(getText('ui.common.feed'), function () {
		var item = self._item.item;

		var feedWindow = windowsManager.getWindow('feed');
		if (!feedWindow.possessFeedItemForPet(self._item)) {
			return window.gui.openSimplePopup(getText('ui.item.errorNoFoodLivingItem', item.nameId));
		}

		windowsManager.open('feed', { mode: 'pet', item: self._item });
	});

	// USE ITEM
	entries.use = this._addEntry(getText('ui.common.use'), function () {
		var itemInstance = self._item;
		if (!itemInstance.item.type.needUseConfirm) {
			window.dofus.sendMessage('ObjectUseMessage', { objectUID: itemInstance.objectUID });
			return;
		}

		window.gui.openConfirmPopup({
			title: getText('ui.common.confirm'),
			message: getText('ui.common.confirmationUseItem', itemInstance.item.nameId),
			cb: function (result) {
				if (!result) {
					return;
				}

				window.dofus.sendMessage('ObjectUseMessage', { objectUID: itemInstance.objectUID });
			}
		});
	});

	// MULTIPLE USE
	entries.multiUse = this._addEntry(getText('ui.common.multipleUse'), function () {
		openMinMaxBox('use', 1, self._item.quantity);
	});

	// RECIPES
	entries.recipes = this._addEntry(getText('ui.craft.associateReceipts'), function () {
		windowsManager.open('itemRecipes', { itemData: self._item || self._dbItem });
	});
	entries.insertRecipe = this._addEntry(getText('ui.craft.displayChatRecipe'), function () {
		window.gui.chat.insertLink('recipe', self._item);
	});

	entries.findInBestiary = this._addEntry(getText('ui.common.bestiary'), function () {
		var nameId = self._item.getRawName();
		windowsManager.open('grimoire', { tabId: 'bestiary', tabParams: { search: nameId } });
	});

	entries.bidHouseSell = this._addEntry(getText('tablet.itemSellInBidHouse'), function () {
		BidHouseShopWindow.openBidHouse(/*isSellMode=*/true, /*npcId=*/null, self._item);
	});

	// ITEM SET
	entries.itemSet = this._addEntry(getText('ui.common.set'), function () {
		windowsManager.open('itemSets', self._item);
	});

	// LIVING OBJECT
	entries.manage = this._addEntry(getText('ui.item.manageItem'), function () {
		windowsManager.open('itemManage', { itemInstance: self._item });
	});

	// MOUNT
	entries.mount = this._addEntry(getText('ui.mount.viewMountDetails'), function () {
		windowsManager.getWindow('mount').showCertificateMount(self._item);
	});

	entries.dismount = this._addEntry(getText('ui.shortcuts.toggleRide'), function () {
		// only mounts
		window.dofus.sendMessage('MountToggleRidingRequestMessage');
	});
	// DESTROY ITEM
	entries.destroy = this._addEntry(getText('ui.common.destroyThisItem'), function () {
		var item = self._item;

		if (item.quantity === 1) {
			window.gui.playerData.inventory.confirmDestroyItem(item, 1);
			return;
		}

		openMinMaxBox('destroy', 1, item.quantity);
	});

	entries.remove = this._addEntry(getText('ui.common.remove'), function () {
		self._action = 'remove';
	});

	minMaxSelector.on('confirm', function (result) {
		var item = self._item;

		switch (minMaxMode) {
		case 'use':
			window.dofus.sendMessage('ObjectUseMultipleMessage', { objectUID: item.objectUID, quantity: result });
			break;
		case 'destroy':
			window.gui.playerData.inventory.confirmDestroyItem(item, result);
			break;
		default:
			console.warn('[ContextualMenuItem] unknow mode.');
		}
	});

	this._addCancel();
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuItem/index.js
 ** module id = 309
 ** module chunks = 0
 **/