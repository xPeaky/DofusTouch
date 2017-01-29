require('./styles.less');
var async = require('async');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var Button = require('Button').DofusButton;
var Slot = require('Slot');
var tapBehavior = require('tapBehavior');
var windowsManager = require('windowsManager');
var staticContent = require('staticContent');
var FightEventEnum = require('FightEventEnum');
var assetPreloading = require('assetPreloading');
var helper = require('helper');

function RewardsPendingWindow() {
	var self = this;
	Window.call(this, {
		title: getText('ui.achievement.rewardsWaiting'),
		className: 'rewardsPending',
		positionInfo: { left: 'c', top: 'c-32px', width: 500, height: 300 }
	});

	this.rewards = {};
	this.isInFight = false;
	this.isInTutorial = false;

	this.rewardsList = this.windowBody.createChild('div', { className: 'rewardsList' });
	this.counter = this.windowBody.createChild('div', { className: 'counter' });
	this.acceptAllButton = this.windowBody.appendChild(new Button(getText('ui.common.acceptAll')));
	this.acceptAllButton.on('tap', function () {
		self.collectAll();
	});

	var gui = window.gui;

	gui.playerData.achievements.on('achievementFinished', function (msg) {
		self.addReward(msg.id, msg.finishedlevel);
	});
	gui.playerData.achievements.on('achievementListUpdated', function (msg) {
		for (var i = 0; i < msg.rewardableAchievements.length; i += 1) {
			var rewardableAchievement = msg.rewardableAchievements[i];
			self.addReward(rewardableAchievement.id, rewardableAchievement.finishedlevel);
		}
	});
	gui.playerData.achievements.on('achievementRewardSuccess', function (achievementId) {
		self.removeReward(achievementId);
	});

	gui.on('disconnect', function () {
		self.reset();
	});

	gui.fightManager.on('fightStart', function () {
		self.isInFight = true;
		self.handleRewardsIndicatorDisplay();
	});

	gui.fightManager.on(FightEventEnum.FIGHT_END, function () {
		self.isInFight = false;
		self.handleRewardsIndicatorDisplay();
	});

	gui.tutorialManager.on('inTutorialStateChanged', function (inTutorial) {
		self.isInTutorial = inTutorial;
		self.handleRewardsIndicatorDisplay();
	});
}

inherits(RewardsPendingWindow, Window);
module.exports = RewardsPendingWindow;

