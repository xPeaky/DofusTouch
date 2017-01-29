require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var staticContent = require('staticContent');
var List = require('List');
var Button = require('Button');
var InputBox = require('InputBox');
var Slot = require('Slot');
var tapBehavior = require('tapBehavior');
var CheckboxLabel = require('CheckboxLabel');
var ProgressBar = require('ProgressBar');
var getText = require('getText').getText;
var assetPreloading = require('assetPreloading');
var helper = require('helper');

function AchievementsWindow() {
	var self = this;
	WuiDom.call(this, 'div', { className: 'AchievementsWindow', name: 'achievements' });

	this.achievementToOpen = null;
	this.achievementDataFromServer = null;

	this._createMinimumContent();

	self.setupSocketEvents();

	this.once('opened', function () {
		this._createRemainingContent(function () {
			self.setupListUpdateEvents();
			self.selectFirstTab();
			self.on('open', function () {
				self.selectFirstTab();
			});
		});
	});

	window.gui.on('disconnect', function () {
		if (self.achievementsList) {
			self.achievementsList.empty();
		}
	});
}
inherits(AchievementsWindow, WuiDom);
module.exports = AchievementsWindow;

AchievementsWindow.prototype.selectFirstTab = function () {
	this.categoriesList.activate(this.categoriesList.items.mainProgressBar);
};

AchievementsWindow.prototype.showRightSideDisplay = function (id) {
	this.text.hide();
	if (id === 'mainProgressBar') {
		this.achievementsScroll.hide();
		this.hideUnlockedCheckbox.hide();
		this.summary.show();
	} else {
		this.achievementsScroll.show();
		this.hideUnlockedCheckbox.show();
		this.summary.hide();
	}
};

AchievementsWindow.prototype.hideRightSideDisplay = function () {
	this.text.show();
	this.achievementsScroll.hide();
	this.hideUnlockedCheckbox.hide();
};

AchievementsWindow.prototype._createMinimumContent = function () {
	// this.total = this.createChild('div', { className: 'total' });
};

//TODO (maybe): we could refactor more by getting the achievement data outside of the DOM
AchievementsWindow.prototype._createRemainingContent = function (cb) {
	if (this.col1) {
		return cb(); //already done
	}
	var self = this;

	// layout
	this.col1 = this.createChild('div', { className: 'col1' });
	this.col2 = this.createChild('div', { className: 'col2' });

	this.categoriesScroll = this.col1.createChild('div', { className: 'scroll' });
	this.categoriesList = this.categoriesScroll.appendChild(new List());
	this.categoriesList.addClassNames('tree');

	this.categoriesList.on('activate', function (item) {
		var id = item.getWuiName();
		self.showRightSideDisplay(id);
		if (id === 'mainProgressBar') {
			return;
		}

		if (!item.sublist || !item.data) {
			return;
		}
		item.sublist.show();
		self.addAchievements(item.data.achievementIds);
	});

	this.categoriesList.on('deactivate', function (item) {
		if (!item.sublist) {
			return;
		}
		item.sublist.hide();
		item.sublist.deactivate();
	});

	this.searchBar = this.col2.createChild('div', { className: 'searchBar' });
	this.searchBar.createChild('div', { className: 'label', text: getText('ui.search.search') });
	var searchInput = new InputBox({ className: 'searchInput' });
	this.searchBar.appendChild(searchInput);

	//TODO: remove the disable on InputBox and both buttons when the feature is implemented
	searchInput.disable();
	searchInput.addClassNames('disabled');
	this.searchBar.appendChild(new Button({ className: ['closeButton', 'disabled'], disable: true }));
	this.searchBar.appendChild(new Button({ className: ['settingButton', 'disabled'], disable: true }));

	this.text = this.col2.createChild('div', { className: 'noResult', text: getText('ui.search.noResult') });
	this.summary = this.col2.createChild('div', { className: 'summary' });

	this.achievementsScroll = this.col2.createChild('div', { className: 'achievementsScroll' });
	this.achievementsList = this.achievementsScroll.appendChild(new List());
	this.achievementsList.addClassNames('achievementsList');
	this.achievementsList.on('activate', function (item) {
		item.more.show();
	});
	this.achievementsList.on('deactivate', function (item) {
		item.more.hide();
	});

	this.hideUnlockedCheckbox = this.col2.appendChild(new CheckboxLabel(getText('ui.achievement.hideAchieved')));
	this.hideUnlockedCheckbox.on('activate', function () {
		self.addClassNames('hideUnlocked');
	});
	this.hideUnlockedCheckbox.on('deactivate', function () {
		self.delClassNames('hideUnlocked');
	});

	this._createContentProgressBars(cb);
};

