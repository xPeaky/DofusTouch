require('./styles.less');
var assetPreloading = require('assetPreloading');
var CheckboxLabel = require('CheckboxLabel');
var getText = require('getText').getText;
var hyperlink = require('hyperlink');
var inherits = require('util').inherits;
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');
var List = require('ListV2');
var playUiSound = require('audioManager').playUiSound;
var questStepHelper = require('questStepHelper');
var Scroller = require('Scroller');
var Selector = require('Selector');
var Slot = require('Slot');
var staticContent = require('staticContent');
var tapBehavior = require('tapBehavior');
var userPref = require('UserPreferences');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');
var addTooltip = require('TooltipBox').addTooltip;

var questsData = {}, questCategoryList = [];

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class QuestsWindow
 *  @desc  Quest window
 */
function QuestsWindow() {
	WuiDom.call(this, 'div', { className: 'QuestsWindow', name: 'quests' });

	var self = this;
	var initialized = false;
	questsData = window.gui.playerData.quests;

	this.currentQuest = null;
	this.selectedQuestElement = null;
	this.updateRequired = true;
	this.questsListUpdated = false;
	this.params = {};
	this.locateButtonMap = {};

	// Note:
	// Race condition will happened between questsData 'listUpdated' event and player
	// opening the quest window. If the window is opened before the questsData 'listUpdated'
	// event is emitted, we add a spinner on the questList indicating the list is loading.
	// Then, when the questsData 'listUpdated' event is emitted, we update the window and
	// delete the spinner.
	questsData.on('listUpdated', function () {
		self.updateRequired = true;
		self.questsListUpdated = true;
		if (self.isVisible()) {
			self.emit('open', self.params);
			self.questsList.delClassNames('spinner');
		}
	});

	this.once('open', function () {
		this._createDom();
		this._setupEvents();
		this._getQuestCategoryStaticData(function () {
			self._createQuestCategories();
			initialized = true;
			self.emit('initialized');
		});
	});

	this.on('open', function (params) {
		this.questsList.toggleClassName('spinner', !this.questsListUpdated);

		if (!initialized) {
			return this.once('initialized', this._onOpen.bind(this, params));
		}
		this._onOpen(params);
	});
}
inherits(QuestsWindow, WuiDom);
module.exports = QuestsWindow;

QuestsWindow.prototype._onOpen = function (params) {
	var self = this;
	this.params = params || {};

	var isSilent = true;
	var showCompletedQuest = userPref.getValue('showCompletedQuest', false);
	this.showCompletedCheckbox.toggleActivation(showCompletedQuest, isSilent);

	if (this.updateRequired) {
		this._updateQuestList();
	}

	var categoryId = this.params.categoryId || (this.currentQuest && this.currentQuest.dbQuest.categoryId);
	var questId = this.params.questId || (this.currentQuest && this.currentQuest.questId);

	// making sure the scroller is done updating so that scrollToElement will work when we select
	setTimeout(function () {
		self._selectQuest(categoryId, questId);
	}, 0);
};

