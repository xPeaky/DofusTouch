require('./styles.less');
var inherits          = require('util').inherits;
var getText           = require('getText').getText;
var WuiDom            = require('wuidom');
var Button            = require('Button');
var CharacterDisplay  = require('CharacterDisplayWebGL');
var itemManager       = require('itemManager');
var ArticleBox        = require('../articleBox');
var ArticleButtons    = require('../articleButtons');
var DirectionsEnum    = require('DirectionsEnum');
var assetPreloading   = require('assetPreloading');
var Scroller          = require('Scroller');
var ItemSlot          = require('ItemSlot');
var windowsManager    = require('windowsManager');
var CurrencyCodesEnum = require('CurrencyCodesEnum');
var ItemDetailsBox    = require('./itemDetailsBox.js');
var effectSorter      = require('effectSorter');
var isEquippable      = require('itemManager').isEquippable;
var ActionIdConverter = require('ActionIdConverter');

//TODO: Some effects are missing in database for pets, such as "0 to 80 prospection"

var hiddenEffectIds = {};
//TODO: ACTION_LADDER_ID effect should be implemented once PetLadder database is available on the proxy
hiddenEffectIds[ActionIdConverter.ACTION_LADDER_ID] = true;
//TODO: ACTION_ITEM_CHANGE_PETS_LIFE has to be restored when pets life have been fixed in Items database
hiddenEffectIds[ActionIdConverter.ACTION_ITEM_CHANGE_PETS_LIFE] = true;
hiddenEffectIds[ActionIdConverter.ACTION_ITEM_PETS_SHAPE] = true;
hiddenEffectIds[ActionIdConverter.ACTION_ITEM_PETS_EAT] = true;
hiddenEffectIds[ActionIdConverter.ACTION_PETS_LAST_MEAL] = true;
hiddenEffectIds[ActionIdConverter.ACTION_ID_LIVING_OBJECT_MOOD] = true;
hiddenEffectIds[ActionIdConverter.ACTION_ID_LIVING_OBJECT_SKIN] = true;
hiddenEffectIds[ActionIdConverter.ACTION_ID_LIVING_OBJECT_CATEGORY] = true;
hiddenEffectIds[ActionIdConverter.ACTION_ID_LIVING_OBJECT_LEVEL] = true;
hiddenEffectIds[983/*Exchangeable date*/] = true;
hiddenEffectIds[984/*Creator owner*/] = true;
hiddenEffectIds[620/*Consult #3 (a book)*/] = true;


var ISLAND_ASSET_HEIGHT = 641;
var ISLAND_FEET_Y = 429;
var ISLAND_FEET_RATIO_Y = ISLAND_FEET_Y / ISLAND_ASSET_HEIGHT;
var CHARACTER_RENDERER_FEET_RATIO_Y = 0.85;
var SCALE_WIDTH_RATIO = 2 / 236;

function ItemDetailsView() {
	WuiDom.call(this, 'div', { className: 'itemDetailsView' });

	this._resetProperties();

	this._createDom();
}
inherits(ItemDetailsView, WuiDom);
module.exports = ItemDetailsView;

ItemDetailsView.prototype._resetProperties = function () {
	this._classSymbolImage = null;
	this._firstItemOfSet = null;
	this._articleId = null;
};

ItemDetailsView.prototype.clear = function () {
	this._resetProperties();

	this._articleBox.clear();
	this._characterDisplay.release();
};

