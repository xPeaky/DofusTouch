var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;
var PartyTypeEnum = require('PartyTypeEnum');
var FightOptionsEnum = require('FightOptionsEnum');


function ContextualMenuPartyOptions() {
	ContextualMenu.call(this);

	this.partyId = false;
	this.isLoyal = false;

	this.once('open', function () {
		this._setupDom();
	});

	this.on('open', function (params, contentReady) {
		// Flags below are used if the option button is tapped so we store them
		this.partyId = params.partyId;
		this.isLoyal = params.isLoyal;

		this.loyalMsg.toggleClassName('ticked', params.isLoyal);

		if (params.partyType === PartyTypeEnum.PARTY_TYPE_ARENA) {
			this.restrictedMsg.hide();
		} else {
			this.restrictedMsg.show();
			this.restrictedMsg.setEnable(params.isLeader);
			this.restrictedMsg.toggleClassName('ticked', params.isRestricted);
		}
		contentReady();
	});
}
inherits(ContextualMenuPartyOptions, ContextualMenu);
module.exports = ContextualMenuPartyOptions;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** create component dom elements
 * @private
 */
ContextualMenuPartyOptions.prototype._setupDom = function () {
	var self = this;

	this.header.setText(getText('ui.common.options'));

	this.restrictedMsg = this._addEntry(getText('ui.party.lockFight'), function () {
		window.dofus.sendMessage('GameFightOptionToggleMessage', {
			option: FightOptionsEnum.FIGHT_OPTION_SET_TO_PARTY_ONLY
		});
	});

	this.loyalMsg = this._addEntry(getText('ui.party.refuseOtherInvitations'), function () {
		window.dofus.sendMessage('PartyPledgeLoyaltyRequestMessage', {
			partyId: self.partyId, loyal: !self.isLoyal
		});
	});

	this._addCancel();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuPartyOptions/index.js
 ** module id = 414
 ** module chunks = 0
 **/