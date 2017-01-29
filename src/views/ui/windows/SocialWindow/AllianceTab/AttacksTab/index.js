require('./styles.less');
var entityManager = require('socialEntityManager');
var getText = require('getText').getText;
var GuildInformationsTypeEnum = require('GuildInformationsTypeEnum');
var FightersInfo = require('SocialWindow/FightersInfo');
var ProgressBar = require('ProgressBar');
var inherits = require('util').inherits;
var Table = require('TableV2');
var WuiDom = require('wuidom');

var entityType = entityManager.entityType;
var fightingSide = entityManager.fightingSide;
var fightState = entityManager.fightState;

function AttacksTab() {
	WuiDom.call(this, 'div', { className: 'AttacksTab' });

	this.once('open', function () {
		this._createDom();
		this._setupEvents();
	});

	this.on('open', function () {
		this._loadCurrentPrismFight();
		this._updateFightCount();
		window.dofus.sendMessage('GuildGetInformationsMessage', {
			infoType: GuildInformationsTypeEnum.INFO_TAX_COLLECTOR_ALLIANCE
		});
	});

	this.on('close', function () {
		this.table.clearContent();
		window.dofus.sendMessage('GuildGetInformationsMessage', {
			infoType: GuildInformationsTypeEnum.INFO_TAX_COLLECTOR_LEAVE
		});
	});
}
inherits(AttacksTab, WuiDom);

var slotAction = {};
slotAction[entityType.prism] = function (fighter) {
	var fight = this.fight;
	if (fight.state !== entityManager.fightState.waitingForHelp) {
		return;
	}

	var subAreaId = fight.id;
	var playerId = window.gui.playerData.id;

	if (entityManager.isPlayerFightingFor(playerId, entityType.prism, subAreaId, fightingSide.allies)) {
		if (fighter && playerId === fighter.id) {
			window.dofus.sendMessage('PrismFightJoinLeaveRequestMessage', { subAreaId: subAreaId, join: false });
		}
	} else {
		if (fighter && fight.fighters[fightingSide.allies].length === 5) {
			window.dofus.sendMessage('PrismFightSwapRequestMessage', { subAreaId: subAreaId, targetId: fighter.id });
		} else {
			window.dofus.sendMessage('PrismFightJoinLeaveRequestMessage', { subAreaId: subAreaId, join: true });
		}
	}
};

slotAction[entityType.taxCollector] = function (fighter) {
	var fight = this.fight;
	if (fight.state !== entityManager.fightState.waitingForHelp) {
		return;
	}

	var collectorId = fight.id;
	var playerId = window.gui.playerData.id;

	if (entityManager.isPlayerFightingFor(playerId, entityType.taxCollector, collectorId, fightingSide.allies)) {
		if (fighter && playerId === fighter.id) {
			window.dofus.sendMessage('GuildFightLeaveRequestMessage', {
				taxCollectorId: collectorId,
				characterId: playerId
			});
		}
	} else {
		if (fighter && fight.fighters[fightingSide.allies].length === 5) {
			window.dofus.sendMessage('GuildFightTakePlaceRequestMessage', {
				taxCollectorId: collectorId,
				replacedCharacterId: fighter.id
			});
		} else {
			window.dofus.sendMessage('GuildFightJoinRequestMessage', { taxCollectorId: collectorId });
		}
	}
};


function updateTimerProgressBar(timerElm) {
	var remainSeconds = timerElm.remainSeconds;
	var totalWaitTime = timerElm.totalWaitTime;
	var timePassed = totalWaitTime - remainSeconds;
	timerElm.setValue(timePassed / totalWaitTime);
}

function clearFightStartTimer(timerElm) {
	clearInterval(timerElm.intervalId);
	timerElm.intervalId = null;
}

function registerFightStartTimer(timerElm, waitingForHelpInfo) {
	// time is in tenths of seconds, round them into seconds
	timerElm.totalWaitTime = Math.round(waitingForHelpInfo.waitTimeForPlacement / 10) || 1;
	timerElm.remainSeconds = Math.round(waitingForHelpInfo.timeLeftBeforeFight / 10) || 0;

	timerElm.intervalId = setInterval(function () {
		timerElm.remainSeconds -= 1;

		if (timerElm.remainSeconds > 0) {
			updateTimerProgressBar(timerElm);
		} else {
			clearFightStartTimer(timerElm);
		}
	}, 1000);

	updateTimerProgressBar(timerElm);
}

function createTypeCell(fight) {
	var type;
	if (fight.type === entityType.prism) {
		var prism = entityManager.getAttackedEntity(fight);
		var enrichData = prism.enrichData;
		type = enrichData.isConquestVillage ? 'village' : 'prism';
	} else {
		type = fight.type;
	}
	return new WuiDom('div', { className: ['type', type] });
}