ItemDetailsView.prototype._createDom = function () {
	var self = this;
	var backToCategory = this._backToCategory = new WuiDom('div', { className: 'goToPrevious' });
	var arrow = new Button({ className: 'arrow' }, function () {
		self.emit('goToPreviousView');
	});
	backToCategory.appendChild(arrow);
	this._backToCategoryText = backToCategory.createChild('div', { className: 'text' });

	this.promoBanner = this.createChild('div', { className: 'promoBanner' });

	var leftColumn = this.leftColumn = this.appendChild(new Scroller({ className: 'left' }));

	this.promoDescription = leftColumn.content.createChild('div', { className: 'promoDescription' });

	var topRow = leftColumn.content.createChild('div', { className: 'topRow' });

	// Trick to have an article box of ratio height/width of 1.08 without scripting
	var illuContainer = topRow.createChild('div', { className: 'illuContainer' });
	illuContainer.createChild('div', { className: 'dummy' });
	var illuElement = illuContainer.createChild('div', { className: 'illuElement' });
	this._articleBox = illuElement.appendChild(new ArticleBox());
	var nameAndDescription = topRow.createChild('div', { className: 'nameAndDescription' });
	this._name = nameAndDescription.createChild('div', { className: 'section' });
	this._description = nameAndDescription.createChild('div', { className: 'subSection' });
	this._weight = this._articleBox.createChild('div', { className: 'weight' });

	this._linkToItemSet = topRow.appendChild(new Button(
		{ className: 'setButton', scaleOnPress: true },
		function () {
			if (self._firstItemOfSet) {
				windowsManager.open('itemSets', self._firstItemOfSet);
			}
		}
	));

	var itemsListRow = this._itemsListRow = leftColumn.content.createChild('div', { className: 'itemsListRow' });

	itemsListRow.createChild('div', { className: 'section', text: getText('tablet.shop.comesWith').toUpperCase() });
	this._itemsList = itemsListRow.createChild('div', { className: 'subSection' });

	var leftItemDetails = leftColumn.content.createChild('div', { className: 'leftItemDetails' });
	this._effectsBox = leftItemDetails.appendChild(new ItemDetailsBox(getText('ui.common.effects', 2).toUpperCase()));

	var rightItemDetails = leftColumn.content.createChild('div', { className: 'rightItemDetails' });
	this._conditionsBox = rightItemDetails.appendChild(new ItemDetailsBox(getText('ui.common.conditions').toUpperCase()));
	this._characBox = rightItemDetails.appendChild(new ItemDetailsBox(getText('ui.common.caracteristics').toUpperCase()));

	var rightColumn = this.createChild('div', { className: 'right' });

	// Trick to have a character canvas of ratio height/width of 1.34 without scripting
	var charaContainer = rightColumn.createChild('div', { className: 'charaContainer' });
	charaContainer.createChild('div', { className: 'dummy' });
	var charaElement = charaContainer.createChild('div', { className: 'charaElement' });
	var characterOnIsland = charaElement.createChild('div', { className: 'characterOnIsland' });
	this._characterOnIsland = characterOnIsland;
	var islandImage = characterOnIsland.createChild('div', { className: 'islandImage' });
	this._islandImage = islandImage;
	this._characterDisplay = characterOnIsland.appendChild(new CharacterDisplay());

	function purchaseIAPItem() {
		self.emit('purchaseIAP', self._articleId);
	}
	function purchaseItemWithHard() {
		self.emit('purchaseOnAnkama', self._articleId, CurrencyCodesEnum.GOULTINE);
	}
	function purchaseItemWithSoft() {
		self.emit('purchaseOnAnkama', self._articleId, CurrencyCodesEnum.KAMA);
	}

	var articleButtons = this._articleButtons = rightColumn.appendChild(new ArticleButtons());
	articleButtons.on('tapIAPButton', purchaseIAPItem);
	articleButtons.on('tapHardButton', purchaseItemWithHard);
	articleButtons.on('tapSoftButton', purchaseItemWithSoft);
};

ItemDetailsView.prototype.resize = function (/*viewContainer*/) {
	var characterDisplayRect = this._characterDisplay.rootElement.getBoundingClientRect();

	// Position the character display to be on the island
	var yIslandFeet = ISLAND_FEET_RATIO_Y * characterDisplayRect.height;
	var yCharacterFeet = CHARACTER_RENDERER_FEET_RATIO_Y * characterDisplayRect.height;
	this._characterDisplay.setStyle('top', (yIslandFeet - yCharacterFeet) + 'px');

	// Rescale the character display
	var scale = SCALE_WIDTH_RATIO * characterDisplayRect.width;
	this._characterDisplay.setScale(scale);

	this.leftColumn.refresh();
};

ItemDetailsView.prototype._displayConditions = function (conditions) {
	for (var i = 0;	i < conditions.length; i++) {
		var condition = conditions[i];
		var conditionText = condition.text;
		var classNames = condition.isMalus ? ['malus'] : [];
		if (typeof conditionText === 'string') {
			this._conditionsBox.addRow(conditionText, classNames);
		} else {
			for (var j = 0; j < conditionText.length; j++) {
				this._conditionsBox.addRow(conditionText[j], classNames);
			}
		}
	}
};

