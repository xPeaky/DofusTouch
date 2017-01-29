require('./styles.less');
var WuiDom = require('wuidom');
var EmblemLogo = require('EmblemLogo');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function EntityBanner() {
	WuiDom.call(this, 'div', { className: 'EntityBanner' });

	this._guildEmblem = this.appendChild(new EmblemLogo({ width: 40, height: 40 }));

	var nameBox = this.createChild('div', { className: 'nameBox' });

	this._allianceEmblem = this.appendChild(new EmblemLogo({ width: 40, height: 40 }));

	this._guildName = nameBox.createChild('div', { className: 'guildName' });
	this._name = nameBox.createChild('div', { className: 'name' });

	this._houseName = nameBox.createChild('div', { className: 'houseName' });
	this._houseOwner = nameBox.createChild('div', { className: 'houseOwner' });
	this._forSale = nameBox.createChild('div', { className: 'forSale', text: getText('ui.common.forSale') });
}
inherits(EntityBanner, WuiDom);

EntityBanner.prototype.setContent = function (content) {
	content = content || {};

	this._name.setText(content.name || '');
	this._name.toggleDisplay(!!content.name);

	var emblemData;
	var guildData = content.guild;
	if (guildData) {
		this._guildName.setText(guildData.guildName);
		this._guildName.show();

		emblemData = guildData.guildEmblem;
		if (emblemData) {
			this._guildEmblem.setValue(emblemData, true);
		}
		this._guildEmblem.show();
	} else {
		this._guildName.hide();
		this._guildEmblem.hide();
	}

	var allianceData = content.alliance;
	if (allianceData) {
		this.addClassNames('alliance');

		if (guildData) {
			this._guildName.setText(guildData.guildName + ' - [' + allianceData.allianceTag + ']');
		} else {
			this._guildName.setText(allianceData.allianceName);
			this._guildName.show();
		}

		emblemData = allianceData.allianceEmblem;
		if (emblemData) {
			emblemData.isAlliance = true;
			this._allianceEmblem.setValue(emblemData, true);
			this._allianceEmblem.show();
		}
	} else {
		this.delClassNames('alliance');
		this._allianceEmblem.hide();
	}

	var house = content.house || {};

	this._houseOwner.setText(house.houseOwner || '');
	this._houseOwner.toggleDisplay(!!house.houseOwner);

	if (house.houseName) {
		// if moderator or more show the house id
		house.houseName += window.gui.playerData.isModeratorOrMore() ? ' (' + house.houseId + ')' : '';
		this._houseName.setText(house.houseName);
	}
	this._houseName.toggleDisplay(!!house.houseName);

	this._forSale.toggleDisplay(!!house.forSale);
};

module.exports = EntityBanner;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/EntityBanner/index.js
 ** module id = 306
 ** module chunks = 0
 **/