QuestsWindow.prototype._createDom = function () {
	var self = this;
	var col1 = this.createChild('div', { className: 'col1' });
	var col2 = this.createChild('div', { className: 'col2' });

	this.counter = col1.createChild('div', { className: ['header', 'counter'] });
	this.questsList = col1.appendChild(new List({ className: 'tree' }));

	this.showCompletedCheckbox = col1.appendChild(new CheckboxLabel(getText('ui.grimoire.displayFinishedQuests')));

	var steps = col2.createChild('div', { className: ['header', 'steps'] });

	var questFollowedWrapper = steps.createChild('div', { className: 'followedQuest' });
	this.questFollowed = questFollowedWrapper.appendChild(new WuiDom('div', { className: 'followedQuestButton' }));
	addTooltip(questFollowedWrapper, getText('tablet.ui.grimoire.followQuest'));
	this.questFollowed.createChild('div', { className: 'locateBackground' });
	this.questFollowed.createChild('div', { className: 'locateIcon' });
	tapBehavior(questFollowedWrapper);
	questFollowedWrapper.on('tap', function () {
		var GPS = window.gui.GPS;
		var questId = self.currentQuest.questId;
		var following = !GPS.questFollower.isQuestFollowed(questId);
		self._updateQuestFollow(questId, following, true);
	});
	this.questFollowed.toggleClassName('selected', true);
	this.questFollowed.hide();

	this.stepTitle = steps.createChild('div', { className: 'stepTitle' });
	this.stepSelector = steps.appendChild(new Selector({ className: 'stepSelector' }));

	var descWrapper = col2.createChild('div', { className: 'descWrapper' });
	descWrapper.createChild('div', { className: 'image' });
	this.description = descWrapper.createChild('div', { className: 'description' });

	col2.createChild('div', { className: 'header', text: getText('ui.grimoire.quest.objectives') });

	this.objectivePlaceHolder = new WuiDom('div', {
		text: getText('ui.grimoire.quest.objectivesNonAvailable'),
		name: 'objectivePlaceHolder',
		className: 'objectiveRow'
	});

	this.objectivesScroller = col2.appendChild(new Scroller({ className: 'objectiveList' }));
	this.objectives = this.objectivesScroller.content;

	var rewardHeader = this.rewardHeader = col2.createChild('div', { className: 'header' });
	rewardHeader.createChild('div', { className: 'rewardTitle', text: getText('ui.grimoire.quest.rewards') });

	var xpPoint = this.xpPoint = rewardHeader.createChild('div', { className: 'point' });
	this.xp = xpPoint.createChild('div', { className: 'text' });
	xpPoint.createChild('div', { className: ['xp', 'icon'] });
	xpPoint.hide();

	var kamasPoint = this.kamasPoint = rewardHeader.createChild('div', { className: 'point' });
	this.kamas = kamasPoint.createChild('div', { className: 'text' });
	kamasPoint.createChild('div', { className: ['kamas', 'icon'] });
	kamasPoint.hide();

	this.rewardList = col2.createChild('div', { className: 'rewardList' });

	this.stepSelector.on('change', function (stepId) {
		var questStep = self.currentQuest.dbSteps[stepId];

		var selectedIndex = self.currentQuest.dbQuest.stepIds.indexOf(parseInt(stepId, 10));

		if (selectedIndex <= this.index) {
			self._displayStepData(questStep);
		} else {
			self._displayUnknownStep(questStep);
		}
	});

	this.questsList.on('selected', function (item) {
		item.sublist.show();
		self._updateQuestItemsStyle();
		self.questsList.refresh();
		self.questsList.scrollToElement(item);
	});

	this.questsList.on('deselected', function (item) {
		item.sublist.hide();
		self._updateQuestItemsStyle();
		self.questsList.refresh();
	});

	this.showCompletedCheckbox.on('change', function (checked) {
		userPref.setValue('showCompletedQuest', checked);
		self._showCompletedQuest();
	});
};

QuestsWindow.prototype._setupEvents = function () {
	var self = this;

	var gui = window.gui;
	var GPS = gui.GPS;

	// quest updated, update the step info if we have currentQuest and QuestsWindow isVisible
	questsData.on('questUpdate', function (questId) {
		if (!self.isVisible() || !self.currentQuest || questId !== self.currentQuest.questId) {
			return;
		}
		self._selectQuest(self.currentQuest.dbQuest.categoryId, self.currentQuest.questId);
	});

	questsData.on('questFinished', function (quest) {
		self._endQuest(quest.questId);
		self._sortSublist(quest.questId);
		self._showCompletedQuest();
		self._updateQuestCounter();

		// reset the step info, if we have currentQuest
		if (self.currentQuest && quest.questId === self.currentQuest.questId) {
			self._reset();
		}
	});

	questsData.on('questStarted', function (questId) {
		self._addQuest(questId);
		self._sortSublist(questId);
		self._showCompletedQuest();
		self._updateQuestCounter();
		// select the new started quest as currentQuest if we do not have any
		if (!self.currentQuest) {
			self.currentQuest = questsData.all[questId];

			if (self.isVisible()) {
				self._selectQuest(self.currentQuest.dbQuest.categoryId, self.currentQuest.questId);
			}
		}
	});

	gui.on('disconnect', function () {
		self.currentQuest = null;
		self.selectedQuestElement = null;
		self.updateRequired = true;
		self.questsListUpdated = false;
		self.params = {};
		self.locateButtonMap = {};
	});

	GPS.on('addDestination', function (poi) {
		var locateButton = self.locateButtonMap[poi.id];
		if (locateButton && locateButton.rootElement) {
			locateButton.addClassNames('selected');
		}
	});
	GPS.on('removeDestination', function (poiId) {
		var locateButton = self.locateButtonMap[poiId];
		if (locateButton && locateButton.rootElement) {
			locateButton.delClassNames('selected');
		}
	});
};