ItemDetailsView.prototype._displayOneItem = function (item) {
	// There is only one item, display its characteristics directly

	this._itemsListRow.hide();

	// Assume it's not an item set as there is only one item
	this._linkToItemSet.hide();

	var weightText = getText('ui.common.short.weight', item.getProperty('realWeight'));
	this._weight.setText(getText('ui.common.weight') + getText('ui.common.colon') + weightText);

	var i;

	this._effectsBox.clearContent();
	this._effectsBox.show();
	if (item.hideEffects) {
		this._effectsBox.addRow(getText('ui.set.secretBonus'));
	} else {
		var sortedEffectInstances = effectSorter.getSortedEffectInstances(item);
		if (sortedEffectInstances && sortedEffectInstances.length) {
			for (i = 0; i < sortedEffectInstances.length; i++) {
				var effectInstance = sortedEffectInstances[i];
				if (hiddenEffectIds[effectInstance.effectId]) {
					continue;
				}
				if (effectInstance.description === '') {
					console.error('Effect ' + effectInstance.effectId + ' not supported for item ' + item.getProperty('id'));
					continue;
				}
				var bonusType = effectInstance.effect.bonusType;
				var classNames = [];
				if (bonusType === -1) {
					classNames.push('malus');
				} else if (bonusType === 1) {
					classNames.push('bonus');
				}
				this._effectsBox.addRow(effectInstance.description, classNames);
			}
		}
		if (!this._effectsBox.hasRow()) {
			this._effectsBox.addRow(getText('tablet.common.none', 0), ['placeholder']);
		}
	}

	this._conditionsBox.clearContent();
	this._conditionsBox.show();
	var conditions = item.getProperty('conditionsFormatted');
	var targetConditions = item.getProperty('targetConditionsFormatted');
	if (conditions.length === 0 && targetConditions.length === 0) {
		this._conditionsBox.addRow(getText('tablet.common.none', 1), ['placeholder']);
	} else {
		this._displayConditions(conditions);
		this._displayConditions(targetConditions);
	}

	this._characBox.clearContent();
	if (item.getProperty('isWeapon')) {
		this._characBox.show();
		var stats = item.getProperty('statsFormatted');
		if (stats.length === 0) {
			this._characBox.addRow(getText('tablet.common.none', 1), ['placeholder']);
		} else {
			for (i = 0; i < stats.length; i++) {
				this._characBox.addRow(stats[i]);
			}
		}
	} else {
		this._characBox.hide();
	}

	this.leftColumn.refresh();
};

ItemDetailsView.prototype._displayMultipleItems = function (items) {
	// There is multiple items, display a list of these items

	this._itemsListRow.show();
	this._effectsBox.hide();
	this._conditionsBox.hide();
	this._characBox.hide();

	var realWeight = 0;
	var item;

	this._itemsList.clearContent();
	function openItemBoxWindowFromItemSlot() {
		windowsManager.open('itemBox', { itemData: this.data });
	}
	for (var i = 0; i < items.length; i++) {
		// TODO: quantity
		item = items[i];
		realWeight += item.getProperty('realWeight');
		var itemSlot = new ItemSlot({ itemData: item });
		itemSlot.on('tap', openItemBoxWindowFromItemSlot);
		this._itemsList.appendChild(itemSlot);
	}

	var weightText = getText('ui.common.short.weight', realWeight);
	this._weight.setText(getText('ui.common.weight') + getText('ui.common.colon') + weightText);

	// Assume it's an item set if the first item is part of an item set
	item = items[0];
	var itemSetId = item.itemSetId;
	if (itemSetId && itemSetId !== -1) {
		this._firstItemOfSet = item;
		this._linkToItemSet.show();
	} else {
		this._firstItemOfSet = null;
		this._linkToItemSet.hide();
	}

	this.leftColumn.refresh();
};

function getDefaultLook() {
	return window.gui.playerData.characterBaseInformations.entityLook;
}

