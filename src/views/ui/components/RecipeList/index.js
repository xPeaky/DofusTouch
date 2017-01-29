require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Scroller = require('Scroller');
var getText = require('getText').getText;
var CheckboxLabel = require('CheckboxLabel');
var InputBox = require('InputBox');
var itemManager = require('itemManager');
var async = require('async');
var tapBehavior = require('tapBehavior');
var RecipeBox = require('RecipeBox');
var dragManager = require('dragManager');

// Temporary solution : dot not re-use
// TODO: we should read "non diacritic text" from the server
// TODO: copy ankama code noAccent function
var simplifyString = require('helper').simplifyString;

var INGREDIENTS_MAX = 8;
var SEARCH_STRING_MIN_LENGTH = 3; // we don't filter the list if the search string is too short (min 3 chars)

/**
 *
 * @param {object} [params]
 * @param {boolean} [params.showCraftableFilter] - show the craftable filter checkbox
 * @constructor
 */
function RecipeList(params) {
	params = params || {};
	var self = this;
	WuiDom.call(this, 'div', { className: 'RecipeList' });

	this._filterCraftableOnly = false;
	this.selectedRecipe = null;
	this.tappedRecipe = null;

	var searchBar = this.createChild('div', { className: 'searchBar' });
	var searchLine = searchBar.createChild('div', { className: 'searchLine' });
	searchLine.createChild('div', { className: 'label', text: getText('ui.common.recipes', 2) });

	var searchInput = new InputBox({ className: 'searchInput' });
	searchInput.on('change', function (value) {
		self._checkOnInput(value);
	});
	this.searchInput = searchLine.appendChild(searchInput);

	var ingredientsLine = searchBar.createChild('div', { className: 'searchLine' });

	ingredientsLine.createChild('div', { className: 'label', text: getText('ui.common.ingredients') });

	// currently active filters (number of ingredients)
	this.filterNbSlots = {};
	this.filterText = '';
	this.filterCheckboxes = {};

	this.filterCheckboxes = ingredientsLine.createChild('div', { className: 'filterCheckboxes' });

	function addFilterCheckbox(slotNumber, defaultValue) {
		function changeFilterCheckbox(value) {
			self.filterNbSlots[filterCheckbox.slotNumber] = value;
			self.filterRecipes();
		}

		var filterCheckbox = self.filterCheckboxes.appendChild(new CheckboxLabel(slotNumber, defaultValue));
		filterCheckbox.slotNumber = slotNumber;
		filterCheckbox.on('change', changeFilterCheckbox);
		return filterCheckbox;
	}

	for (var i = 1; i <= INGREDIENTS_MAX; i += 1) {
		this.filterCheckboxes[i] = addFilterCheckbox(i, true);
		self.filterNbSlots[i] = true;
	}

	this.recipesWrapper = this.appendChild(new Scroller({ className: ['recipesWrapper', 'spinner'] }));

	// placeholder
	this._recipesPlaceholder = this.recipesWrapper.createChild('div', { className: 'recipesPlaceholder', hidden: true });
	this._recipesPlaceholder.createChild('div', {
		className: 'recipesPlaceholderText',
		text: getText('ui.craft.noCraftAvailable')
	});

	// the list of all recipes
	this.recipesList = this.recipesWrapper.content;

	this._showCraftableCheckbox = this.appendChild(new CheckboxLabel(getText('ui.craft.possibleRecipes')));
	this._showCraftableCheckbox.toggleDisplay(!!params.showCraftableFilter);
	this._showCraftableCheckbox.on('change', function (activate) {
		self.filterCraftable(activate);
	});

	this._checkOnInput = function (value) {
		if (value.length >= 3) {
			self.filterText = simplifyString(value);
			self.filterRecipes();
		} else if (self.filterText !== '') {
			self.filterText = '';
			self.filterRecipes();
		}
	};
}

inherits(RecipeList, WuiDom);
module.exports = RecipeList;


RecipeList.prototype.addRecipes = function (recipesData, params, cb) {
	params = params || {};
	this._recipesPlaceholder.hide();
	this.recipesList.clearContent();
	var self = this;
	this._nbCase = params.nbCase || (Object.keys(this.filterNbSlots).length ? null : INGREDIENTS_MAX);
	// will use it after
	// var mode = params.mode;

	cb = cb || function () {};

	var date = new Date().getTime();
	this._timestamp = date;

	// get all items for recipes
	// TODO: if mode 'craft' don't show the items you cannot craft -> don't get it

	var itemsIdToGet = {};
	var filteredRecipesData = [];

	if (recipesData.length === 0) {
		this._recipesPlaceholder.show();
		this.recipesWrapper.delClassNames('spinner');
		return cb();
	}

	for (var i = 0, len = recipesData.length; i < len; i += 1) {
		var recipeData = recipesData[i];

		// possible for db to return undefined recipes
		if (!recipeData) {
			continue;
		}
		filteredRecipesData.push(recipeData);
		// ingredientIds: Array[8]
		//     0: 13921
		//     1: 13923
		//     2: 14143
		//     [...]
		// quantities: Array[8]
		//     0: 40
		//     1: 10
		//     2: 1
		//     [...]
		// resultId: 13897
		// resultLevel: 198
		var ingredientIds = recipeData.ingredientIds;

		itemsIdToGet[recipeData.resultId] = true;

		for (var j = 0, lenj = ingredientIds.length; j < lenj; j += 1) {
			var ingredientId = ingredientIds[j];
			itemsIdToGet[ingredientId] = true;
		}
	}

	itemsIdToGet = Object.keys(itemsIdToGet);

	itemManager.getItems(itemsIdToGet, function (err) {
		if (err) {
			console.error('Failed to get ingredients', err);
			return cb(err);
		}

		// add recipes

		// means the method was called before this one finish, do not add the recipes.
		if (self._timestamp !== date) {
			return cb();
		}

		return async.eachSeries(filteredRecipesData,
			function (recipe, callback) {
				self._addRecipe(recipe, callback);
			},
			function (err) {
				if (err) {
					console.error(err);
					return cb(err);
				}

				// TODO: change for function
				if (self._nbCase) {
					// don't override if we have filter from last recipe list
					for (var i = 1; i <= INGREDIENTS_MAX; i += 1) {
						var craftableNbSlots = (i <= self._nbCase);
						self.filterNbSlots[i] = craftableNbSlots;
						self.filterCheckboxes[i].toggleActivation(craftableNbSlots);
					}
				}
				self.recipesWrapper.delClassNames('spinner');
				self.recipesList.show();

				self.filterRecipes();
				return cb();
			}
		);
	});
};