QuestsWindow.prototype._getQuestCategoryStaticData = function (cb) {
	staticContent.getAllDataTable('QuestCategory', function (error, categories) {
		if (error) {
			return console.error(error);
		}
		questCategoryList = categories || [];
		questCategoryList.sort(function (a, b) { return a.order - b.order; });
		cb();
	});
};

QuestsWindow.prototype._createQuestCategories = function () {
	var self = this;

	for (var i = 0, len = questCategoryList.length; i < len; i += 1) {
		var category = questCategoryList[i];

		var label = new WuiDom('div', { className: 'label' });
		label.createChild('div', { className: 'arrow' });
		label.createChild('div', { className: 'text', text: category.nameId });

		var wdCategory = self.questsList.addItem({ id: category.id, element: label }, { noRefresh: true });
		wdCategory.hide();

		wdCategory.sublist = wdCategory.appendChild(new WuiDom('div', { className: 'sublist' }));
		wdCategory.sublist.hide();
	}
};

QuestsWindow.prototype._updateQuestList = function () {
	this.updateRequired = false;
	this._reset();
	this._generateQuestList();
	this._updateQuestCounter();
};

// reset ui display to a 'no category selected' state
QuestsWindow.prototype._reset = function () {
	this.currentQuest = null;
	this._resetSelectedQuestElement();
	this.stepTitle.setText('');
	this.description.setText('');
	this._resetObjectives();
	this.rewardList.clearContent();
	this.kamas.setText('');
	this.kamasPoint.hide();
	this.xp.setText('');
	this.xpPoint.hide();
	this.questsList.deselectAll();
	this.stepSelector.clearContent();
	this.stepSelector.hide(); // avoid to look broken when no quest is selected
	this.questFollowed.hide();
};

QuestsWindow.prototype._resetSelectedQuestElement = function () {
	if (!this.selectedQuestElement) { return; }
	this.selectedQuestElement.delClassNames('selected');
	this.selectedQuestElement = null;
};

QuestsWindow.prototype._generateQuestList = function () {
	// clear the quests
	var questItems = this.questsList.getItems();

	for (var i = 0; i < questItems.length; i += 1) {
		var sublist = questItems[i].sublist;
		sublist.clearContent();
	}

	var activeOrderedQuestIds = Object.keys(questsData.active).sort();
	var finishedOrderedQuestIds = Object.keys(questsData.finished).sort();

	// add active quests first follow by finished quests
	for (i = 0; i < activeOrderedQuestIds.length; i += 1) {
		this._addQuest(activeOrderedQuestIds[i]);
	}
	for (i = 0; i < finishedOrderedQuestIds.length; i += 1) {
		this._addQuest(finishedOrderedQuestIds[i]);
	}

	this._showCompletedQuest();
};

QuestsWindow.prototype._updateQuestCounter = function () {
	var pendingProgress = getText('ui.grimoire.pendingQuests', Object.keys(questsData.active).length);
	var finishedStatus = getText('ui.grimoire.completedQuests', Object.keys(questsData.finished).length);
	this.counter.setText(pendingProgress + ' - ' + finishedStatus);
};

QuestsWindow.prototype._selectQuest = function (categoryId, questId) {
	if (!categoryId) {
		return;
	}

	var categoryItem = this.questsList.getItem(categoryId);
	if (!categoryItem) {
		return;
	}

	this.questsList.selectItem(categoryId);

	var questElement = categoryItem.sublist.getChild(questId);
	if (!questElement.hasClassName('completed')) {
		questElement.tap();
		this.questsList.scrollToElement(questElement);
	}
};

// update the background style of the questList and sublist
QuestsWindow.prototype._updateQuestItemsStyle = function () {
	var itemsList = this.questsList.getItems();
	var item, sublist, sublistItem, listCount = 0;

	for (var i = 0; i < itemsList.length; i += 1) {
		item = itemsList[i];

		if (!item.isVisible()) {
			continue;
		}

		item.toggleClassName('odd', listCount % 2 === 0);
		listCount += 1;

		if (!item.sublist.isVisible()) {
			continue;
		}

		sublist = item.sublist.getChildren();

		for (var j = 0; j < sublist.length; j += 1) {
			sublistItem = sublist[j];

			if (sublistItem.isVisible()) {
				sublistItem.toggleClassName('odd', listCount % 2 === 0);
				listCount += 1;
			}
		}
	}
};