AchievementsWindow.prototype._createContentProgressBars = function (cb) {
	var self = this;
	this.banners = [];

	//create main progress bar (labelled "Progress" in english UI)
	var summary = new WuiDom('div', { className: ['label', 'noPadding'] });
	summary.createChild('div', { className: 'icon' });
	summary.createChild('div', { className: 'text', text: getText('ui.achievement.synthesis') });


	//create all other progress bars
	staticContent.getAllDataBulk('AchievementCategories', function (error, res) {
		if (error) {
			return console.error('AchievementCategories error', error);
		}

		res.sort(function (a, b) { return a.order - b.order; });

		var availableWidth = self.col2.rootElement.getBoundingClientRect().width;
		self.bannerHeight = availableWidth / 8;

		self.total = self.summary.createChild('div', { className: 'total', text: window.gui.playerData.achievements.points });
		self.total.setStyles({
			height: (availableWidth / 12) + 'px',
			fontSize: (availableWidth * 0.05) + 'px'
		});

		self.addSummaryBar({ id: 'mainProgressBar', nameId: getText('ui.tutorial.progress') });
		self.categoriesList.addItem('mainProgressBar', summary);

		var subCategories = [];
		var bannerRootName = 'gfx/illusUi/illu_';
		var bannerImages = [bannerRootName + 'cat_0.png']; //first banner image always "cat_0"
		res.forEach(function (data) {
			if (data.parentId === 0) {
				// main category
				var label = new WuiDom('div', { className: ['label', 'noPadding'] });
				label.createChild('div', { className: ['icon', data.icon] });
				label.createChild('div', { className: 'text', text: data.nameId });

				bannerImages.push(bannerRootName + data.icon + '.png');
				self.addSummaryBar(data);

				var li = self.categoriesList.addItem(data.id, label, data);
				li.sublist = li.appendChild(new List());
				li.sublist.addClassNames('tree');
				li.sublist.hide();
				li.sublist.on('activate', function (item) {
					if (!item.data) {
						return;
					}

					self.addAchievements(item.data.achievementIds);
					// TODO: get static content for achievement and objectives
					// outside of the loop
				});
			} else {
				// sub category
				subCategories.push(data);
			}
		});

		assetPreloading.preloadImages(bannerImages, function (urls) {
			for (var i = 0; i < self.banners.length; i += 1) {
				self.banners[i].setStyle('backgroundImage', urls[i]);
			}
		});

		subCategories.forEach(function (data) {
			var label = new WuiDom('div', { className: 'label', text: data.nameId });
			self.categoriesList.items[data.parentId].sublist.addItem(data.id, label, data);
		});

		cb(); //FIXME: pass callback to addAchievements and call cb() when they are all done (or better solution)
	});
};


