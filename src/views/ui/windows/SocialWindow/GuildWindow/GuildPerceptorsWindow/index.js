require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var addTooltip = require('TooltipBox').addTooltip;
var getText = require('getText').getText;
var GuildInformationsTypeEnum = require('GuildInformationsTypeEnum');
var helper = require('helper');
var FightersInfo = require('SocialWindow/FightersInfo');
var ProgressBar = require('ProgressBar');
var Table = require('Table');
var entityManager = require('socialEntityManager');

var entityType = entityManager.entityType;
var fightingSide = entityManager.fightingSide;


function GuildPerceptorsWindow() {
	WuiDom.call(this, 'div', { className: 'GuildPerceptorsWindow' });

	this.taxCollectorRows = {};

	this.once('open', function () {
		this._createDom();
		this._setupEvents();
	});

	this.on('open', function () {
		this.table.addClassNames('spinner');
		window.dofus.sendMessage('GuildGetInformationsMessage', {
			infoType: GuildInformationsTypeEnum.INFO_TAX_COLLECTOR_GUILD_ONLY
		});
	});

	this.on('close', function () {
		this._clearAllFightStartTimers();
		window.dofus.sendMessage('GuildGetInformationsMessage', {
			infoType: GuildInformationsTypeEnum.INFO_TAX_COLLECTOR_LEAVE
		});
	});
}

inherits(GuildPerceptorsWindow, WuiDom);
module.exports = GuildPerceptorsWindow;


GuildPerceptorsWindow.prototype._createDom = function () {
	var tableContainer = this.createChild('div', { className: 'tableContainer' });
	this.table = tableContainer.appendChild(new Table({
		headerContent: [
			'',
			getText('ui.common.name') + ' / ' + getText('ui.common.localisation'),
			'',
			getText('ui.common.defenders') + ' / ' + getText('ui.common.attackers')
		],
		colIds: ['fightState', 'taxCollectorInfo', 'timer', 'fightersInfo']
	}));

	this.perceptorAmountText = this.createChild('div', { className: 'rightAlignText' });
	this._setPerceptorsAmount(0, 0);

	this.createChild('div', {
		className: 'rightAlignText',
		text: getText('ui.social.guildHowDefendTax')
	});
};

GuildPerceptorsWindow.prototype._setupEvents = function () {
	var self = this;

	var maxTaxCollector = 0;
	entityManager.on('entityList', function (type, taxCollectorList, max) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }

		self.table.delClassNames('spinner');
		self._resetAll();

		for (var i = 0, len = taxCollectorList.length; i < len; i += 1) {
			self._addTaxCollector(taxCollectorList[i]);
		}

		maxTaxCollector = max;
		self._setPerceptorsAmount(taxCollectorList.length, max);
	});

	entityManager.on('entityAdded', function (type, taxCollector) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }

		self._addTaxCollector(taxCollector);
		self._setPerceptorsAmount(self.table.getRowCount(), maxTaxCollector);
	});

	entityManager.on('entityRemoved', function (type, collectorId) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }

		self._removeTaxCollector(collectorId);
		self._setPerceptorsAmount(self.table.getRowCount(), maxTaxCollector);
	});

	function getFightersInfo(fightId) {
		return self.taxCollectorRows[fightId] && self.taxCollectorRows[fightId].fightersInfo;
	}

	function getTimer(fightId) {
		return self.taxCollectorRows[fightId] && self.taxCollectorRows[fightId].timer;
	}

	entityManager.on('fightStarted', function (type, fight) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }
		var fightersInfo = getFightersInfo(fight.id);
		if (!fightersInfo) { return; }

		var taxCollector = entityManager.entities[type][fight.id];
		var enrichData = taxCollector.enrichData || {};
		fightersInfo.setFight(type, fight);
		fightersInfo.setTarget({
			id: fight.id,
			entityLook: taxCollector.look,
			name: enrichData.firstName + ' ' + enrichData.lastName,
			level: window.gui.playerData.guild.current.level
		});

		self._updateFightState(fight.id, fight.state);
		var timer = getTimer(fight.id);
		self._registerFightStartTimer(timer, fight.waitingForHelpInfo);
	});

	entityManager.on('fighting', function (type, fight) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }
		var timer = getTimer(fight.id);
		self._updateFightState(fight.id, fight.state);
		self._clearFightStartTimer(timer);
	});

	entityManager.on('fightEnded', function (type, fightId) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }
		var fightersInfo = getFightersInfo(fightId);
		if (!fightersInfo) { return; }

		self._updateFightState(fightId, entityManager.fightState.noFight);
		fightersInfo.reset();
	});

	entityManager.on('fighterList', function (type, fightId, side, fighterList) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }
		var fightersInfo = getFightersInfo(fightId);
		if (!fightersInfo) { return; }

		fightersInfo.setFighters(side, fighterList);
	});

	entityManager.on('fighterJoined', function (type, fightId, side, fighter, position) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }
		var fightersInfo = getFightersInfo(fightId);
		if (!fightersInfo) { return; }

		fightersInfo.setFighter(side, fighter, position);
	});

	entityManager.on('fighterLeft', function (type, fightId, side, fighterId, position) {
		if (!self.isVisible() || type !== entityType.taxCollector) { return; }
		var fightersInfo = getFightersInfo(fightId);
		if (!fightersInfo) { return; }

		fightersInfo.removeFighter(side, position);
	});
};

