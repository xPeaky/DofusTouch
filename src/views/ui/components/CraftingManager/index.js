var ExchangeReplayStopReasonEnum = require('ExchangeReplayStopReasonEnum');
var ExchangeTypeEnum = require('ExchangeTypeEnum');
var getText = require('getText').getText;
var mutualPopup = require('mutualPopup');
var windowsManager = require('windowsManager');

exports.SMITHMAGIC_RUNE_ID = 78;
exports.SMITHMAGIC_POTION_ID = 26;
exports.SIGNATURE_RUNE_ID = 7508;
exports.SIGNATURE_AVAILABLE_LEVEL = 100;

var sourceName = '';
var targetName = '';

function displayRequestExchangePopup(msg) {
	var role = msg.role;

	var data = mutualPopup.setupNames(msg.otherId, msg.initiatorId);
	if (!data) {
		return console.error('MultiCraft: setupNames');
	}

	sourceName = data.sourceName;
	targetName = data.targetName;

	mutualPopup.setupCancelPopupTexts({
		title: getText('ui.common.exchange'),
		message: getText('ui.craft.waitForCraftClient', targetName)
	});
	if (role === ExchangeTypeEnum.MULTICRAFT_CUSTOMER) {
		mutualPopup.setupConfirmPopupTexts({
			title: getText('ui.common.exchange'),
			message: getText('ui.craft.CrafterAskCustomer', sourceName)
		});
	} else if (role === ExchangeTypeEnum.MULTICRAFT_CRAFTER) {
		mutualPopup.setupConfirmPopupTexts({
			title: getText('ui.common.exchange'),
			message: getText('ui.craft.CustomerAskCrafter', sourceName)
		});
	}

	mutualPopup.askingExchangePopup();
}

function openCrafting(msg) {
	var skillId = msg.skillId;

	window.gui.playerData.jobs.prepareSkillRecipes(skillId, function (error) {
		if (error) {
			return console.error('Craft: prepareSkillRecipes', skillId, error);
		}

		var jobModule = window.gui.playerData.jobs;
		var skill = jobModule.getSkill(skillId);

		if (skill.isForgemagus || skill.modifiableItemType !== -1) {
			windowsManager.openDialog(['craftMagus', 'craftInventory'], {
				type: 'craftMagus',
				msg: msg
			});
		} else if (skillId === jobModule.SKILLID_DECRAFT) {
			windowsManager.openDialog(['crafting', 'craftInventory'], {
				type: 'decrafting',
				msg: msg
			});
		} else if (skillId === jobModule.SKILLID_WRAP_GIFT) {
			windowsManager.openDialog(['crafting', 'craftInventory'], {
				type: 'wrapping',
				msg: msg
			});
		} else {
			windowsManager.openDialog(['crafting', 'craftInventory'], {
				type: 'crafting',
				msg: msg
			});
		}
	});
}

function openMultiCrafting(msg, options) {
	var skillId = msg.skillId;

	window.gui.playerData.jobs.prepareSkillRecipes(skillId, function (error) {
		if (error) {
			return console.error('MultiCraft: prepareSkillRecipes', skillId, error);
		}

		var skill = window.gui.playerData.jobs.getSkill(skillId);

		if (skill.isForgemagus || skill.modifiableItemType !== -1) {
			return windowsManager.continueDialog(['craftMagusMulti', 'craftInventory'], {
				type: 'craftMagus',
				isCrafter: options.isCrafter,
				sourceName: sourceName,
				targetName: targetName,
				msg: msg
			});
		}

		windowsManager.continueDialog(['craftingMulti', 'craftInventory'], {
			type: 'crafting',
			isCrafter: options.isCrafter,
			sourceName: sourceName,
			targetName: targetName,
			msg: msg
		});
	});
}

exports.initialize = function (gui) {
	gui.on('ExchangeOkMultiCraftMessage', displayRequestExchangePopup);
	gui.on('ExchangeStartOkCraftWithInformationMessage', openCrafting);
	gui.on('ExchangeStartOkMulticraftCrafterMessage', function (msg) {
		openMultiCrafting(msg, { isCrafter: true });
	});
	gui.on('ExchangeStartOkMulticraftCustomerMessage', function (msg) {
		openMultiCrafting(msg, { isCrafter: false });
	});
};

exports.displayAutoCraftStopReasonMessage = function (reason) {
	var autoCraftStoppedMessage = '';
	var showPopup = true;

	switch (reason) {
	case ExchangeReplayStopReasonEnum.STOPPED_REASON_OK:
		autoCraftStoppedMessage = getText('ui.craft.autoCraftStopedOk');
		break;

	case ExchangeReplayStopReasonEnum.STOPPED_REASON_USER:
		autoCraftStoppedMessage = getText('ui.craft.autoCraftStoped');
		showPopup = false;
		break;

	case ExchangeReplayStopReasonEnum.STOPPED_REASON_MISSING_RESSOURCE:
		autoCraftStoppedMessage = getText('ui.craft.autoCraftStopedNoRessource');
		break;

	case ExchangeReplayStopReasonEnum.STOPPED_REASON_IMPOSSIBLE_CRAFT:
		autoCraftStoppedMessage = getText('ui.craft.autoCraftStopedInvalidRecipe');
		break;
	}

	var gui = window.gui;

	if (showPopup) {
		gui.openSimplePopup(autoCraftStoppedMessage, getText('ui.popup.information'));
	}
	if (autoCraftStoppedMessage) {
		gui.chat.logMsg(autoCraftStoppedMessage);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/CraftingManager/index.js
 ** module id = 461
 ** module chunks = 0
 **/