AchievementsWindow.prototype.setupSocketEvents = function () {
	var self = this;

	function displayObjectives(achievementId, objectives, isFinished) {
		var finishedIds = [];
		var achievement = self.achievementsList.getChild(achievementId);

		if (!achievement) {
			return;
		}

		var progression = achievement.getChild('more').getChild('progression');
		var objectivesBox = achievement.getChild('more').getChild('objectives');
		var spinner = achievement.getChild('more').getChild('spinner');

		for (var i = 0; i < objectives.length; i += 1) {
			var data = objectives[i];

			var isObjectiveFinished = isFinished || (data.maxValue && data.value === data.maxValue);

			if (isObjectiveFinished) {
				finishedIds.push(data.id);
			}

			// from ankama logic
			// Binary objective, we need to show the objectivesBox
			if (data.maxValue === 1) {
				progression.hide();
				objectivesBox.show();
			} else {
				// Progress objective, we need to show the ProgressBar

				// if is finished the server does not send us the value, he send just the maxValue
				var progressValue = isObjectiveFinished ? data.maxValue : data.value;
				progression.getChild('text').setText(progressValue + '/' + data.maxValue);
				progression.getChild('progressBar').setValue(progressValue / data.maxValue);
				progression.show();
				objectivesBox.hide();
			}
		}

		var objectivesDom = achievement.getChild('more').getChild('objectives');

		for (i = 0; i < finishedIds.length; i += 1) {
			var objective = objectivesDom.getChild(finishedIds[i]);

			if (objective) {
				objective.addClassNames('completed');
			}
		}

		spinner.hide();
	}

	function displayAchievements(achievement) {
		var startedObjectives = achievement.startedObjectives;
		var finishedObjectives = achievement.finishedObjective;

		displayObjectives(achievement.id, startedObjectives);
		displayObjectives(achievement.id, finishedObjectives, true);
	}


	window.gui.on('AchievementDetailedListMessage', function (msg) {
		var startedAchievements = msg.startedAchievements;
		var finishedAchievements = msg.finishedAchievements;
		var i;

		for (i = 0; i < startedAchievements.length; i += 1) {
			displayAchievements(startedAchievements[i]);
		}

		for (i = 0; i < finishedAchievements.length; i += 1) {
			displayAchievements(finishedAchievements[i]);
		}
	});


	/**
	 * @event module:protocol/achievement.client_AchievementListMessage
	 *
	 * @desc  Get the currently saved achievements
	 */
	window.gui.playerData.achievements.on('achievementListUpdated', function () {
		var achievementData = window.gui.playerData.achievements;
		self.achievementDataFromServer = achievementData;

		if (self.total) {
			self.total.setText(this.points);
		}
	});
};

AchievementsWindow.prototype.setupListUpdateEvents = function () {
	var self = this;

	/** @event module:protocol/achievement.client_AchievementFinishedMessage
	 *  @desc  Listening for new achievements
	 *  @param {AchievementRewardable} msg.achievement
	 *  @param {number} msg.achievement.id
	 *  @param {number} msg.achievement.finishedlevel (not used; TODO?)
	 */
	window.gui.playerData.achievements.on('achievementFinished', function (msg) {
		if (self.total) {
			self.total.setText(this.points);
		}

		var achievement = self.achievementsList.getChild(msg.id);
		//FIXME (create a new perso to test right away - missing achievement 418)
		if (!achievement) {
			return console.warn('Achievement not found: ', msg.id);
		}

		achievement.addClassNames('completed');
		var claimButton = achievement.getChild('more').getChild('rewards').getChild('claimButton');
		claimButton.show();
		claimButton.enable();
	});


	window.gui.playerData.achievements.on('achievementRewardSuccess', function (achievementId) {
		var achievement = self.achievementsList.getChild(achievementId);
		if (!achievement) {
			return console.warn('Achievement not found: ', achievementId);
		}

		var claimButton = achievement.getChild('more').getChild('rewards').getChild('claimButton');
		claimButton.hide();
		claimButton.disable();
	});
};


AchievementsWindow.prototype.addSummaryBar = function (data) {
	var self = this;

	var summaryBar = this.summary.createChild('div', { className: 'summaryBar', name: data.id });
	var banner = summaryBar.createChild('div', { className: 'banner' });
	banner.setStyles({ height: this.bannerHeight + 'px' });

	this.banners.push(banner);
	banner.createChild('div', { className: 'text', text: data.nameId });

	var barClassName = 'yellow';
	switch (data.id) {
		case 15: // general
			barClassName = 'orange';
			break;
		case 6: // exploration
			barClassName = 'green';
			break;
		case 3: // dungeons
			barClassName = 'blue';
			break;
		case 25: // monsters
			barClassName = 'red';
			break;
		case 8: // quests
			barClassName = 'lightGreen';
			break;
		case 7: // professions
			barClassName = 'yellow';
			break;
		case 5: // breeding
			barClassName = 'yellow';
			break;
		case 9: // events
			barClassName = 'yellow';
			break;
	}
	summaryBar.appendChild(new ProgressBar({ className: barClassName, name: 'progressBar' }));

	if (data.id === 'mainProgressBar') {
		//mainProgressBar has special style and no behavior
		return summaryBar.addClassNames('mainProgressBar');
	}

	tapBehavior(banner);
	banner.on('tap', function () {
		self.showRightSideDisplay(data.id);
		self.categoriesList.activate(self.categoriesList.items[data.id]);
	});
};


