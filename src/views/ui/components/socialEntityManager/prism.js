var enums = require('./enums.js');
var fightState = enums.fightState;
var getText = require('getText').getText;
var PrismStateEnum = require('PrismStateEnum');
var channelsEnum = require('ChatActivableChannelsEnum');
var timeManager = require('timeManager');

function getPrismFightingState(value) {
	switch (value) {
	case PrismStateEnum.PRISM_STATE_ATTACKED:
		return fightState.waitingForHelp;
	case PrismStateEnum.PRISM_STATE_FIGHTING:
		return fightState.fighting;
	default:
		return fightState.noFight;
	}
}

function Prism(info) {
	for (var property in info) {
		this[property] = info[property];
	}
	this.id = info.subAreaId;

	this.fightState = info.prism ? getPrismFightingState(info.prism.state) : fightState.noFight;
}
exports.Prism = Prism;

Prism.prototype.updateInfo = function (info) {
	for (var property in info) {
		this[property] = info[property];
	}

	if (!info.prism) {
		delete this.prism;
		return;
	}

	var prismState = getPrismFightingState(info.prism.state);
	if (prismState === fightState.waitingForHelp &&
		this.fightState !== fightState.waitingForHelp) {
		// TODO notification (with a join button: see AllianceFrame 'warnOnGuildItemAgression')
		var name = info.enrichData.subAreaName + ' (' +  info.enrichData.areaName + ')';
		window.gui.chat.logMsg(
			getText('ui.prism.attacked', name, this.getPosition()),
			channelsEnum.CHANNEL_ALLIANCE
		);
	}

	var alliance = this.getAlliance();
	alliance.allianceEmblem.isAlliance = true; // for the EmblemLogo

	this.fightState = prismState;
};

Prism.prototype.getPlacementDate = function () {
	return new timeManager.DofusDate(this.prism.placementDate).getServerDate().toString().date;
};

Prism.prototype.getName = function () {
	var alliance = window.gui.playerData.alliance.current;
	return getText('ui.zaap.prism') + ' ' + alliance.allianceName;
};

Prism.prototype.getPosition = function () {
	return this.worldX + ',' + this.worldY;
};

Prism.prototype.getAlliance = function () {
	if (!this.prism) { return; }
	return this.prism._type === 'AllianceInsiderPrismInformation' ?
		window.gui.playerData.alliance.current :
		this.prism.alliance;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/socialEntityManager/prism.js
 ** module id = 344
 ** module chunks = 0
 **/