QuestsWindow.prototype._showCompletedQuest = function () {
	var showCompletedQuest = userPref.getValue('showCompletedQuest', false);
	var itemsList = this.questsList.getItems();
	var id, item, sublist, sublistItem, allDone = true;

	for (var i = 0; i < itemsList.length; i += 1) {
		item = itemsList[i];
		sublist = item.sublist.getChildren();
		allDone = true;

		for (var j = 0; j < sublist.length; j += 1) {
			sublistItem = sublist[j];
			id = sublistItem.getWuiName();
			if (!showCompletedQuest && questsData.finished[id]) {
				sublistItem.hide();
				continue;
			}

			allDone = false;
			sublistItem.show();
		}

		if (allDone) {
			item.hide();
			continue;
		}

		item.show();
	}

	this._updateQuestItemsStyle();
	this.questsList.refresh();
};

QuestsWindow.prototype._resetObjectives = function () {
	this.locateButtonMap = {};
	this._removeObjectivePlaceHolder();
	this.objectives.clearContent();
	this.objectives.appendChild(this.objectivePlaceHolder);
	this.objectivesScroller.refresh();
};

QuestsWindow.prototype._removeObjectivePlaceHolder = function () {
	var objectivePlaceHolder = this.objectives.getChild('objectivePlaceHolder');
	if (objectivePlaceHolder) {
		this.objectives.removeChild(objectivePlaceHolder);
	}
};

QuestsWindow.prototype._createLocateButton = function (objectiveDom, objectiveDb, objective, questId) {
	var self = this;
	var GPS = window.gui.GPS;

	var locateButton = objectiveDom.appendChild(new WuiDom('div', { className: 'locateButton' }));
	locateButton.createChild('div', { className: 'locateBackground' });
	locateButton.createChild('div', { className: 'locateIcon' });

	var id = GPS.getQuestObjectivePoiId(objective.objectiveId);
	this.locateButtonMap[id] = locateButton;

	tapBehavior(objectiveDom);

	objectiveDom.on('tap', function () {
		if (GPS.getPOI(id)) {
			GPS.removePOI(id);
			if (!GPS.isAtLeastOneQuestObjectiveFollowed(questId)) {
				self._updateQuestFollow(questId, false, false);
			}
		} else {
			GPS.addQuestObjectiveFromObjective({
				objectiveDb: objectiveDb,
				objectiveId: objective.objectiveId,
				questId: questId
			});
			if (!GPS.questFollower.isQuestFollowed(questId)) {
				self._updateQuestFollow(questId, true, false);
			}
		}
	});

	locateButton.toggleClassName('selected', !!GPS.getPOI(id));
};

QuestsWindow.prototype._createObjectiveElement = function (questObjectiveDataObj, objective, questId) {
	var objectiveDom = new WuiDom('div', { className: 'objectiveRow' });

	var descriptionDom = objectiveDom.createChild('div', { className: 'description' });
	descriptionDom.appendChild(hyperlink.process(objective.text));

	var objectiveStatus = objective.objectiveStatus;
	objectiveDom.toggleClassName('complete', !objectiveStatus);
	objectiveDom.toggleClassName('disabled', !objectiveStatus);

	if (!objectiveStatus || !questObjectiveDataObj.coords && !questObjectiveDataObj.mapId) {
		return objectiveDom;
	}

	this._createLocateButton(objectiveDom, questObjectiveDataObj, objective, questId);

	return objectiveDom;
};

QuestsWindow.prototype._displayStepObjectives = function (stepData) {
	this._resetObjectives();

	var objectives = this.currentQuest.objectives;

	// display step objectives if only stepData is the same as currentQuest step
	if (this.currentQuest && this.currentQuest.questId === stepData.questId &&
		this.currentQuest.stepId !== stepData.id || !objectives.length) {
		return;
	}

	this._removeObjectivePlaceHolder();

	var objective;
	for (var i = 0, len = objectives.length; i < len; i += 1) {
		objective = objectives[i];
		this.objectives.appendChild(
			this._createObjectiveElement(this.currentQuest.dbObjectives[objective.objectiveId], objective, stepData.questId)
		);
	}

	this.objectivesScroller.refresh();
};