GuildPerceptorsWindow.prototype._setPerceptorsAmount = function (amount, maxAmount) {
	this.perceptorAmountText.setText(getText('ui.social.guild.taxCollectorCount', amount, maxAmount));
};

GuildPerceptorsWindow.prototype._setNameLocation = function (infoElm, taxCollector) {
	var enrichData = taxCollector.enrichData || {};
	var perceptorName = infoElm.getChild('name');
	perceptorName.setText(enrichData.firstName + ' ' + enrichData.lastName);

	var coordinateText = ' (' + taxCollector.worldX + ' , ' + taxCollector.worldY + ')';
	var location = infoElm.getChild('location');
	location.setText(enrichData.subAreaName + coordinateText);

	var complements = taxCollector.complements || [];
	var lootInfo = helper.getObjectInArrayById(complements, '_type', 'TaxCollectorLootInformations') || {};

	var podsText = getText('ui.common.short.weight', helper.intToString(lootInfo.pods || 0));
	var podsExperienceText =
		getText('ui.social.thingsTaxCollectorGet', podsText, helper.intToString(lootInfo.experience || 0));

	var resources = infoElm.getChild('resources');
	resources.setText(podsExperienceText);
};

GuildPerceptorsWindow.prototype._addFightStateToolTip = function (fightStateElm, collectorId) {
	addTooltip(fightStateElm, function () {
		var toolTipText = '';
		var perceptor = window.gui.playerData.guild.getPerceptor(collectorId);

		// TODO: uses enum for state here after it is available (TaxCollectorStateEnum)
		if (perceptor) {
			var info = perceptor.informations;
			var state = info.state || 0;

			if (state === 1) {
				toolTipText += getText('ui.social.guild.taxInEnterFight');
			} else if (state === 2) {
				toolTipText += getText('ui.social.guild.taxInFight');
			} else {
				toolTipText += getText('ui.social.guild.taxInCollect');
			}

			var additionalInfos = info.additionalInfos || {};

			toolTipText += '\n' + getText('ui.common.ownerWord') + getText('ui.common.colon');
			toolTipText += additionalInfos.collectorCallerName + '\n';
			toolTipText += getText('ui.social.guild.taxStartDate') + getText('ui.common.colon');

			var date = helper.getAlmanaxDate(additionalInfos.date * 1000);
			toolTipText += date.day + ' ' + date.monthName + ' ' + date.year + ' ' + date.hour + ':' + date.minute;
		}

		return new WuiDom('div', { text: toolTipText });
	});
};

GuildPerceptorsWindow.prototype._updateTimerProgressBar = function (timerElm) {
	var remainSeconds = timerElm.remainSeconds;
	var totalWaitTime = timerElm.totalWaitTime;
	var timePassed = totalWaitTime - remainSeconds;
	var timePassedValue = Math.round(timePassed / totalWaitTime * 100) / 100;
	timerElm.setValue(timePassedValue);
};

