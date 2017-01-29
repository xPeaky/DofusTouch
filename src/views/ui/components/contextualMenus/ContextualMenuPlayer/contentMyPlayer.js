var inherits = require('util').inherits;
var getText = require('getText').getText;
var Button = require('Button');
var WuiDom = require('wuidom');
var PartyTypeEnum = require('PartyTypeEnum');
var PlayerLifeStatusEnum = require('PlayerLifeStatusEnum');
var GameContextEnum = require('GameContextEnum');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var partyId;
var arenaId;
var followMe;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuUserContent(banner) {
	WuiDom.call(this, 'div', { className: 'ContextualMenuUserContent' });

	this.banner = banner;
	this._createDom();
}

inherits(ContextualMenuUserContent, WuiDom);
module.exports = ContextualMenuUserContent;

ContextualMenuUserContent.prototype._createDom = function () {
	var self = this;
	var container = this.createChild('div');

	this.freeSoul = container.appendChild(new Button(
		{ text: getText('ui.common.freeSoul'), className: 'cmButton', hidden: true },
		function () {
			window.dofus.sendMessage('GameRolePlayFreeSoulRequestMessage');
			self.emit('close');
		}
	));

	this.slapHimself = container.appendChild(new Button(
		{ text: getText('ui.dialog.slapHimself'), className: 'cmButton' },
		function () {
			window.dofus.sendMessage('ChatClientMultiMessage', { content: getText('ui.dialog.slapSentence'), channel: 0 });
			self.emit('close');
		}
	));

	this.organizeShop = container.appendChild(new Button(
		{ text: getText('ui.humanVendor.organizeShop'), className: 'cmButton' },
		function () {
			window.dofus.sendMessage('ExchangeRequestOnShopStockMessage');
			self.emit('close');
		}
	));

	this.switchToMerchantMode = container.appendChild(new Button(
		{ text: getText('ui.humanVendor.switchToMerchantMode'), className: 'cmButton' },
		function () {
			window.dofus.sendMessage('ExchangeShowVendorTaxMessage');
			self.emit('close');
		}
	));

	this.orientCharacter = container.appendChild(new Button(// TODO
		{ text: getText('ui.orientCharacter'), className: ['cmButton', 'disabled'] },
		function () {}
	));

	this.partyTitle = container.createChild('div', { text: getText('ui.common.party'), className: 'title', hidden: true });

	this.leaveParty = container.appendChild(new Button(
		{ text: getText('ui.party.leaveParty'), className: 'cmButton', hidden: true },
		function () {
			window.dofus.sendMessage('PartyLeaveRequestMessage', { partyId: partyId });
			self.emit('close');
		}
	));

	this.followMe = container.appendChild(new Button(
		{ text: getText('ui.party.followMeAll'), className: 'cmButton', hidden: true },
		function () {
			window.dofus.sendMessage('PartyFollowThisMemberRequestMessage', {
				partyId: partyId,
				playerId: window.gui.playerData.id,
				enabled: true
			});
			followMe = true;
			self.emit('close');
		}
	));

	this.stopFollowMe = container.appendChild(new Button(
		{ text: getText('ui.party.stopAllFollowingMe'), className: 'cmButton', hidden: true },
		function () {
			window.dofus.sendMessage('PartyFollowThisMemberRequestMessage', {
				partyId: partyId,
				playerId: window.gui.playerData.id,
				enabled: false
			});
			followMe = false;
			self.emit('close');
		})
	);

	var group = container.createChild('div', { className: 'group' });

	this.arenaTitle = group.createChild('div', { text: getText('ui.common.koliseum'), className: 'title', hidden: true });

	this.leaveArena = group.appendChild(new Button(
		{ text: getText('ui.party.arenaQuit'), className: 'cmButton', hidden: true },
		function () {
			window.dofus.sendMessage('PartyLeaveRequestMessage', { partyId: arenaId });
			self.emit('close');
		}
	));

	// Fight options
	this.fightReady = container.appendChild(new Button(
		{ text: getText('ui.banner.ready'), className: 'cmButton' },
		function () {
			window.gui.timeline.fightControlButtons.toggleReadyForFight();
			self.emit('close');
		}
	));
};

ContextualMenuUserContent.prototype.updateContent = function () {
	var playerData = window.gui.playerData;
	var partyTypes = playerData.partyData.partyTypes;

	this.banner.setContent({
		name: playerData.characterBaseInformations.name
	});

	partyId = partyTypes[PartyTypeEnum.PARTY_TYPE_CLASSICAL].id;
	arenaId = partyTypes[PartyTypeEnum.PARTY_TYPE_ARENA].id;

	this.freeSoul.hide();
	this.slapHimself.hide();
	this.organizeShop.hide();
	this.switchToMerchantMode.hide();
	this.orientCharacter.hide();
	this.partyTitle.hide();
	this.leaveParty.hide();
	this.arenaTitle.hide();
	this.leaveArena.hide();
	this.followMe.hide();
	this.stopFollowMe.hide();
	this.fightReady.hide();

	if (playerData.state === PlayerLifeStatusEnum.STATUS_TOMBSTONE) {
		this.freeSoul.show();
	} else if (window.gui.gameContext === GameContextEnum.ROLE_PLAY) {
		this.slapHimself.show();
		if (window.gui.uiLocker.isFeatureAvailable('myShop')) {
			this.organizeShop.show();
			this.switchToMerchantMode.show();
		}
		this.orientCharacter.show();
	}

	if (partyId) {
		this.partyTitle.show();
		this.leaveParty.show();

		if (partyTypes[PartyTypeEnum.PARTY_TYPE_CLASSICAL].leaderId === playerData.id) {
			if (followMe) {
				this.followMe.hide();
				this.stopFollowMe.show();
				return;
			}

			this.followMe.show();
			this.stopFollowMe.hide();
		}
	}

	if (arenaId) {
		this.arenaTitle.show();
		this.leaveArena.show();
	}

	if (window.gui.timeline.fightControlButtons.isReadyForFightButtonVisible()) {
		this.fightReady.show();
	}

	// TODO: show unready button for PVP
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuPlayer/contentMyPlayer.js
 ** module id = 418
 ** module chunks = 0
 **/