AchievementsWindow.prototype.addAchievements = function (data) {
	var self = this;
	staticContent.getData('Achievements', data, function (error, res) {
		if (error) {
			return console.error('Achievements with data error', error);
		}

		res.sort(function (a, b) {
			return a.order - b.order;
		});

		var categId = res.length && res[0].categoryId;

		if (categId) {
			self.showRightSideDisplay(categId);
		} else {
			self.hideRightSideDisplay();
		}

		self.achievementsList.empty();

		var iconImageList = [];
		var achievementList = [];

		// collecting all objectives ids we need to collect in the db
		var objectiveIds = {};
		for (var i = 0; i < res.length; i++) {
			var achievementObjectivesIds = res[i].objectiveIds;
			for (var f = 0; f < achievementObjectivesIds.length; f++) {
				var objectiveId = achievementObjectivesIds[f];
				objectiveIds[objectiveId] = true;
			}
		}
		objectiveIds = Object.keys(objectiveIds);

		staticContent.getDataMap('AchievementObjectives', objectiveIds, function (error, objectivesData) {
			if (error) {
				return console.error('unable to retrieve data from AchievementObjectives', error);
			}

			if (categId) {
				window.dofus.sendMessage('AchievementDetailedListRequestMessage', { categoryId: categId });
			}

			for (var i = 0; i < res.length; i++) {
				iconImageList.push('gfx/achievements/' + res[i].iconId + '.png');
				achievementList.push(self.addAchievement(res[i], objectivesData));
			}

			// activate achievement
			if (self.achievementToOpen !== null && self.achievementsList.items[self.achievementToOpen] !== undefined) {
				if (self.isCompleted(self.achievementToOpen)) {
					// this achievement is completed
					self.hideUnlockedCheckbox.deactivate();
				}
				self.achievementsList.activate(self.achievementsList.items[self.achievementToOpen]);
				self.achievementToOpen = null;
			}

			assetPreloading.preloadImages(iconImageList, function (urls) {
				for (var i = 0; i < urls.length; i += 1) {
					var slot = achievementList[i].getChild('icon');
					if (!slot) {
						console.warn('Missing icon for achievement #' + i, achievementList[i]); //FIXME
						continue;
					}
					slot.setImage(urls[i]);
				}
			});
		});
	});
};


function loadRewards(achievement, cb) { //TODO: add reward's text and rename this loadRewardData
	var images = [];
	var rawRewards = []; // db items, spells, ornaments, etc

	if (!achievement.rewardIds.length) {
		return cb(null, images, rawRewards);
	}

	//if itemKey is null then itemPath is the complete path
	function loadImages(key, ids, itemPath, itemKey, loadImagesCb) {
		var loadedImages = [];
		var totalCount = ids.length;
		var loaded = 0;

		staticContent.getData(key, ids, function (error, dbData) {
			if (error) {
				return loadImagesCb(error);
			}

			// return the data the reward points to (whether it be a spell, item, etc) along with their images
			if (loaded === totalCount) {
				return loadImagesCb(null, loadedImages, dbData);
			}

			dbData.forEach(function (data) {
				//TODO: get the reward's text (for title: data.nameMaleId or data.nameFemaleId)
				var path = itemKey !== null ? itemPath + '/' + data[itemKey] + '.png' : itemPath;
				loadedImages.push(path);
				loaded += 1;

				if (loaded === totalCount) {
					return assetPreloading.preloadImages(loadedImages, function (urls) {
						loadImagesCb(null, urls, dbData);
					});
				}
			});
		});
	}

	staticContent.getData('AchievementRewards', achievement.rewardIds, function (error, rewards) {
		if (error) {
			return cb(error);
		}

		var totalRewards = 0;
		var loadedRewards = 0;
		var loadedCount = 0;
		var imageTypes = ['Ornaments', 'Items', 'Spells', 'Titles']; //we could move the other constants below here

		function loaded(error, urls, dbData) {
			if (error) {
				return cb(error);
			}

			images = images.concat(urls);
			rawRewards = rawRewards.concat(dbData); // db data and images arrays should match
			loadedRewards += rawRewards.length;

			loadedCount += 1;

			if (loadedRewards === totalRewards && loadedCount === imageTypes.length) {
				cb(null, images, rawRewards);
			}
		}

		rewards.forEach(function (reward) {
			totalRewards += reward.itemsReward.length + reward.ornamentsReward.length +
							reward.spellsReward.length + reward.titlesReward.length;

			loadImages(imageTypes[0], reward.ornamentsReward, 'gfx/ornaments', 'iconId', loaded);
			loadImages(imageTypes[1], reward.itemsReward, 'gfx/items', 'iconId', loaded);
			loadImages(imageTypes[2], reward.spellsReward, 'gfx/spells', 'iconId', loaded);
			loadImages(imageTypes[3], reward.titlesReward, 'gfx/illusUi/genericTitleIcon.png', null, loaded);
		});
	});
}