RecipeList.prototype._addRecipe = function (recipe, cb) {
	var self = this;
	var recipeId = recipe.resultId;

	function selectRecipe() {
		var quantityList = window.gui.playerData.inventory.quantityList;
		var recipe = self.recipesList.getChild(recipeId);
		for (var gid in recipe.quantityList) {
			if (!quantityList[gid] || quantityList[gid] < recipe.quantityList[gid]) {
				self.emit('notEnoughIngredient');
				return;
			}
		}

		self.emit('recipeSelected', recipeId);
	}

	var recipeBox = new RecipeBox(recipe, {
		nbCases: this._nbCase
	});

	self.recipesList.appendChild(recipeBox);
	tapBehavior(recipeBox);
	recipeBox.on('tap', function () {
		if (self.tappedRecipe && self.tappedRecipe.rootElement) {
			if (self.tappedRecipe === this) {
				selectRecipe();
				return;
			} else {
				self.tappedRecipe.delClassNames('tapped');
			}
		}
		this.addClassNames('tapped');
		self.tappedRecipe = this;
	});
	recipeBox.on('doubletap', function () {
		selectRecipe();
	});

	recipeBox.on('itemTapped', function (dbItem) {
		self.emit('itemTapped', dbItem);
	});

	recipeBox.on('craftButtonTapped', function () {
		selectRecipe();
	});

	return recipeBox.setupRecipe(function (err, data) {
		if (err) {
			console.error(new Error('Cannot setup recipe for recipeId ' + recipeId));
			return cb(err);
		}
		var itemSlot = recipeBox.getItemSlot();
		dragManager.setDraggable(
			itemSlot,
			{ backgroundImage: itemSlot.image },
			'recipeList',
			{
				selectRecipe: selectRecipe,
				source: 'recipeList'
			}
		);

		itemSlot.on('doubletap', selectRecipe);

		cb(null, data);
	});
};

RecipeList.prototype.filterCraftable = function (value) {
	this._filterCraftableOnly = value;
	this.filterRecipes();
};

RecipeList.prototype.filterRecipes = function () {
	var inventoryQtyList = window.gui.playerData.inventory.quantityList;

	var filterTextLength = this.filterText.length;
	var children = this.recipesList.getChildren();
	for (var i = 0, len = children.length; i < len; i += 1) {
		var recipeBox = children[i];
		var quantityList = recipeBox.quantityList;
		var showRecipe = true;
		recipeBox.craftButton.enable();

		// check if user has all the necessary ingredients
		for (var gid in quantityList) {
			if (!inventoryQtyList[gid] || inventoryQtyList[gid] < quantityList[gid]) {
				recipeBox.craftButton.disable();
				if (this._filterCraftableOnly) {
					showRecipe = false;
				}
				break;
			}
		}

		// check if correct number of ingredients
		if (showRecipe && this.filterNbSlots[recipeBox.nbIngredients]) {
			// check if text matches
			if (filterTextLength >= SEARCH_STRING_MIN_LENGTH &&
				recipeBox.searchString.indexOf(this.filterText) === -1) {
				showRecipe = false;
			}
		} else {
			showRecipe = false;
		}

		recipeBox.toggleDisplay(showRecipe);
	}
	this.recipesWrapper.refresh();
};

RecipeList.prototype.highlightRecipe = function (recipeId) {
	if (this.selectedRecipe && this.selectedRecipe.rootElement) {
		this.selectedRecipe.delClassNames('selected');
	}
	if (recipeId === null) {
		return;
	}

	var recipeBox = this.recipesList.getChild(recipeId);

	if (!recipeBox) {
		return;
	}

	recipeBox.addClassNames('selected');
	this.selectedRecipe = recipeBox;
};

RecipeList.prototype.reset = function () {
	this.selectedRecipe = null;
	this.tappedRecipe = null;
	this._recipesPlaceholder.hide();
	this.recipesList.hide();
	this.recipesList.clearContent();
	this.recipesWrapper.addClassNames('spinner');
	this.filterNbSlots = {};
	this.filterText = '';
	this.searchInput.setValue('');
	this._showCraftableCheckbox.deactivate();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/RecipeList/index.js
 ** module id = 754
 ** module chunks = 0
 **/