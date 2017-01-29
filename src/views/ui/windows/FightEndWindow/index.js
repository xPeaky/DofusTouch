require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var audioManager = require('audioManager');
var dimensions = require('dimensionsHelper').dimensions;
var inherits = require('util').inherits;
var Window = require('Window');
var WuiDom = require('wuidom');
var ProgressBar = require('ProgressBar');
var windowsManager = require('windowsManager');
var FightOutcomeEnum = require('FightOutcomeEnum');
var getItems = require('itemManager').getItems;
var getText = require('getText').getText;
var StarCounter = require('StarCounter');
var helper = require('helper');
var ItemSlot = require('ItemSlot');
var Table = require('TableV2');
var Button = require('Button');

var OUTCOMES_TEXT;
var OUTCOMES_TITLES;
var OUTCOMES_SOUNDS = {
	0: 29099, // RESULT LOST
	2: 29098  // RESULT WIN
};
var MAX_ITEMS_FIT_IN_ROW = 5;
var WINDOW_HEIGHT = 80; // percent

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class FightEndWindow
 * @desc  Popup shown when fight ends, displaying fight data.
 */
function FightEndWindow() {
	Window.call(this, {
		className: 'FightEndWindow',
		title: getText('ui.fightend.gameResult'),
		positionInfo: { left: 'c', top: 'c', width: 780, height: WINDOW_HEIGHT + '%' }
	});

	var self = this;

	this.once('open', function () {
		OUTCOMES_TEXT = {
			0: getText('ui.fightend.losers'),     // RESULT_LOST
			2: getText('ui.fightend.winners'),    // RESULT_VICTORY
			5: getText('ui.common.taxCollector')  // RESULT_TAX
		};

		OUTCOMES_TITLES = {
			0: getText('ui.fightend.loss'),    // RESULT_LOST
			2: getText('ui.fightend.victory') // RESULT_VICTORY
		};

		self.summary = self.windowBody.createChild('div', { className: 'summary' });
		var block1 = self.summary.createChild('div', { className: ['summaryBlock', 'block1'] });
		var block2 = self.summary.createChild('div', { className: ['summaryBlock', 'block2'] });
		self.block3 = self.summary.createChild('div', { className: ['summaryBlock', 'block3'] });

		self.outcomeSummary = block1.createChild('div', { className: 'outcomeSummary' });

		var labels = block2.createChild('div', { className: 'labels' });
		labels.createChild('div', { text: getText('ui.fightend.duration') + getText('ui.common.colon') });
		labels.createChild('div', { text: getText('ui.fightend.bonus') + getText('ui.common.colon') });

		var values = block2.createChild('div', { className: 'values' });
		self.duration = values.createChild('div', { className: 'duration' });
		self.starCounter = values.appendChild(new StarCounter());

		addTooltip(self.starCounter, function () {
			var bonus = self.ageBonus || 0;
			return !bonus ? getText('ui.fightend.noBonus') :
				getText('ui.fightend.bonus') + getText('ui.common.colon') + bonus + '%';
		});

		function createResultIcon(result, row) {
			var outcome = result.outcome;
			var className = [];
			if (outcome === FightOutcomeEnum.RESULT_LOST || outcome === FightOutcomeEnum.RESULT_VICTORY) {
				className.push('outcome', 'outcome' + outcome);
				row.addClassNames('title');
			} else if (outcome === 'dead') {
				className.push(outcome);
			}

			if (className.length) {
				return new WuiDom('div', { className: className });
			}
		}

		function createNameElements(result) {
			var nameBox = new WuiDom('div', { className: 'nameBox' });
			nameBox.createChild('div', { className: 'nameText', text: result.name });

			if (result.id === window.gui.playerData.id) {
				nameBox.createChild('div', { className: 'isMeArrow' });
			}

			return nameBox;
		}

		function getExperienceToolTipText(experienceData) {
			var text = '';

			if (experienceData.showExperienceFightDelta) {
				text += getText('ui.fightend.xp') + getText('ui.common.colon') +
					helper.intToString(experienceData.experienceFightDelta);

				if (experienceData.isIncarnationExperience) {
					text += ' (' + getText('ui.common.incarnation') + ')';
				}
			}
			if (experienceData.showExperienceForGuild) {
				text += '\n' + getText('ui.common.guild') + getText('ui.common.colon') +
					helper.intToString(experienceData.experienceForGuild);
			}
			if (experienceData.showExperienceForMount) {
				text += '\n' + getText('ui.common.ride') + getText('ui.common.colon') +
					helper.intToString(experienceData.experienceForMount);
			}
			return text;
		}

		function createXpElements(result) {
			var additional = result.additional || [];

			if (!additional.length || !additional[0]) { return; }

			var experienceData = additional[0];
			var expLevelFloor = experienceData.experienceLevelFloor;
			var expSinceLevelUp = experienceData.experience - expLevelFloor;
			var expTilLevelUp = experienceData.experienceNextLevelFloor - expLevelFloor;
			var experienceFraction = expSinceLevelUp / expTilLevelUp;

			var xpCell = new WuiDom('div', { className: 'xpElements' });
			var xpProgressBar = xpCell.appendChild(new ProgressBar({ value: experienceFraction }));
			var xpProgressBarText = Math.floor(experienceFraction * 100) + '% (' +
				helper.intToString(expSinceLevelUp) + ' / ' + helper.intToString(expTilLevelUp) + ')';
			addTooltip(xpProgressBar, xpProgressBarText);

			var experienceText = xpCell.createChild('div',
				{ className: 'xpText', text: helper.intToString(experienceData.experienceFightDelta) });
			addTooltip(experienceText, getExperienceToolTipText(experienceData));

			var expBonus = experienceData.rerollExperienceMul;
			if (expBonus > 1) {
				var xpBonusIcon = xpCell.createChild('div', { className: ['xpBonusIcon', 'bonus' + expBonus] });
				addTooltip(xpBonusIcon,
					getText('ui.common.experiencePoint') + ' x ' + expBonus + '\n\n' + getText('ui.information.xpFamilyBonus'));
			}

			return xpCell;
		}

		function createDropsElements(result) {
			var drops = result.drops || [];

			if (!drops.length) { return; }

			var id, value, itemIds = [], itemQuantityMap = {};

			// Items won by a player (double-entry objects [i + 0] contains the gid of the object and objects [i + 1]
			// quantity)
			for (var i = 0; i < drops.length; i += 1) {
				if ((i % 2) === 0) {
					id = drops[i];
					value = drops[i + 1] || 0;
					itemIds.push(id);
					itemQuantityMap[id] = value;
				}
			}

			if (!itemIds.length) {
				return;
			}

			var dropElm = new WuiDom('div', { className: ['dropRow', 'spinner'] });

			getItems(itemIds, function (error, items) {
				if (error) {
					return console.warn('Error while getting items', error);
				}

				if (!dropElm.rootElement) { return; }

				// sort the items by average price (high to low)
				items.sort(function (itemA, itemB) {
					var priceA = itemA.averagePrice * itemQuantityMap[itemA.id];
					var priceB = itemB.averagePrice * itemQuantityMap[itemB.id];
					return priceB - priceA;
				});

				var i, item;

				for (i = 0; i < items.length; i += 1) {
					item = items[i];

					if (i === MAX_ITEMS_FIT_IN_ROW) {
						break;
					}

					dropElm.appendChild(new ItemSlot({
						itemData: item,
						quantity: itemQuantityMap[item.id]
					}));
				}

				if (items.length > MAX_ITEMS_FIT_IN_ROW) {
					var moreButton = dropElm.appendChild(new Button({
						className: 'moreButton'
					}, function () {
						windowsManager.getWindow('fightEndRewards').updateContent(result.name, items, itemQuantityMap);
						windowsManager.open('fightEndRewards');
					}));

					var moreButtonToolTipText = '';

					for (i = 0; i < items.length; i += 1) {
						item = items[i];
						moreButtonToolTipText += itemQuantityMap[item.id] + ' x ' + item.nameId + '\n';
					}

					addTooltip(moreButton, moreButtonToolTipText);
				}

				dropElm.delClassNames('spinner');
			});

			return dropElm;
		}

		self.table = self.windowBody.appendChild(new Table(
			[
				{
					id: 'icon', format: createResultIcon
				},
				{
					id: 'name', header: getText('ui.common.name'), format: createNameElements
				},
				{
					id: 'level', header: getText('ui.common.short.level')
				},
				{
					id: 'xp', header: getText('ui.fightend.xp'), format: createXpElements
				},
				{
					id: 'kamas', header: getText('ui.common.kamas')
				},
				{
					id: 'drops', header: getText('ui.fightend.objects'), format: createDropsElements
				}
			],
			null,
			{
				clickable: false
			}
		));
	});

	this.on('open', function (params) {
		self._updateResultList(params.msg, params.fighters);
		self._resize();
	});

	this.on('close', function () {
		self._reset();
	});
}

