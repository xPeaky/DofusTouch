var Alliance = require('./Alliance.js');
var getText = require('getText').getText;
var SocialGroupCreationResultEnum = require('SocialGroupCreationResultEnum');
var windowsManager = require('windowsManager');

exports.alliances = {};

exports.createAlliance = function (allianceInfo) {
	var alliance = new Alliance(allianceInfo);
	exports.alliances[alliance.allianceId] = alliance;
	return alliance;
};

exports.initialize = function (gui) {
	gui.on('disconnect', function () {
		exports.alliances = {};
	});

	gui.on('PrismSettingsErrorMessage', function () {
		gui.chat.logMsg(getText('ui.error.cantModifiedPrismVulnerabiltyHour'));
	});

	gui.on('AllianceCreationResultMessage', function (msg) {
		switch (msg.result) {
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_ALREADY_IN_GROUP :
			return window.gui.openSimplePopup(getText('ui.alliance.alreadyInAlliance'));
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_OK:
			return windowsManager.close('socialGroupCreation');
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_NAME_ALREADY_EXISTS:
			return window.gui.openSimplePopup(getText('ui.alliance.alreadyUseName'));
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_NAME_INVALID:
			return window.gui.openSimplePopup(getText('ui.alliance.invalidName'));
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_TAG_ALREADY_EXISTS:
			return window.gui.openSimplePopup(getText('ui.alliance.alreadyUseTag'));
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_TAG_INVALID:
			return window.gui.openSimplePopup(getText('ui.alliance.invalidTag'));
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_EMBLEM_ALREADY_EXISTS:
			return window.gui.openSimplePopup(getText('ui.guild.AlreadyUseEmblem'));
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_REQUIREMENT_UNMET:
			return window.gui.openSimplePopup(getText('ui.guild.requirementUnmet'));
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_EMBLEM_INVALID :
		case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_UNKNOWN :
			return window.gui.openSimplePopup(getText('ui.common.unknownFail'));
		}
	});

	gui.on('AllianceFactsMessage', function (allianceFact) {
		windowsManager.getWindow('allianceCard').display(allianceFact);
	});

	gui.on('AllianceFactsErrorMessage', function () {
		gui.chat.logMsg(getText('ui.alliance.doesntExistAnymore'));
	});

	exports.prismState = {
		0: getText('ui.prism.state0'),
		1: getText('ui.prism.state1'),
		2: getText('ui.prism.state2'),
		3: getText('ui.prism.state3'),
		4: getText('ui.prism.state4'),
		5: getText('ui.prism.state5'),
		6: getText('ui.prism.state6')
	};

	exports.getPrismStateInfo = function (state, param) {
		switch (state) {
		case 0:
			return getText('ui.prism.stateInfos0');
		case 1:
			return getText('ui.prism.stateInfos1');
		case 2:
			return getText('ui.prism.stateInfos2');
		case 3:
			return getText('ui.prism.stateInfos3');
		case 4:
			return getText('ui.prism.stateInfos4', param);
		case 5:
			return getText('ui.prism.stateInfos5');
		case 6:
			return getText('ui.prism.stateInfos6');
		}
	};
};

exports.openAllianceCard = function (allianceId) {
	window.dofus.sendMessage('AllianceFactsRequestMessage', { allianceId: allianceId });
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/allianceManager/index.js
 ** module id = 422
 ** module chunks = 0
 **/