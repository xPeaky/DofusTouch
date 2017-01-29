require('./styles.less');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var ItemBox = require('ItemBox');
var itemManager = require('itemManager');
var RecipeBox = require('RecipeBox');
var RecipeList = require('RecipeList');
var staticContent = require('staticContent');
var Window = require('Window');
var Button = require('Button');


function ItemRecipesWindow() {
	Window.call(this, {
		className: 'ItemRecipesWindow',
		positionInfo: { left: 'c', top: 'c', width: 800, height: 525 }
	});

	this.dbItemId = null;
	this.itemBox = null;
	this.itemHistory = [];

	this.on('open', this._onOpen);
	this.on('close', this._onClose);
}
inherits(ItemRecipesWindow, Window);
module.exports = ItemRecipesWindow;


ItemRecipesWindow.prototype._onOpen = function (params) {
	if (!this.itemBox) { this._createContent(); }

	var dbItem = params.itemData && params.itemData.item ? params.itemData.item : params.itemData;
	this._displayNextItem(dbItem);
};

ItemRecipesWindow.prototype._onClose = function () {
	this.dbItemId = null;
	this.itemHistory = [];

	this.windowBody.clearContent();
	this.itemBox = null;
	this.itemRecipeBox = null;
	this.recipeList = null;

	this.windowHeadWrapper.removeChild(this.backButton);
	this.backButton = null;
};

ItemRecipesWindow.prototype._displayNextItem = function (dbItem) {
	// We filter attempts to "reload" the current item here
	if (dbItem.id === this.dbItemId) { return; }

	this.itemHistory.push(dbItem.id);
	this._displayItem(dbItem);
};

function itemTapHandler(dbItem) {
	this.myWindow._displayNextItem(dbItem);
}

function backBtnHandler() {
	var self = this.myWindow;

	self.itemHistory.pop();
	var dbItem = itemManager.items[self.itemHistory[self.itemHistory.length - 1]];
	self._displayItem(dbItem);
}

ItemRecipesWindow.prototype._createContent = function () {
	// <<< left
	var leftCol = this.windowBody.createChild('div', { className: 'leftCol' });

	// item box
	this.itemBox = new ItemBox({ showDescription: true, showTitle: true, withBidHouseBtn: true });
	leftCol.appendChild(this.itemBox);

	// this item's recipe
	this.itemRecipeBox = leftCol.createChild('div', { className: 'itemRecipeBox' });
	this.itemRecipeBox.createChild('div', { className: 'title', name: 'title' });
	this.itemRecipeBox.on('itemTapped', itemTapHandler);
	this.itemRecipeBox.myWindow = this;

	// >>> right
	var rightCol = this.windowBody.createChild('div', { className: 'rightCol' });

	// recipe list
	this.recipeList = new RecipeList();
	this.recipeList.on('itemTapped', itemTapHandler);
	this.recipeList.myWindow = this;
	rightCol.appendChild(this.recipeList);

	// back button
	var btn = this.backButton = new Button({ className: 'backButton' }, backBtnHandler);
	btn.insertBefore(this.windowTitle);
	btn.myWindow = this;
};

ItemRecipesWindow.prototype._displayItem = function (dbItem) {
	this.dbItemId = dbItem.id;

	var self = this;

	this.windowTitle.setText(dbItem.nameId);

	// item history
	this.backButton.toggleDisplay(this.itemHistory.length > 1);

	// item box
	this.itemBox.displayItem(dbItem);

	// this item's recipe & recipe list
	var recipeIds = [dbItem.id].concat(dbItem.recipeIds); // [this item] + [recipe items]
	staticContent.getDataMap('Recipes', recipeIds, function (error, recipeMap) {
		if (error) {
			return console.error(error);
		}

		var thisItemRecipe = recipeMap[recipeIds[0]];

		// We need the recipes using this item back into an array
		var recipesUsingItem = [];
		for (var i = 1; i < recipeIds.length; i++) {
			var recipe = recipeMap[recipeIds[i]];
			if (recipe) { recipesUsingItem.push(recipe); }
		}

		if (self.recipeBox) {
			self.recipeBox.destroy();
		}
		var isSecret = !dbItem.getProperty('secretRecipe'); // DB has reversed flag: false when no recipe means SECRET
		self.itemRecipeBox.toggleClassName('empty', (!thisItemRecipe || isSecret));

		if (thisItemRecipe) {
			self.itemRecipeBox.getChild('title').setText(getText('ui.item.utilityReceipt'));
			self.recipeBox = new RecipeBox(thisItemRecipe, { isMain: true });
			self.recipeBox.on('itemTapped', itemTapHandler);
			self.recipeBox.myWindow = self;
			self.recipeBox.setupRecipe(function () {
				self.itemRecipeBox.appendChild(self.recipeBox);
			});
		} else if (isSecret) {
			self.itemRecipeBox.getChild('title').setText(getText('ui.item.secretReceipt'));
		} else {
			self.itemRecipeBox.getChild('title').setText(getText('ui.item.utilityNoReceipt'));
		}

		// recipe list
		self.recipeList.recipesWrapper.addClassNames('spinner');
		self.recipeList.addRecipes(recipesUsingItem, function () {
			self.recipeList.recipesWrapper.delClassNames('spinner');
		});
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ItemRecipesWindow/index.js
 ** module id = 782
 ** module chunks = 0
 **/