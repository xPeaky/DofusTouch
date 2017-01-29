var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;
var intToString = require('helper').intToString;
var staticContent = require('staticContent');
var EntityBanner = require('contextualMenus/EntityBanner');
var GuildRightsBitEnum = require('guildManager').GuildRightsBitEnum;

var nameSettings = {
	firstName: {
		dbName: 'TaxCollectorFirstnames',
		attribute: 'firstnameId',
		cached: {}
	},
	lastName: {
		dbName: 'TaxCollectorNames',
		attribute: 'nameId',
		cached: {}
	}
};

function getName(type, id, cb) {
	var settings = nameSettings[type];
	var name = settings.cached[id];
	if (name) {
		return cb(name);
	}

	staticContent.getData(settings.dbName, id, function (error, res) {
		if (error) {
			console.warn('ContextualMenuTaxCollector', error);
			return cb('');
		}

		name = settings.cached[id] = res[settings.attribute];
		cb(name);
	});
}

var taxCollectorDialogId = {
	guild: 1,
	basic: 2,
	alliance: 15427
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuTaxCollector() {
	ContextualMenu.call(this);

	var attack, collect, banner, openingData, name, npcDialog;

	var guildData = window.gui.playerData.guild;

	function requestAction() {
		if (this.actionId === 3) {
			npcDialog.prepareDialog(openingData.npcData);
		}

		window.dofus.sendMessage('NpcGenericActionRequestMessage', {
			npcId: openingData.contextualId,
			npcActionId: this.actionId,
			npcMapId: openingData.mapId
		});
	}

	this.once('open', function (data) {
		npcDialog = window.gui.npcDialogHandler;
		banner = this.header.appendChild(new EntityBanner());

		var npcData = data.npcData;
		for (var i = 0, len = npcData.actions.length; i < len; i += 1) {
			var entry = this._addEntry(npcData.actionsName[i], requestAction);
			entry.actionId = npcData.actions[i];
		}

		collect = this._addEntry(getText('ui.social.CollectTaxCollector'), function () {
			window.dofus.sendMessage('ExchangeRequestOnTaxCollectorMessage', {
				taxCollectorId: openingData.contextualId
			});
		});

		attack = this._addEntry(getText('ui.common.attack'), function () {
			window.dofus.sendMessage('GameRolePlayTaxCollectorFightRequestMessage', {
				taxCollectorId: openingData.contextualId
			});
		});

		this._addCancel();

		function getParams(msg) {
			var params = [
				msg.guildInfo.guildName
			];

			if (msg.maxPods) {
				params.push(msg.maxPods);
				params.push(msg.prospecting);
				params.push(msg.wisdom);
				params.push(msg.taxCollectorsCount);
				params.push(intToString(msg.kamas));
				params.push(intToString(msg.experience));
				params.push(intToString(msg.pods));
				params.push(intToString(msg.itemsValue));
			}

			var allianceData = msg.alliance;
			if (allianceData) {
				params.push(allianceData.allianceName !== '#NONAME#' ? allianceData.allianceName : getText('ui.guild.noName'));
				params.push(
					'[' +
					(allianceData.allianceTag !== '#TAG#' ? allianceData.allianceTag : getText('ui.alliance.noTag')) +
					']'
				);
			}

			return params;
		}

		window.gui.on('TaxCollectorDialogQuestionExtendedMessage', function (msg) {
			npcDialog.nextQuestionAsync(taxCollectorDialogId.guild, [], getParams(msg));
		});

		window.gui.on('TaxCollectorDialogQuestionBasicMessage', function (msg) {
			npcDialog.nextQuestionAsync(taxCollectorDialogId.basic, [], getParams(msg));
		});

		window.gui.on('AllianceTaxCollectorDialogQuestionExtendedMessage', function (msg) {
			npcDialog.nextQuestionAsync(taxCollectorDialogId.alliance, [], getParams(msg));
		});
	});

	this.on('open', function (data, contentReady) {
		openingData = data;

		if (guildData.hasGuild() && data.guild.guildId === guildData.current.guildId) {
			collect.show();
			var canCollectAny = guildData.hasRight(GuildRightsBitEnum.GUILD_RIGHT_COLLECT);
			var canCollectOwn = guildData.hasRight(GuildRightsBitEnum.GUILD_RIGHT_COLLECT_MY_TAX_COLLECTOR);
			if (canCollectAny || canCollectOwn) {
				collect.enable();
			} else {
				collect.disable();
			}

			attack.hide();
		} else {
			collect.hide();

			attack.show();
			if (data.taxCollectorAttack !== 0) {
				attack.disable();
			} else {
				attack.enable();
			}
		}

		getName('firstName', data.taxCollector.firstNameId, function (firstName) {
			getName('lastName', data.taxCollector.lastNameId, function (lastName) {
				name = firstName + ' ' + lastName;
				openingData.npcData.nameId = name;
				banner.setContent({
					name: name,
					guild: data.guild
				});

				contentReady();
			});
		});
	});
}

inherits(ContextualMenuTaxCollector, ContextualMenu);
module.exports = ContextualMenuTaxCollector;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuTaxCollector/index.js
 ** module id = 428
 ** module chunks = 0
 **/