function claimedRewardRequest() {
	window.dofus.sendMessage('AchievementRewardRequestMessage', { achievementId: this.achievementId });
}


AchievementsWindow.prototype.addAchievement = function (achievement, objectivesData) {
	var self = this;
	var achievementData = window.gui.playerData.achievements;
	var i;

	var infos = new WuiDom('div', { className: 'infos' });

	infos.appendChild(new Slot({ name: 'icon' }));

	var infosGroupRight = infos.createChild('div', { className: 'infosGroupRight' });
	var infosGroupTitle = infosGroupRight.createChild('div', { className: 'cf' });

	infosGroupTitle.createChild('div', { className: 'title', text: achievement.nameId });
	infosGroupTitle.createChild('div', { className: 'points', text: achievement.points });
	infosGroupRight.createChild('div', { className: 'description', text: achievement.descriptionId });

	var li = this.achievementsList.addItem(achievement.id, infos, achievement);
	li.addClassNames('achievement');

	// additional content
	li.more = li.createChild('div', { className: 'more', name: 'more' });

	var progression = li.more.createChild('div', { className: 'progression', name: 'progression' });
	progression.hide();

	progression.appendChild(new ProgressBar({ className: 'green', name: 'progressBar' }));

	progression.createChild('div', { className: 'text', name: 'text' });

	var objectivesBox = li.more.createChild('div', { className: 'objectives', name: 'objectives' });
	objectivesBox.hide();

	li.more.createChild('div', { className: 'spinner', name: 'spinner' });

	var rewards = li.more.createChild('div', { className: 'rewards', name: 'rewards' });
	rewards.createChild('div', { className: 'text', text: getText('ui.grimoire.quest.rewards') });

	var rewardList = rewards.createChild('div', { className: 'rewardList' });
	var minimumRewardsCount = 6;

	for (i = 0; i < minimumRewardsCount; i++) {
		rewardList.appendChild(new Slot({ name: 'icon' + i }));
	}

	var claimButton = rewards.appendChild(new Button({ name: 'claimButton' }));
	claimButton.achievementId = achievement.id;
	claimButton.hide();
	claimButton.disable();

	claimButton.on('tap', claimedRewardRequest);

	var completedData = achievementData.completedData(achievement.id);
	var finishedlevel = completedData.finishedlevel;
	if (completedData.isCompleted) {
		li.addClassNames('completed');

		if (!this.isAchievementRewardClaimed(achievement.id)) {
			claimButton.show();
			claimButton.enable();
		}
	}

	var kamasXP = rewards.createChild('div', { className: 'kamasXP' });

	var xpValue = helper.kamasToString(achievementData.getAchievementExperienceReward(achievement, finishedlevel), '');
	var kamaValue = helper.kamasToString(achievementData.getAchievementKamasReward(achievement, finishedlevel), '');

	var xpLine = kamasXP.createChild('div', { className: 'line' });
	xpLine.createChild('div', { className: 'text', text: xpValue });
	xpLine.createChild('div', { className: ['icon', 'xp'] });

	var kamasLine = kamasXP.createChild('div', { className: 'line' });
	kamasLine.createChild('div', { className: 'text', text: kamaValue });
	kamasLine.createChild('div', { className: ['icon', 'kamas'] });

	li.more.hide();

	function tapObjectiveLine() {
		self.activateAchievement(this.achievementId);
	}

	function getGenderNameId(dbItem) {
		var playerHasSex = window.gui.playerData.characterBaseInformations.sex; // challenge accepted
		var genderName = playerHasSex ? dbItem.nameMaleId : dbItem.nameFemaleId;

		return genderName;
	}

	// objectives
	for (i = 0; i < achievement.objectiveIds.length; i++) {
		var objectiveId = achievement.objectiveIds[i];
		var objective = objectivesData[objectiveId];

		if (!objective || !objectivesBox.rootElement) {
			continue;
		}

		//TODO: error at runtime on next line when we click on objectives
		var objectiveLine = objectivesBox.createChild('div', {
			className: ['objective', objective.id],
			name: objective.id,
			text: objective.nameId
		});

		// if this objective is an achievement (AchievementItemCriterion)
		var isLink = objective.criterion.indexOf('OA') === 0;
		if (isLink) {
			var achievementId = Number(objective.criterion.substr(3, objective.criterion.length));
			if (isNaN(achievementId)) {
				console.warn('Failed parsing achievementId of objective.criterion: ' + objective.criterion);
			} else {
				// link to this achievement
				objectiveLine.achievementId = achievementId;
				tapBehavior(objectiveLine);
				objectiveLine.on('tap', tapObjectiveLine);
			}
		}

		var text = objectiveLine.createChild('span', { className: 'text' });
		text.setHtml(objective.nameId + (isLink ? ' ' + getText('ui.common.fakeLinkSee') : ''));
	}

	// rewards
	loadRewards(achievement, function (error, urls, dbData) {
		if (error) {
			return console.error('Loaded static achievement data error', error);
		}

		if (urls.length !== dbData.length) {
			return console.error(new Error('AchievementsWindow: Missing rewards data or images'));
		}

		// populate slots with images and corresponding dbData for each reward
		for (var i = 0; i < urls.length; i += 1) {
			var rewardSlot = rewardList.getChild('icon' + i);
			if (!rewardSlot) {
				return console.warn('AchievementsWindow: Missing icon' + i); //FIXME
			}

			// image
			rewardSlot.setImage(urls[i]);

			// tooltip with name + description
			var tooltip = new WuiDom('div');
			tooltip.createChild('div', { text: dbData[i].nameId || getGenderNameId(dbData[i]) });
			if (dbData[i].descriptionId) {
				tooltip.createChild('div', {
					text: dbData[i].descriptionId,
					style: { color: '#b9e154' }
				});
			}
			rewardSlot.setTooltip(tooltip);

			// context menu
			//TODO: add contextMenu, for that we need to think about a getItems without cache
			/*
			if (dbData[i]._type === 'Item') {
				rewardSlot.setContextMenu('item', {
					item: dbData[i]
				});
			}
			*/
		}
	});

	return infos;
};