function createTargetCell(fight) {
	var entity = entityManager.getAttackedEntity(fight);
	var enrichData = entity.enrichData;

	var target = new WuiDom('div', { className: 'target' });
	target.createChild('div', { text: entity.getName() });
	target.createChild('div', { text: enrichData.subAreaName + ' ' + entity.getPosition() });

	if (fight.type === entityType.prism) {
		target.createChild('div', { text: getText('ui.prism.placed', entity.getPlacementDate()) });
	} else {
		target.createChild('div', {
			className: 'owner',
			text: getText('ui.common.guild') + getText('ui.common.colon') + entity.getGuild().guildName
		});
	}

	return target;
}

function createTimerCell(fight) {
	var timer = new ProgressBar({ vertical: true, className: ['green', 'timer'] });
	if (fight.waitingForHelpInfo) {
		registerFightStartTimer(timer, fight.waitingForHelpInfo);
	}

	timer.on('destroy', function () {
		clearFightStartTimer(timer);
	});

	return timer;
}

function createFighterInfoCell(fight) {
	var entity = entityManager.getAttackedEntity(fight);

	var fightersInfo = new FightersInfo();
	fightersInfo.setFight(fight.type, fight);
	if (entity.look) {
		fightersInfo.setTarget({
			id: fight.id,
			entityLook: entity.look,
			name: entity.getName(),
			level: entity.level
		});
	}

	fightersInfo.on('slotTap', slotAction[fight.type]);
	return fightersInfo;
}

AttacksTab.prototype._createDom = function () {
	this.table = this.appendChild(new Table(
		[
			{ id: 'type', format: createTypeCell },
			{
				id: 'target',
				header: getText('ui.common.name') + ' / ' + getText('ui.common.localisation'),
				format: createTargetCell
			},
			{ id: 'timer', format: createTimerCell },
			{
				id: 'fightersInfo',
				header: getText('ui.common.defenders') + ' / ' + getText('ui.common.attackers'),
				format: createFighterInfoCell
			}
		],
		'id',
		{ clickable: false }
	));

	this.currentFights = this.createChild('div', { className: 'currentFights' });

	this.createChild('div', { className: 'howTo', text: getText('ui.alliance.howToDefend') });
};

AttacksTab.prototype._updateFightCount = function () {
	var fightCount = this.table.getRowCount();
	this.currentFights.setText(getText('ui.alliance.currentFights', fightCount, fightCount));
};

AttacksTab.prototype._loadCurrentPrismFight = function () {
	var fights = entityManager.fights.prism;
	for (var fightId in fights) {
		var fight = fights[fightId];
		if (fight.state === fightState.waitingForHelp) {
			if (!this.table.hasRow(fight.id)) {
				this.table.addRow(fight);
			}
		}
	}
};


AttacksTab.prototype._setupEvents = function () {
	var self = this;

	entityManager.on('fightStarted', function (type, fight) {
		if (!self.isVisible()) { return; }

		if (fight.state !== fightState.waitingForHelp) {
			return;
		}

		self.table.addRow(fight);
		self._updateFightCount();
	});

	function removeFight(fightId) {
		if (!self.isVisible() || !self.table.hasRow(fightId)) { return; }
		self.table.delRow(fightId);
		self._updateFightCount();
	}

	entityManager.on('fighting', function (type, fight) {
		removeFight(fight.id);
	});

	entityManager.on('fightEnded', function (type, fightId) {
		removeFight(fightId);
	});

	entityManager.on('fighterList', function (type, fightId, side, fighterList) {
		if (!self.isVisible() || !self.table.hasRow(fightId)) { return; }
		self.table.getCell(fightId, 'fightersInfo').setFighters(side, fighterList);
	});

	entityManager.on('fighterJoined', function (type, fightId, side, fighter, position) {
		if (!self.isVisible() || !self.table.hasRow(fightId)) { return; }
		self.table.getCell(fightId, 'fightersInfo').setFighter(side, fighter, position);
	});

	entityManager.on('fightTarget', function (type, fightId, target) {
		if (!self.isVisible()) { return; }
		if (type !== entityType.prism || !self.table.hasRow(fightId)) { return; }

		self.table.getCell(fightId, 'fightersInfo').setTarget({
			id: target.id,
			entityLook: target.look,
			name: target.getName(),
			level: target.level
		});
	});

	entityManager.on('fighterLeft', function (type, fightId, side, fighterId, position) {
		if (!self.isVisible() || !self.table.hasRow(fightId)) { return; }
		self.table.getCell(fightId, 'fightersInfo').removeFighter(side, position);
	});
};

module.exports = AttacksTab;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/AllianceTab/AttacksTab/index.js
 ** module id = 863
 ** module chunks = 0
 **/