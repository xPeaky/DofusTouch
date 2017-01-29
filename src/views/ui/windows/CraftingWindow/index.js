require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var RecipeList = require('RecipeList');
var Button = require('Button').DofusButton;
var craftingManager = require('CraftingManager');
var windowsManager = require('windowsManager');
var itemManager = require('itemManager');
var CraftResultEnum = require('CraftResultEnum');
var ExchangeReplayStopReasonEnum = require('ExchangeReplayStopReasonEnum');
var ItemBox = require('ItemBox');
var CraftResultBox = require('CraftResultBox');
var CraftActorBox = require('CraftActorBox');
var dragManager = require('dragManager');

function CraftingWindow(options) {
	options = options || {};

	Window.call(this, {
		className: 'CraftingWindow',
		title: '',
		noCloseButton: true,
		positionInfo: { left: '0.5%', bottom: '2%', width: '76%', height: '95%' }
	});

	var withoutRecipesPosition = { left: '0.5%', bottom: '2%', width: 320, height: '95%' };
	this._positionInfos = {
		decrafting: withoutRecipesPosition,
		wrapping: withoutRecipesPosition
	};

	var withoutRecipesInvPosition = { right: '0.5%', bottom: '2%', width: '34.8%', height: '95%' };
	this._inventoryPositionInfos = {
		decrafting: withoutRecipesInvPosition,
		wrapping: withoutRecipesInvPosition
	};

	this._mergeLabels = {
		crafting: getText('ui.common.merge'),
		decrafting: getText('ui.common.decraft')
	};

	var self = this;
	var gui = window.gui;

	this._domCreated = false;
	this._recipeList = null;
	this._mySlotElems = null;
	this._targetSlotElems = null;
	this._craftResultBox = null;
	this._itemResult = null;
	this._totalQty = 1;
	this._done = 0;
	this._isInAutoCraft = false;
	this._skillId = null;

	/**
	 * Show which item you can craft with the given ingredients
	 * @param {object} params
	 *        {boolean} keepResultVisible - if true keep the result item visible
	 */
	function updateResultBox(params) {
		params = params || {};
		// clear all
		self._totalFailure = 0;
		self._totalSuccess = 0;
		self._done = 0;

		var jobsModule = gui.playerData.jobs;

		var givenIngredientsInfo = [];

		var givenIngredientsInfoMe = self._mySlotElems.getGivenIngredientsInfo();
		var givenIngredientsInfoTarget = self._targetSlotElems.getGivenIngredientsInfo();

		if (givenIngredientsInfoMe.length > 0 && givenIngredientsInfoTarget.length <= 0) { // I added all ingredients
			givenIngredientsInfo = givenIngredientsInfoMe;
			// get signature rune
			givenIngredientsInfo.push(self._mySlotElems.getRuneSignatureInfo());
		}
		// else both added ingredients or the target added all ingredients
		// givenIngredientsInfo will be empty and craftResultBox.checkRecipe will disable the quantity

		var checkedRecipe = jobsModule.checkRecipe(self._skillId);
		if (self._skillId === jobsModule.SKILLID_DECRAFT) {
			// set static decraft recipe such that any item can make one magic fragment
			for (var i = 0; i < givenIngredientsInfo.length; i += 1) {
				var ingredient = givenIngredientsInfo[i];
				if (!ingredient.GID) {
					continue;
				}
				checkedRecipe.itemToCraft.ingredientIds.push(ingredient.GID);
				checkedRecipe.itemToCraft.quantities.push(ingredient.quantity);
			}
		}

		self._craftResultBox.checkRecipe(givenIngredientsInfo, checkedRecipe);

		if (checkedRecipe.isRecipeKnown && !params.keepResultVisible) {
			self._itemResult.hide();
			self._craftResultBox._clearProgress();
			self._recipeList.highlightRecipe(checkedRecipe.itemToCraft.resultId);
		} else {
			self._recipeList.highlightRecipe(null);
		}
	}

	function updateQtyToCraft(msg) {
		self._totalQty = msg.count;
		self._craftResultBox.setQty(self._totalQty);
		self._isInAutoCraft = (self._totalQty > 1);
	}

	function updateProgress(msg) {
		msg = msg || { count: 0 };
		var remaining = msg.count || 0;
		self._done = self._totalQty - remaining;
		self._craftResultBox.setProgress(self._done + '/' + self._totalQty);
	}

	function onStop(msg) {
		var reason = msg.reason;
		craftingManager.displayAutoCraftStopReasonMessage(reason);

		self._isInAutoCraft = false;

		if (reason === ExchangeReplayStopReasonEnum.STOPPED_REASON_OK) {
			updateProgress({ count: 0 });
		}

		updateResultBox({ keepResultVisible: true });

		self._restoreMergeStopButtons();
	}

	/**
	 * Add or modify an ingredient.
	 * @param {object} msg - msg for the server for 'ExchangeObjectAddedMessage' or 'ExchangeObjectModifiedMessage'
	 */
	function addAndModifySlots(msg) {
		var jobsData = gui.playerData.jobs;

		itemManager.createItemInstances(msg.object, function (error, instances) {
			if (error) {
				return console.error('Crafting: addAndModifySlots cannot createItemInstances', error);
			}
			var instance = instances.array[0];

			var wasOnCraft = jobsData.addToCraft(instance);

			if (msg.remote) {
				self._targetSlotElems.addAndModifySlot(instance);
				if (!wasOnCraft) {
					self._mySlotElems.incrementAvailableSlots(-1);
				}
			} else {
				self._mySlotElems.addAndModifySlot(instance);
				if (!wasOnCraft) {
					self._targetSlotElems.incrementAvailableSlots(-1);
				}
			}

			self._mySlotElems.setNbSlots();
			self._targetSlotElems.setNbSlots();

			updateResultBox();
		});
	}

	function objectRemoved(msg) {
		var objectUID = msg.objectUID;
		var jobsData = gui.playerData.jobs;

		var stillOnCraft = jobsData.removeToCraft(objectUID);

		// Sometimes (on autoFill) the server send incorrect data about the remote.
		// Sometimes should be true but server return a false remote.
		// To fix that, because it's an UID the item to remove should be on me or on the target,
		// I check where the item was removed. with that I can know where to increment the available slots.

		var shouldIncrementOnTarget = self._mySlotElems.removeIngredient(objectUID);
		var shouldIncrementOnMe = self._targetSlotElems.removeIngredient(objectUID);

		if (!stillOnCraft) {
			if (shouldIncrementOnMe) {
				self._mySlotElems.incrementAvailableSlots(1);
			}
			if (shouldIncrementOnTarget) {
				self._targetSlotElems.incrementAvailableSlots(1);
			}
		}

		self._mySlotElems.setNbSlots();
		self._targetSlotElems.setNbSlots();

		updateResultBox();
	}

	this._onResultEvents = function (msg) {
		self._onResult(msg, function (err, data) {
			if (err) {
				return console.error('Crafting: onResult error', err);
			}
			self.giveTheResult(data.objectInfo, data.message);
		});
	};

	this._slotCountIncreased = function (msg) {
		var newMaxSlot = msg.newMaxSlot;
		self._updateRecipeList(newMaxSlot);
		self._updateSlotElems(newMaxSlot);
	};

	this._updateSlotElems = function (nbCase) {
		self._updateMySlotElems(nbCase);
	};

	gui.on('ExchangeCraftResultMessage', this.localizeEvent(self._onResultEvents));
	gui.on('ExchangeCraftResultWithObjectIdMessage', this.localizeEvent(self._onResultEvents));
	gui.on('ExchangeCraftResultWithObjectDescMessage', this.localizeEvent(self._onResultEvents));

	gui.on('ExchangeObjectAddedMessage', this.localizeEvent(addAndModifySlots));
	gui.on('ExchangeObjectModifiedMessage', this.localizeEvent(addAndModifySlots));
	gui.on('ExchangeObjectRemovedMessage', this.localizeEvent(objectRemoved));
	gui.on('ExchangeReplayCountModifiedMessage', this.localizeEvent(updateQtyToCraft));
	gui.on('ExchangeItemAutoCraftRemainingMessage', this.localizeEvent(updateProgress));
	gui.on('ExchangeItemAutoCraftStopedMessage', this.localizeEvent(onStop));

	gui.on('ExchangeCraftSlotCountIncreasedMessage', this.localizeEvent(self._slotCountIncreased));

	this.on('open', function (params) {
		if (!self._domCreated) {
			self._createDom();
		}
		self._onOpen(params);
	});

	this.on('close', function () {
		self._mySlotElems.clear();
		self._targetSlotElems.clear();
		self._recipeList.reset();
		self._craftResultBox.clear();
		gui.playerData.jobs.clearAfterCraft();
		self._skillId = null;
		self._paymentButton.hide();
		windowsManager.close('craftPayment');
	});

	this.on('closed', function () {
		this._updatePerCraftType(); // reset to default
	});

	this._buttonMergeAction = function () {
		// confirm exchange
		var nbIngredients = self._mySlotElems.getGivenIngredientsInfo().length;
		nbIngredients += self._targetSlotElems.getGivenIngredientsInfo().length;
		if (nbIngredients < 1) {
			return;
		}

		function sendExchangeReady() {
			// on solo, we always need to send 2
			window.dofus.sendMessage('ExchangeReadyMessage', { ready: true, step: 2 });

			if (self._isInAutoCraft) {
				self._stopBtn.enable();
				self._buttonMerge.disable();
			} else {
				self._restoreMergeStopButtons();
			}
		}

		if (self._skillId !== gui.playerData.jobs.SKILLID_DECRAFT) {
			return sendExchangeReady();
		} else {
			window.gui.openConfirmPopup({
				title: getText('ui.popup.warning'),
				message: getText('ui.craft.decraftConfirm'),
				cb: function (result) {
					if (!result) {
						return;
					}
					sendExchangeReady();
				}
			});
		}
	};
}

