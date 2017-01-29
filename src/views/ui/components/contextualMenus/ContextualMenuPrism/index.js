var allianceManager = require('allianceManager');
var ContextualMenu = require('contextualMenus/ContextualMenu');
var EntityBanner = require('contextualMenus/EntityBanner');
var getText = require('getText').getText;
var GuildRightsBitEnum = require('guildManager').GuildRightsBitEnum;
var inherits = require('util').inherits;
var PrismStateEnum = require('PrismStateEnum');
var DofusDate = require('timeManager').DofusDate;
var windowsManager = require('windowsManager');


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuPrism() {
	ContextualMenu.call(this);

	var banner, prism, attack, modify, openingData, teleport, npcDialog, name;
	//var sabotage;

	this.once('open', function () {
		banner = this.header.appendChild(new EntityBanner());

		this._addEntry(getText('ui.common.talk'), function () {
			npcDialog.prepareDialog(openingData.npcData);

			window.dofus.sendMessage('NpcGenericActionRequestMessage', {
				npcId: openingData.contextualId,
				npcActionId: 3,
				npcMapId: window.gui.playerData.position.mapId
			});
		});

		teleport = this._addEntry(getText('ui.common.teleport'), function () {
			window.dofus.sendMessage('PrismUseRequestMessage');
		});

		attack = this._addEntry(getText('ui.common.attack'), function () {
			window.dofus.sendMessage('PrismAttackRequestMessage');
		});

		/*sabotage = this._addEntry(getTrext('ui.prism.sabotage'), function () {
			var gui = window.gui;

			gui.openConfirmPopup({
				title: getaText('ui.popup.warning'),
				message: getaText('ui.prism.sabotageConfirm',
					gui.playerData.position.subArea.nameId,
					getNextVulnerableDate(prism.nextVulnerabilityDate)),
				cb: function (result) {
					if (!result) {
						return;
					}

					window.dofus.sendMessage('PrismSetSabotagedRequestMessage', { subAreaId: gui.playerData.position.subAreaId });
				}
			});
		});*/

		modify = this._addEntry(getText('ui.common.modify'), function () {
			// TODO chat
			windowsManager.open('social', { tabId: 'alliance', tabParams: { tabId: 'conquests' } });
		});

		this._addCancel();

		window.gui.on('AlliancePrismDialogQuestionMessage', function () {
			var vulneStart = new DofusDate(prism.nextVulnerabilityDate).getServerDate().toString();
			var params = [name, allianceManager.prismState[prism.state], vulneStart.date + ' ' + vulneStart.time, 0];

			// 15428 is hard coded in ankama's code
			npcDialog.nextQuestionAsync(15428, [], params);
		});
	});

	this.on('open', function (data, contentReady) {
		openingData = data;
		npcDialog = window.gui.npcDialogHandler;

		var alliance;

		var playerData = window.gui.playerData;

		prism = data.prism;
		if (prism._type === 'AlliancePrismInformation') {
			alliance = data.prism.alliance;
			name = alliance.allianceName;
			banner.setContent({ alliance: alliance });

			// TODO this if should be removed in 2.15 the pb is the server sends back 'AlliancePrismInformation' data when
			// you create your own prism -_-
			if (!playerData.alliance.hasAlliance() || playerData.alliance.current.allianceId !== alliance.allianceId) {
				attack.show();

				if (playerData.isAlive() && prism.state === PrismStateEnum.PRISM_STATE_NORMAL) {
					attack.enable();
				} else {
					attack.disable();
				}

				modify.hide();
			} else {
				attack.hide();

				// TODO this should also be removed in 2.15 for the same reason. just display attack and hide modify
				modify.toggleDisplay(playerData.guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_SET_ALLIANCE_PRISM));
			}

			teleport.hide();
			//sabotage.hide();
		} else {
			alliance = window.gui.playerData.alliance.current;
			name = alliance.allianceName;
			banner.setContent({ alliance: alliance });

			attack.hide();

			teleport.toggleDisplay(prism.hasTeleporterModule);

			if (playerData.guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_SET_ALLIANCE_PRISM)) {
				modify.show();

				/*sabotage.show();
				if (prism.state !== PrismStateEnum.PRISM_STATE_NORMAL) {
					sabotage.disable();
				} else {
					sabotage.enable();
				}*/
			} else {
				modify.hide();
				//sabotage.hide();
			}
		}

		contentReady();
	});
}

inherits(ContextualMenuPrism, ContextualMenu);
module.exports = ContextualMenuPrism;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuPrism/index.js
 ** module id = 421
 ** module chunks = 0
 **/