AchievementsWindow.prototype.activateAchievement = function (achievementId) {
	var self = this;
	this.achievementToOpen = achievementId;
	// look for category to open
	staticContent.getData('Achievements', achievementId, function (error, res) {
		if (error || !res) { //res === null when achievementId was invalid (bad parsing)
			return console.error('Failed getting Achievements #' + achievementId + ' error: ' + error + ' res: ' + res);
		}
		var items = self.categoriesList.items;
		if (items[res.categoryId]) {
			// parent category found
			// activate parent category
			self.categoriesList.activate(items[res.categoryId]);
			return;
		}
		// look for subcategory
		for (var category in items) {
			var sublist = items[category].sublist;
			if (sublist.items[res.categoryId]) {
				// subcategory found
				// activate parent category
				self.categoriesList.activate(items[category]);
				// activate subcategory
				sublist.activate(sublist.items[res.categoryId]);
				return;
			}
		}
	});
};


AchievementsWindow.prototype.isCompleted = function (achievementId) {
	var claimed = this.achievementDataFromServer.finishedAchievementsIds.indexOf(achievementId) !== -1;
	var rewardableAchievements = this.achievementDataFromServer.rewardableAchievements;

	for (var i = 0; i < rewardableAchievements.length; i += 1) {
		if (rewardableAchievements[i].id === achievementId) {
			claimed = true;
			break;
		}
	}

	return claimed;
};


AchievementsWindow.prototype.isAchievementRewardClaimed = function (achievementId) {
	return this.achievementDataFromServer.finishedAchievementsIds.indexOf(achievementId) !== -1;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/AchievementsWindow/index.js
 ** module id = 739
 ** module chunks = 0
 **/