require('./styles.less');
var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var StarCounter = require('StarCounter');
var getText = require('getText').getText;
var PartyTypeEnum = require('PartyTypeEnum');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuMonster() {
	var self = this;
	ContextualMenu.call(this, { className: 'ContextualMenuMonster' });

	this.monsterId = null;
	this.attack = null;

	this.once('open', function () {
		this._setupDom();
	});

	this.on('open', function (data, contentReady) {
		this.monsterId = data.contextualId;

		this.starCounter.setValue(data.ageBonus);

		this.monstersList.clearContent();

		var willFightContainer = this.monstersList.createChild('div', { className: 'willFightContainer' });
		var willNotFightContainer = this.monstersList.createChild('div', { className: 'willNotFightContainer' });

		var monsters = [data.staticInfos.mainCreatureLightInfos].concat(data.staticInfos.underlings);

		var alternatives = data.staticInfos.alternatives;

		// alternative is the alternative group of monster depending of the party size

		var i;
		var currentAlternative = null;
		var alternativeMonsterIds = [];

		if (alternatives) {
			// there is a different number of enemies according to the party size
			var partyData = window.gui.playerData.partyData;
			var partyMembers = partyData.partyTypes[PartyTypeEnum.PARTY_TYPE_CLASSICAL].members;

			// number of players in my party (including myself)
			var partySize = Object.keys(partyMembers).length + 1;

			// search the last available alternative group corresponding to my party members size

			var current = 0;
			while (alternatives[current] && alternatives[current].playerCount <= partySize) {
				currentAlternative = alternatives[current];
				current += 1;
			}

			// get the alternative ids;

			for (i = 0; i < currentAlternative.monsters.length; i += 1) {
				alternativeMonsterIds.push(currentAlternative.monsters[i].creatureGenericId);
			}
		}

		// sort monsters by level desc

		var sortedMonsters = monsters.sort(function (a, b) {
			return b.staticInfos.level - a.staticInfos.level;
		});

		var totalLevel = 0;
		for (i = 0; i < sortedMonsters.length; i += 1) {
			var monster = sortedMonsters[i];
			var monsterInfo = monster.staticInfos;
			var monsterId = monster.creatureGenericId;
			var willFight = true;

			if (alternatives) {
				willFight = false;

				// does that monster is part of the fight

				var index = alternativeMonsterIds.indexOf(monsterId);
				if (index !== -1) {
					willFight = true;
					// remove that monster from the list
					alternativeMonsterIds.splice(index, 1);
				}
			}

			if (willFight) {
				totalLevel += monsterInfo.level;
			}

			var nameText = monsterInfo.nameId + ' (' + monsterInfo.level + ')';

			// if in the fight we will add it the willFightContainer, if not inside the willNotFightContainer
			var container = willFight ? willFightContainer : willNotFightContainer;
			// miniBoss type will get an extra className
			var className = monsterInfo.isMiniBoss ? ['monsterName', 'miniBoss'] : 'monsterName';
			container.createChild('div', { className: className, text: nameText });
		}

		self.level.setText(getText('ui.common.rank', totalLevel));
		self.attack.setEnable(!window.gui.playerData.getRestrictions().cantAttackMonster);

		//TODO: display XP value
		contentReady();
	});
}

inherits(ContextualMenuMonster, ContextualMenu);
module.exports = ContextualMenuMonster;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** create component dom elements
 * @private
 */
ContextualMenuMonster.prototype._setupDom = function () {
	var self = this;

	var monsterInfosContainer = this.header.createChild('div', { className: 'monsterInfosContainer' });

	this.level = monsterInfosContainer.createChild('div', { className: 'level' });
	this.starCounter = monsterInfosContainer.appendChild(new StarCounter());
	this.starCounter.on('shopOpened', function () {
		self.close();
	});
	this.xp = monsterInfosContainer.createChild('div', { className: 'xp' });
	this.monstersList = this.entryList.createChild('div', { className: 'monstersList' });

	this.attack = this._addEntry(getText('ui.common.attack'), function () {
		if (self.monsterId) {
			window.isoEngine.attackActor(self.monsterId);
		}
		self.close();
	});

	this._addCancel();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuMonster/index.js
 ** module id = 409
 ** module chunks = 0
 **/