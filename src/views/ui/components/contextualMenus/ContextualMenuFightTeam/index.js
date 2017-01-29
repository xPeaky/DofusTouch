require('./styles.less');
var inherits       = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var staticContent  = require('staticContent');
var getText        = require('getText').getText;
var windowsManager = require('windowsManager');



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuFightTeam() {
	ContextualMenu.call(this, { className: 'ContextualMenuFightTeam' });

	this.leaderId = 0;
	this.fightId  = 0;

	this.once('open', this._setupDom);
	this.on('open', this._setContent);
}

inherits(ContextualMenuFightTeam, ContextualMenu);
module.exports = ContextualMenuFightTeam;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** create component dom elements
 * @private
 */
ContextualMenuFightTeam.prototype._setupDom = function () {
	var self = this;
	var container = this.entryList.createChild('div');

	this.teamMemberList = container.createChild('div', { className: 'teamMemberList' });
	this.actionsContainer = container.createChild('div');

	// "join" button
	this.buttonJoin = this._addEntry(getText('ui.common.join'), function () {
		if (self.isAlliancePrismFight) {
			windowsManager.open('social', { tabId: 'alliance', tabParams: { tabId: 'attacks' } });
			return;
		}

		if (self.isTaxCollectorFight) {
			windowsManager.open('social', { tabId: 'guild', tabParams: { tabId: 'perceptors' } });
			return;
		}

		window.dofus.sendMessage('GameFightJoinRequestMessage', { fighterId: self.leaderId, fightId: self.fightId });
	});

	this._addCancel();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set contextual menu content with fight informations
 *
 * @param {Object}   params             - fight information
 * @param {Number}   params.fightId     - fight id
 * @param {Number}   params.teamId      - team id
 * @param {Number}   params.teamSide    - team alignment side
 * @param {Number}   params.teamTypeId  - team type
 * @param {Number}   params.leaderId    - team leader contextual id
 * @param {Object[]} params.teamMembers - informations on team members
 *
 * @param {Function} onContentReady     - callback function
 */
ContextualMenuFightTeam.prototype._setContent = function (params, onContentReady) {
	var self = this;

	this.isAlliancePrismFight = false;
	this.isTaxCollectorFight = false;

	this.leaderId = params.leaderId;
	this.fightId  = params.fightId;
	this.teamMemberList.clearContent();

	var teamMembers = params.teamMembers;
	var monsterIds = [];
	for (var i = 0; i < teamMembers.length; i++) {
		var teamMember = teamMembers[i];
		switch (teamMember._type) {
			case 'FightTeamMemberMonsterInformations':
				monsterIds.push(teamMember.monsterId);
				break;
			case 'FightTeamMemberCharacterInformations':
			case 'FightTeamMemberWithAllianceCharacterInformations':
			case 'FightTeamMemberTaxCollectorInformations':
				//TODO
				break;
		}
	}

	staticContent.getDataMap('Monsters', monsterIds, function (error, monsterDataMap) {
		if (error) {
			return console.error(error);
		}
		var totalLevel = 0;
		var shortLvlText = getText('ui.common.short.level') + ' ';
		for (var i = 0; i < teamMembers.length; i++) {
			var teamMember = teamMembers[i];
			var element = self.teamMemberList.createChild('div', { className: 'teamMember' });
			switch (teamMember._type) {
				case 'FightTeamMemberMonsterInformations':
					var grade = teamMember.grade;
					var monsterInfo = monsterDataMap[teamMember.monsterId];
					var level = monsterInfo.grades[grade - 1].level;
					totalLevel += level;
					element.setText(monsterInfo.nameId + ' (' + shortLvlText + level + ')');

					if (monsterInfo.id === 3451) { // 3451 is alliance prism
						self.isAlliancePrismFight = true;
					}
					break;
				case 'FightTeamMemberCharacterInformations':
				case 'FightTeamMemberWithAllianceCharacterInformations':
					//TODO for FightTeamMemberWithAllianceCharacterInformations we should show alliance information I guess
					totalLevel += teamMember.level;
					element.setText(teamMember.name + ' (' + shortLvlText + teamMember.level + ')');
					break;
				case 'FightTeamMemberTaxCollectorInformations':
					self.isTaxCollectorFight = true;
					break;
			}
		}
		self.header.setText(getText('ui.common.rank', totalLevel));
		onContentReady();
	});
};





/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuFightTeam/index.js
 ** module id = 296
 ** module chunks = 0
 **/