inherits(CraftingWindow, Window);
module.exports = CraftingWindow;


// Warning: used by multicraft
CraftingWindow.prototype._restoreMergeStopButtons = function () {
	this._stopBtn.disable();
	this._buttonMerge.enable();
};


// Warning: used by multicraft
CraftingWindow.prototype._createDom = function () {
	var self = this;

	var col1 = this.windowBody.createChild('div', { className: 'col1' });
	var col2 = this.windowBody.createChild('div', { className: 'col2' });

	this._recipeList = col1.appendChild(new RecipeList({ showCraftableFilter: true }));

	this._recipeList.on('recipeSelected', function (id) {
		window.dofus.sendMessage('ExchangeSetCraftRecipeMessage', { objectGID: id });
		windowsManager.getWindow('craftInventory').emit('recipeSelected');
	});

	this._recipeList.on('notEnoughIngredient', function () {
		window.gui.openSimplePopup(getText('ui.craft.dontHaveAllIngredient'));
	});

	this._targetSlotElems = col2.appendChild(new CraftActorBox());
	this._mySlotElems = col2.appendChild(new CraftActorBox());

	// slots selection logic

	function onDrag(tap, select) {
		if (tap.source === 'craftInventory') {
			self._mySlotElems.selectSlots(select);
		}
		if (tap.source === 'recipeList') {
			self._craftResultBox.selectSlot(select);
		}
	}

	dragManager.on('dragStart', self.localizeEvent(function (slot, source, tap) {
		onDrag(tap, true);
	}));

	dragManager.on('dragEnd', self.localizeEvent(function (slot, source, tap) {
		onDrag(tap, false);
	}));

	this._craftResultBox = col2.appendChild(new CraftResultBox());

	var buttonsContainer = col2.createChild('div', { className: 'buttonsContainer' });
	this._buttonMerge = buttonsContainer.appendChild(
		new Button(getText('ui.common.merge'), { className: 'mergeButton' })
	);
	this._buttonMerge.on('tap', self._buttonMergeAction);

	this._stopBtn = buttonsContainer.appendChild(
		new Button(getText('ui.common.stop'), { className: 'stopButton', disable: true })
	);
	this._stopBtn.on('tap', function () {
		window.dofus.sendMessage('ExchangeReplayStopMessage');
	});

	// payment
	this._paymentButton = buttonsContainer.appendChild(
		new Button(getText('ui.common.payment'), { className: 'paymentButton' })
	);
	this._paymentButton.on('tap', function () {
		windowsManager.open('craftPayment');
	});

	this._itemResult = col2.createChild('div', { className: 'itemResult' });
	var titleBar = this._itemResult.createChild('div', { className: 'titleBar' });
	this._itemName = titleBar.createChild('div', { className: 'itemName' });
	this._itemLevel = titleBar.createChild('div', { className: 'itemLevel' });
	this._itemDescription = this._itemResult.appendChild(new ItemBox());

	this._domCreated = true;
};