function displayItemsReward(rewardList, itemsReward) {
	if (!itemsReward.length) {
		return;
	}

	var itemQuantityMap = {};
	for (var i = 0, len = itemsReward.length; i < len; i += 1) {
		var reward = itemsReward[i];
		itemQuantityMap[reward[0]] = reward[1];
	}

	var itemIds = Object.keys(itemQuantityMap);
	itemManager.getItems(itemIds, function (error, items) {
		if (error) {
			return console.error('Failed to retrieve items', itemIds);
		}

		items.forEach(function (item) {
			if (!item) {
				return;
			}

			var itemSlot = rewardList.appendChild(new ItemSlot());
			itemSlot.addClassNames('rewardSlot');
			itemSlot.setItem(item);
			itemSlot.setQuantity(itemQuantityMap[item.id]);
			itemSlot.on('tap', function () {
				windowsManager.open('itemBox', { itemData: item });
			});
		});
	});
}

function displayEmotesReward(rewardList, emotesReward) {
	if (!emotesReward.length) {
		return;
	}

	staticContent.getData('Emoticons', emotesReward, function (error, emotes) {
		if (error) {
			return console.error(error);
		}

		var images = [];
		var slots = [];
		emotes.forEach(function (emote) {
			if (!emote) {
				return;
			}

			var emoteSlot = rewardList.appendChild(new Slot());
			emoteSlot.addClassNames('rewardSlot');
			slots.push(emoteSlot);
			emoteSlot.icon.addClassNames('spinner');

			images.push('gfx/emotes/' + emote.id + '.png');
			emoteSlot.setTooltip(emote.nameId);
		});

		assetPreloading.preloadImages(images, function (urls) {
			for (var i = 0, len = urls.length; i < len; i += 1) {
				var slot = slots[i];
				if (slot.rootElement) { // slot may not be here after the callback look at this.rewardList.clearContent();
					slot.icon.delClassNames('spinner');
					slot.setImage(urls[i]);
				}
			}
		});
	});
}

QuestsWindow.prototype._displayStepRewards = function (rewardsIds) {
	this.rewardList.clearContent();

	var level = window.gui.playerData.characterBaseInformations.level;

	for (var i = 0, len = rewardsIds.length; i < len; i += 1) {
		var reward = this.currentQuest.dbRewards[rewardsIds[i]];
		if (!reward ||
			(reward.levelMin !== -1 && level < reward.levelMin) ||
			(reward.levelMax !== -1 && level > reward.levelMax)) {
			continue;
		}

		displayItemsReward(this.rewardList, reward.itemsReward);
		displayEmotesReward(this.rewardList, reward.emotesReward);

		//TODO when the database contains some jobs or spells rewards
		// displayJobsReward(this.rewardList, reward.jobsReward);
		// displaySpellsReward(this.rewardList, reward.spellsReward);
	}
};

QuestsWindow.prototype._setKamas = function (stepData) {
	var kamas = questStepHelper.calculateStepKamasRatio(stepData);

	if (kamas) {
		this.kamasPoint.show();
		this.kamas.setText(kamas);
		return;
	}

	this.kamasPoint.hide();
};

QuestsWindow.prototype._setXp = function (stepData) {
	var xp = questStepHelper.calculateStepXpRatio(stepData);

	if (xp) {
		this.xpPoint.show();
		this.xp.setText(xp);
		return;
	}

	this.xpPoint.hide();
};

QuestsWindow.prototype._displayStepData = function (stepData) {
	var GPS = window.gui.GPS;
	this.stepTitle.setText(stepData.nameId);
	this.description.clearContent();
	this.description.appendChild(hyperlink.process(stepData.descriptionId));
	this.questFollowed.show();
	this.questFollowed.toggleClassName('selected', GPS.questFollower.isQuestFollowed(this.currentQuest.questId));

	this._displayStepObjectives(stepData);
	this._displayStepRewards(stepData.rewardsIds);

	this._setKamas(stepData);
	this._setXp(stepData);
};