ItemDetailsView.prototype.update = function (viewData) {
	this.emit('showSubCategoryRow', this._backToCategory);

	if (!viewData) {
		return;
	}

	this._itemsListRow.hide();
	this._effectsBox.hide();
	this._conditionsBox.hide();
	this._characBox.hide();

	this._backToCategoryText.setText(getText('tablet.shop.backTo', viewData.categoryName));

	var article = viewData.article;
	this._articleId = article.id;

	this._name.setText(article.name.toUpperCase());
	this._description.setHtml(article.description);
	this._articleBox.update(article);
	this._articleButtons.update(article);

	// Set character renderer background image accordingly to player's breed
	this._setClassSymbol();
	// Character previsualisation loading state
	this._characterDisplay.hide();
	this._islandImage.addClassNames('spinner');

	var nbPromos = article.promo && article.promo.length;
	var promoRate = article._promoRate;
	// TODO: Refactor with a helper for Article, or create an Article component
	if (nbPromos || promoRate || article.enddate) {
		this.leftColumn.addClassNames('promo');
		this.promoBanner.show();
		this.promoDescription.toggleDisplay(!!nbPromos);

		var promoBannerText;
		var endDate;
		if (!nbPromos && !promoRate && article.enddate) {
			// If there is only an end date, it's a temporary item
			endDate = new Date(article.enddate);
			// TODO: Find better way to localize date?
			promoBannerText = getText('tablet.common.available', getText('tablet.common.until', endDate.toLocaleDateString()));
		} else if (promoRate || article.enddate) {
			promoBannerText = getText('tablet.shop.offer') + getText('ui.common.colon');
			if (promoRate) {
				promoBannerText += promoRate;
			}
			if (article.enddate) {
				if (promoRate) {
					promoBannerText += ' ';
				}
				endDate = new Date(article.enddate);
				// TODO: Find better way to localize date?
				promoBannerText += getText('tablet.common.until', endDate.toLocaleDateString());
			}
		} else {
			promoBannerText = getText('tablet.shop.offer');
		}
		this.promoBanner.setText(promoBannerText);

		if (nbPromos) {
			var promos = article.promo;
			var promoText = '';
			var colonText = getText('ui.common.colon');
			for (var i = 0; i < nbPromos - 1; i++) {
				promoText += promos[i].name + colonText + promos[i].description + '<br /><br />';
			}
			promoText += promos[nbPromos - 1].name + colonText + promos[nbPromos - 1].description;
			this.promoDescription.setHtml(promoText);
		}
	} else {
		this.leftColumn.delClassNames('promo');
		this.promoBanner.hide();
		this.promoDescription.hide();
	}

	var self = this;
	var itemsId = article.itemsId;
	itemManager.getItems(itemsId, function (error, items) {
		if (error) {
			return console.error(error);
		}
		var nbItems = items.length;
		if (itemsId.length !== nbItems) {
			return console.error(new Error('Some items are missing, ids requested: ' + itemsId + ', items get: ' + items));
		}

		if (nbItems) {
			if (nbItems === 1) {
				self._displayOneItem(items[0]);
			} else {
				self._displayMultipleItems(items);
			}
		}

		var equippableItemsId = [];
		for (var i = 0; i < nbItems; i++) {
			var item = items[i];
			if (isEquippable(item.type.superTypeId)) {
				equippableItemsId.push(item.getProperty('id'));
			}
		}
		if (equippableItemsId.length) {
			self.emit('requestPrevisualization', equippableItemsId);
		} else {
			// No equippable items, no previsualization
			self.setLook(getDefaultLook());
		}
	});
};

ItemDetailsView.prototype.setLook = function (look) {
	look = look || getDefaultLook();

	var self = this;
	this._characterDisplay.setLook(look, {
		riderOnly: true,
		boneType: 'characters/',
		skinType: 'characters/',
		direction: DirectionsEnum.DIRECTION_SOUTH_WEST,
		keepDirection: false,
		keepModels: true
	}, function () {
		self._islandImage.delClassNames('spinner');
		self._characterDisplay.show();
	});
};

ItemDetailsView.prototype.updateArticlesPrices = function (articlesMap) {
	var articleBox = this._articleBox;
	var articleButtons = this._articleButtons;
	var article;
	var articleId = articleBox.articleId;
	if (articleId) {
		article = articlesMap[articleId];
		if (article) {
			articleBox.updatePrice(article);
		} else {
			console.error(new Error('Article ' + articleId + ' missing for an ArticleBox'));
		}
	}
	articleId = articleButtons.articleId;
	if (articleId) {
		article = articlesMap[articleId];
		if (article) {
			articleButtons.update(article);
		} else {
			console.error(new Error('Article ' + articleId + ' missing for an ArticleButtons'));
		}
	}
};

ItemDetailsView.prototype._setClassSymbol = function () {
	if (this._classSymbolImage) {
		return;
	}
	var self = this;
	var characterBaseInformations = window.gui.playerData.characterBaseInformations;
	assetPreloading.preloadImage(
		'gfx/illusUi/symboles_classe/FichePerso_tx_symboleClasse_frame' +
		(characterBaseInformations.breed - 1) +
		'.png',
		function (image) {
			self._classSymbolImage = image;
			self._characterOnIsland.setStyle('backgroundImage', image);
		}
	);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/ShopWindow/itemDetailsView/index.js
 ** module id = 970
 ** module chunks = 0
 **/