CraftingWindow.prototype._updateRecipeList = function (nbCase) {
	var jobsData = window.gui.playerData.jobs;
	var recipesData = jobsData.getRecipesBySkill(this._skillId);
	this._recipeList.addRecipes(recipesData, { nbCase: nbCase, mode: 'craft' });

	var nbCaseWithoutSignatureSlot = (nbCase > 8) ? 8 : nbCase;
	jobsData.setAvailableSlots(nbCaseWithoutSignatureSlot - jobsData.getUsedSlots());

	this.toggleClassName('noRecipe', !recipesData.length);
};

CraftingWindow.prototype._updatePerCraftType = function (type) {
	// window will resize to default size if positionInfos is not provided
	windowsManager.positionWindow(this.id, this._positionInfos[type]);
	windowsManager.positionWindow('craftInventory', this._inventoryPositionInfos[type]);

	this._buttonMerge.setText(this._mergeLabels[type] || this._mergeLabels.crafting);
};

// Warning: used by multicraft
CraftingWindow.prototype._updateMySlotElems = function (nbCase) {
	var isSignatureSlot = (nbCase === 9); // lvl100 === 8 + 1 signature slot
	this._mySlotElems.setNbSlots();
	this._mySlotElems.toggleSignatureSlot(isSignatureSlot);
};