RewardsPendingWindow.prototype.addReward = function (id, finishedLevel) {
	// TODO: refactor this and split into multiple private functions, and for god's sake don't call it in a loop
	var self = this;

	var reward = this.rewardsList.createChild('div', { className: 'reward' });
	reward.id = id;
	reward.left = reward.createChild('div', { className: 'rewardLeft' });
	reward.right = reward.createChild('div', { className: 'rewardRight' });
	reward.nameText = reward.left.createChild('div', { className: 'rewardName' });
	reward.category = reward.right.createChild('div', { className: 'rewardCategory' });
	reward.numbers = reward.right.createChild('div', { className: 'rewardNumbers' });
	reward.xp = reward.numbers.createChild('div', { className: 'rewardXp' });
	reward.kamas = reward.numbers.createChild('div', { className: 'rewardKamas' });
	reward.collectButton = reward.right.createChild('div', { className: 'collectButton' });

	tapBehavior(reward.collectButton);

	reward.collectButton.on('tap', function () {
		self.collectReward(reward.id);
	});

	var rewards = reward.left.createChild('div', { className: 'rewards', name: 'rewards' });
	var rewardList = rewards.createChild('div', { className: 'rewardList' });
	var minimumRewardsCount = 6;
	var rewardSlots = [];

	for (var i = 0; i < minimumRewardsCount; i += 1) {
		rewardSlots[i] = rewardList.appendChild(new Slot({ name: 'icon' + i }));
	}

	this.rewards[id] = reward;

	this.updateCounter();
	this.handleRewardsIndicatorDisplay();

	var achievementName;
	var achievement;
	var parentId;
	var categoryId;
	var categoryName;
	var rewardIds;
	var itemsReward = [];
	var itemsQuantityReward = [];
	var emotesReward = [];
	var titlesReward = [];
	var ornamentsReward = [];
	var iconImageList = [];

	function getAchievement(cb) {
		staticContent.getData('Achievements', id, function (error, res) {
			if (error) {
				return cb(error);
			}
			achievementName = res.nameId;
			categoryId = res.categoryId;
			rewardIds = res.rewardIds;
			achievement = res;
			return cb();
		});
	}

	function setXpAndKamasReward(cb) {
		if (!reward.rootElement) {
			return;
		}
		var kamas = window.gui.playerData.achievements.getAchievementKamasReward(achievement, finishedLevel);
		reward.kamas.setText(helper.kamasToString(kamas, ''));

		var xp = window.gui.playerData.achievements.getAchievementExperienceReward(achievement, finishedLevel);
		reward.xp.setText(helper.kamasToString(xp, ''));

		return cb();
	}

	function getCategory(cb) {
		staticContent.getData('AchievementCategories', categoryId, function (error, res) {
			if (error) {
				return cb(error);
			}
			parentId = res.parentId;
			categoryName = res.nameId;
			return cb();
		});
	}

	function getParentCategory(cb) {
		if (parentId === 0) {
			return cb();
		}
		staticContent.getData('AchievementCategories', parentId, function (error, res) {
			if (error) {
				return cb(error);
			}
			categoryName = res.nameId;
			return cb();
		});
	}

	function getRewards(cb) {
		if (rewardIds.length === 0) {
			return cb();
		}
		staticContent.getData('AchievementRewards', rewardIds, function (error, res) {
			if (error) {
				return cb(error);
			}
			for (var i = 0; i < res.length; i += 1) {
				var reward = res[i];
				if (
					(reward.levelMin === -1 || reward.levelMin <= finishedLevel) &&
					(reward.levelMax === -1 || reward.levelMax >= finishedLevel)
				) {
					itemsReward = reward.itemsReward;
					itemsQuantityReward = reward.itemsQuantityReward;
					emotesReward = reward.emotesReward;
					titlesReward = reward.titlesReward;
					ornamentsReward = reward.ornamentsReward;
					return cb();
				}
			}
			return cb(new Error('rewardNotFound'));
		});
	}

	function getItems(cb) {
		if (itemsReward.length === 0) {
			return cb();
		}
		staticContent.getData('Items', itemsReward, function (error, res) {
			if (error) {
				return cb(error);
			}
			for (var i = 0; i < res.length; i += 1) {
				iconImageList.push('gfx/items/' + res[i].iconId + '.png');
			}
			return cb();
		});
	}

	function getEmotes(cb) {
		for (var i = 0; i < emotesReward.length; i += 1) {
			iconImageList.push('gfx/emotes/' + emotesReward[i] + '.png');
		}
		return cb();
	}

	function getTitles(cb) {
		for (var i = 0; i < titlesReward.length; i += 1) {
			iconImageList.push('gfx/illusUi/genericTitleIcon.png');
		}
		return cb();
	}

	function getOrnaments(cb) {
		if (ornamentsReward.length === 0) {
			return cb();
		}
		staticContent.getData('Ornaments', ornamentsReward, function (error, res) {
			if (error) {
				return cb(error);
			}
			for (var i = 0; i < res.length; i += 1) {
				iconImageList.push('gfx/ornaments/' + res[i].iconId + '.png');
			}
			return cb();
		});
	}

	function getImages(cb) {
		if (iconImageList.length === 0) {
			return cb();
		}

		assetPreloading.preloadImages(iconImageList, function (urls) {
			for (var i = 0; i < urls.length; i += 1) {
				var rewardSlot = rewardSlots[i];

				if (!rewardSlot.rootElement) {
					continue;
				}

				rewardSlot.setImage(urls[i]);
				rewardSlot.setQuantity(itemsQuantityReward[i]);
			}
			return cb();
		});
	}

	async.series([
		getAchievement,
		setXpAndKamasReward,
		getCategory,
		getParentCategory,
		getRewards,
		getItems,
		getEmotes,
		getTitles,
		getOrnaments,
		getImages
	], function (error) {
		if (error) {
			return console.error(error);
		}

		if (!reward.rootElement) {
			return;
		}

		reward.nameText.setText(achievementName);
		reward.category.setText(categoryName);
	});
};

RewardsPendingWindow.prototype.removeReward = function (rewardId) {
	var reward = this.rewards[rewardId];
	reward.destroy();
	delete this.rewards[rewardId];
	this.updateCounter();
	this.handleRewardsIndicatorDisplay();
};

RewardsPendingWindow.prototype.collectAll = function () {
	window.dofus.sendMessage('AchievementRewardRequestMessage', {
		achievementId: -1
	});
};

RewardsPendingWindow.prototype.collectReward = function (rewardId) {
	window.dofus.sendMessage('AchievementRewardRequestMessage', {
		achievementId: rewardId
	});
};

RewardsPendingWindow.prototype.updateCounter = function () {
	var count = Object.keys(this.rewards).length;
	this.counter.setText(getText('ui.achievement.rewardsRemaining', count));
};

RewardsPendingWindow.prototype.handleRewardsIndicatorDisplay = function () {
	var count = Object.keys(this.rewards).length;

	if (count === 0) {
		windowsManager.close('rewardsPending');
	}

	window.gui.rewardsIndicator.toggleDisplay(count > 0 && !this.isInFight && !this.isInTutorial);
};

RewardsPendingWindow.prototype.reset = function () {
	this.rewards = {};
	this.isInFight = false;
	this.isInTutorial = false;
	this.rewardsList.clearContent();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/RewardsPendingWindow/index.js
 ** module id = 793
 ** module chunks = 0
 **/