GuildPerceptorsWindow.prototype._registerFightStartTimer = function (timerElm, waitingForHelpInfo) {
	var self = this;

	if (!waitingForHelpInfo) {
		return;
	}

	// time is in tenths of seconds, round them into seconds
	timerElm.remainSeconds = Math.round(waitingForHelpInfo.timeLeftBeforeFight / 10) || 0;
	timerElm.totalWaitTime = Math.round(waitingForHelpInfo.waitTimeForPlacement / 10) || 1;

	timerElm.intervalId = setInterval(function () {
		timerElm.remainSeconds -= 1;

		if (timerElm.remainSeconds > 0) {
			self._updateTimerProgressBar(timerElm);
		} else {
			self._clearFightStartTimer(timerElm);
		}
	}, 1000);

	this._updateTimerProgressBar(timerElm);
};

GuildPerceptorsWindow.prototype._clearFightStartTimer = function (timerElm) {
	clearInterval(timerElm.intervalId);
	timerElm.intervalId = null;
	timerElm.remainSeconds = 0;
	timerElm.totalWaitTime = 0;
	timerElm.setValue(0);
};

GuildPerceptorsWindow.prototype._clearAllFightStartTimers = function () {
	var rows = this.table.getRows() || [];

	for (var i = 0; i < rows.length; i += 1) {
		var timer = rows[i].timer;
		this._clearFightStartTimer(timer);
	}
};

function taxCollectorAction(fighter) {
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
		if (fighter && fight.fighters.allies.length === 5) {
			window.dofus.sendMessage('GuildFightTakePlaceRequestMessage', {
				taxCollectorId: collectorId,
				replacedCharacterId: fighter.id
			});
		} else {
			window.dofus.sendMessage('GuildFightJoinRequestMessage', { taxCollectorId: collectorId });
		}
	}
}

GuildPerceptorsWindow.prototype._createTaxCollectorRow = function (taxCollector) {
	var collectorId = taxCollector.uniqueId;

	var fightState = new WuiDom('div', { className: ['fightState', 'state' + taxCollector.state] });
	this._addFightStateToolTip(fightState, collectorId);

	var taxCollectorInfo = new WuiDom('div', { className: 'taxCollectorInfo' });
	taxCollectorInfo.createChild('div', { name: 'name' });
	taxCollectorInfo.createChild('div', { name: 'location' });
	taxCollectorInfo.createChild('div', { name: 'resources' });

	this._setNameLocation(taxCollectorInfo, taxCollector);

	var timer = new ProgressBar({ vertical: true, className: ['green', 'timer'] });

	var fightersInfo = new FightersInfo();
	fightersInfo.on('slotTap', taxCollectorAction);

	return {
		fightState: fightState,
		taxCollectorInfo: taxCollectorInfo,
		timer: timer,
		fightersInfo: fightersInfo
	};
};

GuildPerceptorsWindow.prototype._addTaxCollector = function (taxCollector) {
	var collectorId = taxCollector.uniqueId;
	var row = this.table.addRow(this._createTaxCollectorRow(taxCollector), { collectorId: collectorId });
	this.taxCollectorRows[collectorId] = row;
};

GuildPerceptorsWindow.prototype._updateFightState = function (taxCollectorId, state) {
	var row = this.taxCollectorRows[taxCollectorId];
	if (!row) {
		return;
	}

	row.fightState.replaceClassNames(['state0', 'state1', 'state2'], ['state' + state]);
};

GuildPerceptorsWindow.prototype._removeTaxCollector = function (collectorId) {
	var row = this.taxCollectorRows[collectorId];
	if (!row) {
		return;
	}

	// clear the timer before deleting the row
	this._clearFightStartTimer(row.timer);

	delete this.taxCollectorRows[collectorId];

	var index = this.table.getRows().indexOf(row);
	this.table.delRow(index);
};

GuildPerceptorsWindow.prototype._resetAll = function () {
	this.taxCollectorRows = {};
	this._clearAllFightStartTimers();
	this.table.clearContent();
	this._setPerceptorsAmount(0, 0);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/GuildWindow/GuildPerceptorsWindow/index.js
 ** module id = 880
 ** module chunks = 0
 **/