// Warning: used by multicraft
CraftingWindow.prototype._onOpen = function (params) {
	// msg is the ExchangeStartOk message from the server
	var msg = params.msg;

	this._skillId = msg.skillId;
	this._totalQty = 1;
	this._totalFailure = 0;
	this._totalSuccess = 0;

	this._craftResultBox.clear();
	this._itemResult.hide();
	this._targetSlotElems.hide();
	this._paymentButton.hide();

	this._restoreMergeStopButtons();

	this._mySlotElems.setPlayerName(window.gui.playerData.characterBaseInformations.name);

	var nbCase = msg.maxCase || msg.nbCase;
	this._updateRecipeList(nbCase);
	this._updateSlotElems(nbCase);

	this._updatePerCraftType(params.type);
};


// Warning: used by multicraft
CraftingWindow.prototype._onResult = function (msg, cb) {
	var message = '';
	var GID = null;
	var gui = window.gui;
	var self = this;
	// TODO: objectName need HyperlinkItemManager
	var objectName = '';
	var craftResult = msg.craftResult;

	GID = msg.objectGenericId || (msg.objectInfo && msg.objectInfo.objectGID);

	// CRAFT_IMPOSSIBLE
	if (craftResult === CraftResultEnum.CRAFT_IMPOSSIBLE) {
		self._totalFailure += 1;
		message = getText('ui.craft.noResult');

		gui.openSimplePopup(message);
	} else if (craftResult === CraftResultEnum.CRAFT_FAILED) {
		// CRAFT_FAILED
		self._totalFailure += 1;

		if (!self._isInAutoCraft) {
			gui.openSimplePopup(getText('ui.craft.failed'));
		}
	}

	if (!self._isInAutoCraft) {
		self._restoreMergeStopButtons();
	}

	if (!GID) {
		return cb(null, {
			objectName: objectName,
			objectInfo: msg.objectInfo,
			craftResult: craftResult,
			message: message
		});
	}

	itemManager.getItems([GID], function (error) {
		if (error) {
			return cb(error);
		}
		var itemData = itemManager.items[GID];
		objectName = itemData.nameId;

		// CRAFT_SUCCESS
		if (craftResult === CraftResultEnum.CRAFT_SUCCESS) {
			self._totalSuccess += 1;
			message = getText('ui.craft.craftSuccessSelf', objectName);
		}
		cb(null, {
			objectName: objectName,
			objectInfo: msg.objectInfo,
			craftResult: craftResult,
			message: message
		});
	});
};


CraftingWindow.prototype.giveTheResult = function (objectInfo, message) {
	var gui = window.gui;
	var self = this;

	function updateItemResultDescription(objectInfo) {
		itemManager.createItemInstances(objectInfo, function (error, items) {
			if (error) {
				return console.error('Crafting: updateItemResultDescription Failed to create item instances', error);
			}

			var item = items.map[objectInfo.objectUID];
			self._itemDescription.displayItem(item);
			self._itemName.setText(item.item.nameId);
			self._itemLevel.setText(getText('ui.common.short.level') + item.item.level);
			self._itemResult.show();
		});
	}

	if (message) {
		gui.chat.logMsg(message);
	}

	if (!this._isInAutoCraft) {
		this._craftResultBox.setProgress('1/1');
	}

	// when create an object, filter again because some recipes can become uncraftable.
	this._recipeList.filterRecipes();

	// can be not define if it's the ExchangeCraftResultMessage
	if (objectInfo) {
		updateItemResultDescription(objectInfo);
	}

	this._craftResultBox.updateFailSuccessValues(this._totalFailure, this._totalSuccess);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftingWindow/index.js
 ** module id = 909
 ** module chunks = 0
 **/