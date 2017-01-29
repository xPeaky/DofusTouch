var enums = require('./enums.js');
var guildManager = require('guildManager');
var fightState = enums.fightState;
var getText = require('getText').getText;
var helper = require('helper');
var taxCollectorStateEnum = { NORMAL: 0, WAITING_FOR_HELP: 1, FIGHTING: 2 }; // TODO use the real one one day ? sniff
var TaxCollectorErrorReasonEnum = require('TaxCollectorErrorReasonEnum');
var channelsEnum = require('ChatActivableChannelsEnum');

function getTaxCollectorFightingState(value) {
	switch (value) {
	case taxCollectorStateEnum.WAITING_FOR_HELP:
		return fightState.waitingForHelp;
	case taxCollectorStateEnum.FIGHTING:
		return fightState.fighting;
	default:
		return fightState.noFight;
	}
}

function TaxCollector(info) {
	this.id = info.uniqueId;
	this.level = 0;
	this.updateInfo(info);
}
exports.TaxCollector = TaxCollector;

TaxCollector.prototype.updateInfo = function (info) {
	for (var property in info) {
		this[property] = info[property];
	}
	this.fightState = getTaxCollectorFightingState(info.state);

	var helpInfo = helper.getObjectInArrayById(info.complements, '_type', 'TaxCollectorWaitingForHelpInformations');
	if (helpInfo) {
		this.waitingForHelpInfo = helpInfo.waitingForHelpInfo;
	}

	var ownerInfo = helper.getObjectInArrayById(info.complements, '_type', 'TaxCollectorGuildInformations');
	if (ownerInfo) {
		this.guildId = ownerInfo.guild.guildId;
		this.level = guildManager.guilds[this.guildId].guildLevel;
	}
};

TaxCollector.prototype.getGuild = function () {
	return guildManager.guilds[this.guildId];
};

TaxCollector.prototype.getName = function () {
	return this.enrichData.firstName + ' ' + this.enrichData.lastName;
};

TaxCollector.prototype.getPosition = function () {
	return this.worldX + ',' + this.worldY;
};


exports.setupEvents = function () {
	var gui = window.gui;
	gui.on('TaxCollectorMovementMessage', function (msg) {
		var basicInfos = msg.basicInfos;
		var enrichData = basicInfos.enrichData || {};

		var taxCollectorName = enrichData.firstName + ' ' + enrichData.lastName;
		var worldPointsText = basicInfos.worldX + ',' + basicInfos.worldY;
		var chatText = '';

		if (msg.hireOrFire) {
			chatText = getText('ui.social.TaxCollectorAdded', taxCollectorName, worldPointsText, msg.playerName);
		} else {
			chatText = getText('ui.social.TaxCollectorRemoved', taxCollectorName, worldPointsText, msg.playerName);
		}

		window.gui.chat.logMsg(chatText, channelsEnum.CHANNEL_GUILD);
	});

	// TODO: clickable on the perceptor name and will open the guild perceptor window
	gui.on('TaxCollectorAttackedMessage', function (msg) {
		var enrichData = msg.enrichData;

		var taxCollectorName = enrichData.firstName + ' ' + enrichData.lastName;
		var worldPointsText = msg.worldX + ',' + msg.worldY;

		window.gui.chat.logMsg(
			getText('ui.social.TaxCollectorAttacked', taxCollectorName, worldPointsText),
			channelsEnum.CHANNEL_GUILD
		);
	});

	gui.on('TaxCollectorErrorMessage', function (msg) {
		var errorText;

		switch (msg.reason) {
		case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_ALREADY_ONE :
			errorText = getText('ui.social.alreadyTaxCollectorOnMap');
			break;
		case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_CANT_HIRE_HERE :
			errorText = getText('ui.social.cantHireTaxCollecotrHere');
			break;
		case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_CANT_HIRE_YET :
			errorText = getText('ui.social.cantHireTaxcollectorTooTired');
			break;
		case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_ERROR_UNKNOWN :
			errorText = getText('ui.social.unknownErrorTaxCollector');
			break;
		case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_MAX_REACHED :
			errorText = getText('ui.social.cantHireMaxTaxCollector');
			break;
		case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_NO_RIGHTS :
			errorText = getText('ui.social.taxCollectorNoRights');
			break;
		case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_NOT_ENOUGH_KAMAS :
			errorText = getText('ui.social.notEnougthRichToHireTaxCollector');
			break;
			/* Note: Commented out because currently not available in the dictionary
			case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_NOT_FOUND :
			errorText = getTexte('ui.social.taxCollectorNotFound');
			break;
			 */
		case TaxCollectorErrorReasonEnum.TAX_COLLECTOR_NOT_OWNED :
			errorText = getText('ui.social.notYourTaxcollector');
			break;
		}

		if (errorText) {
			var chat = window.gui.chat;
			chat.logError(errorText);
		}
	});

	gui.on('TaxCollectorAttackedResultMessage', function (msg) {
		var basicInfos = msg.basicInfos;
		var enrichData = basicInfos.enrichData || {};

		var taxCollectorName = enrichData.firstName + ' ' + enrichData.lastName;
		var worldPointsText = basicInfos.worldX + ',' + basicInfos.worldY;

		var chatText;

		if (msg.deadOrAlive) {
			chatText = getText('ui.social.TaxCollectorDied', taxCollectorName, worldPointsText);
		} else {
			chatText = getText('ui.social.TaxCollectorSurvived', taxCollectorName, worldPointsText);
		}

		window.gui.chat.logMsg(chatText, channelsEnum.CHANNEL_GUILD);
	});

	gui.on('ExchangeGuildTaxCollectorGetMessage', function (msg) {
		var objectsInfos = msg.objectsInfos || [];
		var resourcesText = '';

		for (var i = 0; i < objectsInfos.length; i += 1) {
			if (resourcesText) {
				resourcesText += ', ';
			}

			var item = objectsInfos[i];
			var itemEnrichData = item.enrichData || {};
			resourcesText += item.quantity + 'x' + itemEnrichData.itemName;
		}

		var resourcesXpText = '';
		if (resourcesText) {
			resourcesXpText = getText('ui.social.thingsTaxCollectorGet', resourcesText, msg.experience);
		} else {
			resourcesXpText = getText('ui.social.xpTaxCollectorGet', msg.experience);
		}

		var enrichData = msg.enrichData || {};

		var chatText = getText('ui.social.taxcollectorRecolted', enrichData.firstName + ' ' + enrichData.lastName,
			'(' + msg.worldX + ', ' + msg.worldY + ')', msg.userName, resourcesXpText);

		window.gui.chat.logMsg(chatText, channelsEnum.CHANNEL_GUILD);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/socialEntityManager/taxCollector.js
 ** module id = 336
 ** module chunks = 0
 **/