require('./styles.less');
var getText = require('getText').getText;
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Button = require('Button');

// Temporary solution : dot not re-use
// TODO: we should read "non diacritic text" from the server
// TODO: copy ankama code noAccent function
var simplifyString = require('helper').simplifyString;

var xpPerNbIngredients = {
	1: 1,
	2: 10,
	3: 25,
	4: 50,
	5: 100,
	6: 250,
	7: 500,
	8: 1000
};

/**
 * @param {object} recipe
 * @param {object} options
 * @param {boolean} [options.isMain] - true for recipe which "creates" the item displayed (not one in the RecipeList)
 * @param {number} [options.nbCases] - max number of slots currently available to the crafter
 * @constructor
 */
function RecipeBox(recipe, options) {
	var self = this;
	WuiDom.call(this, 'div', { className: 'RecipeBox', name: recipe.resultId });

	options = options || {};

	this.rawRecipe = recipe;
	this.isMain = options.isMain;
	this.nbCases = options.nbCases || 0;

	var recipeTitle = self.createChild('div', { className: 'recipeTitle' });
	this._item = recipeTitle.appendChild(new ItemSlot());

	this._recipeLeft = recipeTitle.createChild('div', { className: 'recipeLeft' });
	this._recipeLeft.createChild('div', { className: 'recipeName', text: recipe.resultNameId });

	var recipeRight = recipeTitle.createChild('div', { className: 'recipeRight' });
	recipeRight.createChild('div', {
		className: 'recipeLevel',
		text: getText('ui.common.short.level') + ' ' + recipe.resultLevel
	});
	var nbIngredients = recipe.ingredientIds.length;

	// check if recipe is too easy for the current job level (logic from Flash JobRecipeItem.as)
	var isTooEasy = (options.nbCases - nbIngredients >= 4);
	var xp = isTooEasy ? 0 : xpPerNbIngredients[nbIngredients];

	var recipeXP = recipeRight.createChild('div', {
		className: 'recipeXP',
		text: getText('ui.tooltip.monsterXpAlone', xp)
	});
	if (isTooEasy) {
		recipeXP.addClassNames('warningText');
	}

	this._ingredientsList = self.createChild('div', { className: 'ingredientsList' });

	// add craftButton

	this.craftButton = this._ingredientsList.appendChild(new Button({
		className: 'recipeButton',
		scaleOnPress: true
	}));
	this.craftButton.on('tap', function () {
		self.emit('craftButtonTapped');
	});
}

inherits(RecipeBox, WuiDom);
module.exports = RecipeBox;

RecipeBox.prototype.setupRecipe = function (cb) {
	var self = this;
	var recipe = this.rawRecipe;
	var inventory = window.gui.playerData.inventory;

	var recipeId = recipe.resultId;
	var recipeIdAndIngredientIds = [recipeId].concat(recipe.ingredientIds);
	var nbIngredients = recipe.ingredientIds.length;


	function emitTapped() {
		self.emit('itemTapped', this.dbItem);
	}

	itemManager.getItems(recipeIdAndIngredientIds, function (error) {
		if (error) {
			console.error(error);
			return cb(error);
		}
		var result = itemManager.items[recipeId];
		if (!result) {
			// ignore the error recipe can be missing from the ankama's DB
			return cb();
		}
		self._item.setItem(result);
		self._item.on('tap', emitTapped);

		self._recipeLeft.createChild('div', { className: 'recipeSkillName', text: result.nameId });

		var searchString = result.nameId;

		var quantityList = {};

		for (var i = 0; i < nbIngredients; i += 1) {
			var ingredient = itemManager.items[recipe.ingredientIds[i]];
			if (!ingredient) {
				continue;
			}
			searchString += ' ' + ingredient.nameId;
			var qty = recipe.quantities[i];
			var qtyClassname = null;
			if (self.isMain) {
				var qtyAvail = inventory.getGenericItemCount(ingredient.id);
				qtyClassname = qtyAvail >= qty ? 'quantityGood' : 'quantityNoGood';
				qty = qtyAvail + '/' + qty;
			}

			var itemSlot = new ItemSlot({
				itemData: ingredient,
				quantity: qty,
				forceQuantity: true
			});
			if (qtyClassname) { itemSlot.addClassNames(qtyClassname); }
			self._ingredientsList.appendChild(itemSlot);
			itemSlot.on('tap', emitTapped);

			quantityList[ingredient.id] = qty;
		}

		// store dom elements for filtering
		self.nbIngredients = nbIngredients;
		self.searchString = simplifyString(searchString);
		self.quantityList = quantityList;

		return cb(null, self);
	});
};


RecipeBox.prototype.getItemSlot = function () {
	return this._item;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/RecipeBox/index.js
 ** module id = 756
 ** module chunks = 0
 **/