QuestsWindow.prototype._displayUnknownStep = function (stepData) {
	this.stepTitle.setText(stepData.nameId);
	this.description.setText(getText('ui.grimoire.quest.descriptionNonAvailable'));

	this._resetObjectives();
	this._displayStepRewards(stepData.rewardsIds);

	this._setKamas(stepData);
	this._setXp(stepData);
};

QuestsWindow.prototype._updateStepList = function () {
	var quest = this.currentQuest;
	this.stepSelector.clearContent();
	this.stepSelector.index = 0;

	var stepIds = quest.dbQuest.stepIds;
	for (var i = 0, len = stepIds.length; i < len; i += 1) {
		var id = stepIds[i];

		this.stepSelector.addOption(getText('ui.grimoire.quest.step') + ' ' + (i + 1), id);

		if (quest.stepId === id) {
			this.stepSelector.index = i;
		}
	}

	this.stepSelector.select(quest.stepId);
	this.stepSelector.show();
};

QuestsWindow.prototype._getQuestCategoryElement = function (questId) {
	var quest = questsData.all[questId];
	return this.questsList.getItem(quest.dbQuest.categoryId);
};

QuestsWindow.prototype._sortSublist = function (questId) {
	var wdCategory = this._getQuestCategoryElement(questId);
	var sublist = wdCategory.sublist.getChildren();

	sublist.sort(function (sublistA, sublistB) {
		return parseInt(sublistA.getWuiName(), 10) - parseInt(sublistB.getWuiName(), 10);
	});

	sublist.sort(function (sublistA, sublistB) {
		if (sublistA.hasClassName('completed')) { return 1; }
		if (sublistB.hasClassName('completed')) { return -1; }
	});

	for (var i = 0; i < sublist.length; i += 1) {
		wdCategory.sublist.appendChild(sublist[i]);
	}
};

QuestsWindow.prototype._addQuest = function (questId) {
	var self = this;
	var GPS = window.gui.GPS;
	var quest = questsData.all[questId];
	var wdCategory = this._getQuestCategoryElement(questId);
	wdCategory.show();

	var questItem = wdCategory.sublist.getChild(questId);

	if (!questItem) {
		var subLabel = new WuiDom('div', { className: 'label', name: questId });
		subLabel.hourglass = subLabel.createChild('div', { className: 'icon' });
		if (!GPS.questFollower.isQuestFollowed(questId)) {
			subLabel.hourglass.addClassNames('notFollowed');
		}
		subLabel.createChild('div', { className: 'text', text: quest.dbQuest.nameId });

		tapBehavior(subLabel);
		subLabel.on('tap', function () {
			playUiSound('GEN_BUTTON');
			var questId = subLabel.getWuiName();
			self.currentQuest = questsData.all[questId];
			self._updateStepList();
			self._resetSelectedQuestElement();
			subLabel.addClassNames('selected');
			self.selectedQuestElement = subLabel;
		});

		questItem = wdCategory.sublist.appendChild(subLabel);
	}

	if (questsData.active[questId]) {
		questItem.delClassNames('completed');
		questItem.enable();
	} else {
		questItem.addClassNames('completed');
		questItem.disable();
	}
};

QuestsWindow.prototype._endQuest = function (questId) {
	var GPS = window.gui.GPS;

	var wdCategory = this._getQuestCategoryElement(questId);
	var questItem = wdCategory.sublist.getChild(questId);

	if (!questItem) {
		return;
	}

	questItem.addClassNames('completed');
	questItem.disable();

	GPS.questFollower.unfollowQuest(questId, false);
};

QuestsWindow.prototype._updateQuestFollow = function (questId, follow, updateObjectives) {
	var GPS = window.gui.GPS;
	var isFollowed = GPS.questFollower.isQuestFollowed(questId);
	if (follow && !isFollowed) {
		GPS.questFollower.followQuest(questId, updateObjectives);
	} else if (!follow && isFollowed) {
		GPS.questFollower.unfollowQuest(questId, updateObjectives);
	}
	this.questFollowed.toggleClassName('selected', follow);
	this._updateHourglass(questId, follow);
};

QuestsWindow.prototype._updateHourglass = function (questId, isFollowed) {
	var wdCategory = this._getQuestCategoryElement(questId);
	var questItem = wdCategory.sublist.getChild(questId);
	if (questItem) {
		questItem.hourglass.toggleClassName('notFollowed', !isFollowed);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/QuestsWindow/index.js
 ** module id = 747
 ** module chunks = 0
 **/