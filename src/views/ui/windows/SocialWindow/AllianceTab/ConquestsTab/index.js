require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var allianceManager = require('allianceManager');
var guildManager = require('guildManager');
var getText = require('getText').getText;
var GuildRightsBitEnum = require('guildManager').GuildRightsBitEnum;
var inherits = require('util').inherits;
var PrismStateEnum = require('PrismStateEnum');
var Table = require('TableV2');
var timeManager = require('timeManager');
var windowsManager = require('windowsManager');
var Button = require('Button');
var WuiDom = require('wuidom');

function ConquestsTab() {
	WuiDom.call(this, 'div', { className: 'ConquestsTab' });

	this.once('open', function () {
		this._createDom();
		this._setupEvents();
		this._updateConquests();
	});
}
inherits(ConquestsTab, WuiDom);
module.exports = ConquestsTab;

ConquestsTab.prototype._setupEvents = function () {
	var self = this;

	function selectCurrentPosition() {
		var currentSubAreaId = window.gui.playerData.position.subAreaId;

		if (self.table.hasRow(currentSubAreaId)) {
			self.table.selectRow(currentSubAreaId);
		} else {
			self.table.unSelectRow();
		}
	}

	this.on('open', selectCurrentPosition);

	var alliance = window.gui.playerData.alliance;
	alliance.on('prismUpdatedList', function (prism) {
		self.table.updateRows(prism);
		self._updateConquests();
		selectCurrentPosition();
	});

	alliance.on('prismDeletedList', function (subAreaIds) {
		self.table.delRows(subAreaIds);
		self._updateConquests();
		selectCurrentPosition();
	});

	this.on('allianceUpdated', function (alliance) {
		this.table.clearContent();
		this.table.addMap(alliance.prisms);
		this._updateConquests();
		this.table.setContentLoading(false);
		selectCurrentPosition();
	});

	this.on('allianceUpdateRequested', function () {
		this.table.setContentLoading(true);
	});

	this.table.addMap(alliance.current.prisms);
	selectCurrentPosition();
};


function createSetTimeButton(prism, vulnerableTime) {
	var button = new Button({ className: 'settings' }, function () {
		windowsManager.open('prismVulnerabilityDate', { prism: prism, vulnerableTime: vulnerableTime });
	});
	addTooltip(button, null, getText('ui.prism.changeVulnerabilityHour'));
	return button;
}

ConquestsTab.prototype._createDom = function () {
	this.conquestsInfo = this.createChild('div', { className: 'conquestsInfo' });
	var playerData = window.gui.playerData;

	function createVulnerabilityDateCell(prism) {
		var prismData = prism.prism;
		var vulnerableTime = new timeManager.DofusDate(prismData.nextVulnerabilityDate);
		var vulServer = vulnerableTime.getServerDate();
		var vulServerTime = vulServer.toString().time;
		var time;
		var canSetPrism = playerData.guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_SET_ALLIANCE_PRISM);
		if ((prismData.state === PrismStateEnum.PRISM_STATE_INVULNERABLE ||
			prismData.state === PrismStateEnum.PRISM_STATE_NORMAL) &&
			canSetPrism) {
			time = new WuiDom('div', { className: 'timeSetting' });

			var timeText = time.createChild('div', {
				text: vulServerTime
			});

			var guildInfo = guildManager.guilds[prismData.lastTimeSlotModificationAuthorGuildId];
			if (guildInfo) {
				addTooltip(timeText, getText('ui.prism.lastVulnerabilityChange',
						new timeManager.DofusDate(prismData.lastTimeSlotModificationDate).getLocalDate().toString().date,
						prismData.lastTimeSlotModificationAuthorName,
						guildInfo.guildName) + '\n' +
					getText('ui.prism.serverVulnerabilityHour') + ' : ' + vulServerTime + '\n' +
					getText('ui.prism.localVulnerabilityHour') + ' : ' + vulnerableTime.getLocalDate().toString().time
				);
			}
			time.appendChild(createSetTimeButton(prism, vulnerableTime));
		} else {
			time = vulServerTime;
		}
		return time;
	}

	function createStateCell(prism) {
		var prismData = prism.prism;
		var state = new WuiDom('div', { text: allianceManager.prismState[prismData.state] });
		var stateInfo = allianceManager.getPrismStateInfo(
			prismData.state,
			prismData.nextVulnerabilityDate * 1000 - Date.now()
		);
		addTooltip(state, stateInfo);
		return state;
	}

	function createNameCell(prism) {
		var enrichData = prism.enrichData;
		var name = new WuiDom('div', { text: enrichData.subAreaName + ' (' + enrichData.areaName + ')' });
		addTooltip(name, enrichData.isConquestVillage ? getText('ui.zaap.village') : getText('ui.zaap.prism'));
		return name;
	}

	this.table = this.appendChild(new Table(
		[
			{ id: 'subArea', header: getText('ui.map.subarea'), format: createNameCell,
				getContent: function (prism) { return prism.enrichData.subAreaName; },
				sort: true, defaultSorter: true
			},
			{ id: 'worldX', header: getText('ui.common.coordinatesSmall'), format: function (prism) {
					return prism.worldX + ',' + prism.worldY;
				}, sort: true
			},
			{ id: 'placementDate', header: getText('ui.social.guild.taxStartDate'), format: function (prism) {
					return new timeManager.DofusDate(prism.prism.placementDate).getServerDate().toString().date;
				}, getContent: function (prism) { return prism.prism.placementDate; }, sort: true
			},
			{ id: 'state', header: getText('ui.common.state'), format: createStateCell,
				getContent: function (prism) { return prism.prism.state; }, sort: true
			},
			{ id: 'nextVulnerabilityDate', header: getText('ui.prism.startVulnerability'),
				format: createVulnerabilityDateCell,
				getContent: function (prism) { return prism.prism.nextVulnerabilityDate; },
				sort: true
			}
		],
		'subAreaId',
		{ clickable: false }
	));
};

ConquestsTab.prototype._updateConquests = function () {
	var playerData = window.gui.playerData;
	var prisms = playerData.alliance.current.prisms;

	var nbZone = 0, nbVillage = 0;
	for (var subAreaId in prisms) {
		var prism = prisms[subAreaId];

		if (prism.mapId <= -1) {
			continue;
		}

		if (prism.enrichData.isConquestVillage) {
			nbVillage += 1;
		} else {
			nbZone += 1;
		}
	}

	if (nbZone === 0 && nbVillage === 0) {
		this.conquestsInfo.setText(getText('ui.alliance.noArea'));
	} else if (nbZone > 0 && nbVillage === 0) {
		this.conquestsInfo.setText(getText('ui.alliance.nbAreas', nbZone, nbZone));
	} else if (nbZone === 0 && nbVillage > 0) {
		this.conquestsInfo.setText(getText('ui.alliance.nbVillages', nbVillage, nbVillage));
	} else {
		this.conquestsInfo.setText(getText('ui.alliance.nbAreasAndVillages', nbZone, nbVillage, nbVillage + nbZone));
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/AllianceTab/ConquestsTab/index.js
 ** module id = 861
 ** module chunks = 0
 **/