inherits(FightEndWindow, Window);
module.exports = FightEndWindow;


FightEndWindow.prototype.addChallenge = function (challengeData) {
	// TODO: the challenge content creation code bellow is ALSO in ChallengeIndicator;
	// we should remove it from here and call a method there.

	var url = challengeData.iconUrl;
	var success = challengeData.success;

	var challenge = this.block3.createChild('div', { className: ['challenge', (success ? 'success' : 'fail')] });
	challenge.setStyle('backgroundImage', url);

	var challengeDetails = new WuiDom('div', { className: 'challengeDetails', name: 'challengeDetails' });

	function createChallengeDetails() {
		challengeDetails.clearContent();
		challengeDetails.createChild('div', { className: 'challengeName', text: challengeData._name });
		challengeDetails.createChild('div', { className: 'challengeDesc', text: challengeData._description });
		challengeDetails.createChild('div', {
			className: 'challengeLoot',
			text: getText('ui.common.loot') + ' +' + challengeData.dropBonus + '%'
		});
		challengeDetails.createChild('div', {
			className: 'challengeXp',
			text: getText('ui.common.xp') + ' +' + challengeData.xpBonus + '%'
		});

		var challengeStatus = challengeDetails.createChild('div', { className: 'challengeStatus' });

		if (success) {
			challengeStatus.addClassNames('success');
			challengeStatus.setText(getText('ui.fight.challenge.complete'));
		} else {
			challengeStatus.addClassNames('fail');
			challengeStatus.setText(getText('ui.fight.challenge.failed'));
		}

		return challengeDetails;
	}

	addTooltip(challenge, createChallengeDetails);
};



// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Object}   msg - GameFightEndMessage
 * @param {number}   msg.ageBonus
 * @param {number}   msg.duration
 * @param {number}   msg.lootShareLimitMalus
 * @param {Object[]} msg.results
 * @param {number}   msg.results.id
 * @param {boolean}  msg.results.alive
 * @param {number}   msg.results.level
 * @param {number}   msg.results.outcome
 * @param {Object[]} msg.results.additional
 * @param {Object}   msg.results.rewards
 *
 * @param {Object} fighters - a map of fighters
 */
// Most of the features are implmented, the remaining TODO are:
// - display lbl_sizeMalus for lootShareLimitMalus
// - display lbl_honour for pvp
FightEndWindow.prototype._updateResultList = function (msg, fighters) {
	var durationText = helper.durationToString(msg.duration / 1000); // msg.duration in miliseconds
	// getTurnCount() start at 0
	var turnsText = ' (' + getText('ui.fight.turnCount', window.gui.fightManager.getTurnCount() + 1) + ')';

	this.duration.setText(durationText + turnsText);
	this.ageBonus = msg.ageBonus || 0;
	this.starCounter.setValue(msg.ageBonus);

	// challenge data
	var challenges = window.gui.challengeIndicator.challenges;

	for (var id in challenges) {
		this.addChallenge(challenges[id].data);
	}

	helper.sortObjectInArray(msg.results, 'outcome', true);

	// update name and levels of monsters
	var actor, actorId, outcome, outcomeTable = [], tableParams = [];

	for (var i = 0; i < msg.results.length; i += 1) {
		actor = msg.results[i];
		actorId = actor.id;
		outcome = actor.outcome;

		if (outcome === FightOutcomeEnum.RESULT_DEFENDER_GROUP) {
			// actor._type is 'FightResultListEntry'
			// TODO: we should distribute actor.rewards (objects and kamas) to winning group
			// See logic in FightContextFrame.as in flash code. Look for "hardcoreLoots"
			console.warn('Hardcode loots not handled (skipped)', actor.rewards);
			continue;
		}

		// set user outcome in title
		if (actorId === window.gui.playerData.id) {
			this.outcomeSummary.setText(OUTCOMES_TITLES[outcome] || '');
			// play end combat SFX
			var soundOutcome = OUTCOMES_SOUNDS[outcome];
			if (soundOutcome) { audioManager.playSound('ui', soundOutcome); }
		}

		// create the outcomes titles
		if (!outcomeTable[outcome]) {
			tableParams.push({
				outcome: outcome,
				name: OUTCOMES_TEXT[outcome]
			});
			outcomeTable[outcome] = true;
		}

		var playerName = fighters[actorId].name;

		tableParams.push({
			id: actor.id,
			outcome: actor.alive ? '' : 'dead',
			name: playerName,
			level: fighters[actor.id].level,
			additional: actor.additional,
			kamas: helper.intToString(actor.rewards.kamas),
			drops: actor.rewards.objects
		});
	}

	this.table.addList(tableParams);
};

FightEndWindow.prototype._resize = function () {
	var table = this.table;
	var tableRowsHeight = table.rows.rootElement.offsetHeight;
	var tableHeaderHeight = table.header.rootElement.offsetHeight;
	var otherInterfaceHeight =
		/*window header*/ 40 + /*window margin*/ 13 + /*windowBody padding*/ 20 + /*summary*/ 50;

	var maxWindowHeight = Math.round(dimensions.windowFullScreenHeight * WINDOW_HEIGHT / 100);
	var totalHeight = tableRowsHeight + tableHeaderHeight + otherInterfaceHeight;
	totalHeight = totalHeight < maxWindowHeight ? totalHeight : maxWindowHeight;

	windowsManager.positionWindow(this.id,
		{ left: 'c', top: 'c', width: this.position.width, height: totalHeight });

	table.scroller.refresh();

	// [DOT-1818] let's hope this iOS10 bug will be fixed quickly, else we will need to report it
	var device = window.device;
	if (device && device.platform === 'iOS' && device.version.indexOf('10.') === 0) {
		this.hide();
		helper.forceReflow(this);
		this.show();
	}
};

FightEndWindow.prototype._reset = function () {
	this.block3.clearContent();
	this.table.clearContent();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/FightEndWindow/index.js
 ** module id = 724
 ** module chunks = 0
 **/