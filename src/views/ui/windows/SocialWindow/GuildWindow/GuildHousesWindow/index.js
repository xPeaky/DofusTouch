require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');

var addTooltip = require('TooltipBox').addTooltip;
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var Table = require('Table');
var windowsManager = require('windowsManager');


function GuildHousesWindow(options) {
	options = options || {};

	WuiDom.call(this, 'div', { className: 'GuildHousesWindow' });
	this.addClassNames(options.className);

	var self = this;
	this.currentSelectedHouseId = null;

	this.once('open', function () {
		self._createDom();
	});

	this.on('open', function () {
		self._resetAll();
		self.addClassNames('spinner');
	});
}

inherits(GuildHousesWindow, WuiDom);
module.exports = GuildHousesWindow;


GuildHousesWindow.prototype._createDom = function () {
	var self = this;

	var tableParams = {
		colIds: ['houseName', 'coordinate', 'owner', 'detail'],
		headerContent: [
			getText('ui.common.houseWord'),
			getText('ui.common.coordinatesSmall'),
			getText('ui.common.ownerWord')
		],
		highlightable: true,
		onRowTap: function (row) {
			self.currentSelectedHouseId = row.houseId;
		}
	};

	this.table = this.appendChild(new Table(tableParams));

	var buttonContainer = this.createChild('div', { className: 'buttonContainer' });
	this.joinButton = buttonContainer.appendChild(new Button('Join', { className: 'joinButton' }));

	this.joinButton.on('tap', function () {
		window.dofus.sendMessage('GuildHouseTeleportRequestMessage', { houseId: self.currentSelectedHouseId });
		windowsManager.close('social');
	});
	this.joinButton.disable();

	this._setupSocketEvents();
};

GuildHousesWindow.prototype._setupSocketEvents = function () {
	var self = this;

	var guild = window.gui.playerData.guild;

	guild.on('guildHouseUpdateAll', function () {
		if (self.isVisible()) {
			self.delClassNames('spinner');
			self._updateHouses();
			self._updateJoinButton();
		}
	});

	guild.on('guildHouseUpdateInfo', function (houseInfo) {
		if (self.isVisible()) {
			self._updateHouse(houseInfo);
			self._updateJoinButton();
		}
	});

	guild.on('guildHouseRemoved', function (houseId) {
		if (self.isVisible()) {
			self._removeHouse(houseId);
			self._updateJoinButton();
		}
	});
};

GuildHousesWindow.prototype._createHouseInfoButton = function (house) {
	var self = this;

	var button = new Button('?', { name: 'button' });
	button.on('tap', function () {
		var rowIndex = self._getHouseListRowIndexByHouseId(house.houseId);
		self.table.highlight(rowIndex);

		windowsManager.open('guildHouseInfo', {
			guildshareParams: house.guildshareParams,
			skillListIds: house.skillListIds
		});
	});
	return button;
};

GuildHousesWindow.prototype._resetAll = function () {
	this.currentSelectedHouseId = null;
	this.table.clearContent();
	this.joinButton.disable();
};

GuildHousesWindow.prototype._createHouseListRow = function (house) {
	var enrichData = house.enrichData || {};

	return {
		houseName: enrichData.houseName,
		coordinate: house.worldX + ',' + house.worldY,
		owner: house.ownerName,
		detail: this._createHouseInfoButton(house)
	};
};

GuildHousesWindow.prototype._getHouseListRowIndexByHouseId = function (houseId) {
	var list = this.table.getRows();

	for (var i = 0; i < list.length; i += 1) {
		var id = list[i].houseId || {};

		if (houseId === id) {
			return i;
		}
	}
};

GuildHousesWindow.prototype._updateJoinButton = function () {
	var houses = window.gui.playerData.guild.current.houses || [];

	if (houses.length) {
		this.joinButton.enable();
	} else {
		this.joinButton.disable();
	}
};

GuildHousesWindow.prototype._updateHouses = function () {
	var houses = window.gui.playerData.guild.current.houses || [];

	this._resetAll();

	for (var i = 0; i < houses.length; i += 1) {
		this._addHouse(houses[i]);
	}
};

GuildHousesWindow.prototype._addHouse = function (house) {
	var houseListRow = this._createHouseListRow(house);
	var row = this.table.addRow(houseListRow, { houseId: house.houseId });
	this._addHouseRowToolTip(row, house);
};

GuildHousesWindow.prototype._removeHouse = function (houseId) {
	var rowIndex = this._getHouseListRowIndexByHouseId(houseId);

	if (rowIndex >= 0) {
		this.table.delRow(rowIndex);
	}
};

GuildHousesWindow.prototype._updateHouse = function (house) {
	var houseId = house.houseId;
	var rowIndex = this._getHouseListRowIndexByHouseId(houseId);

	if (rowIndex >= 0) {
		var houseListRow = this._createHouseListRow(house);
		this.table.updateRow(rowIndex, houseListRow, { houseId: houseId });
	} else {
		this._addHouse(house);
	}
};

GuildHousesWindow.prototype._addHouseRowToolTip = function (row, house) {
	var enrichData = house.enrichData;
	var areaSubAreaText = enrichData.areaName + ' (' + enrichData.subAreaName + ')';
	addTooltip(row, areaSubAreaText);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/GuildWindow/GuildHousesWindow/index.js
 ** module id = 874
 ** module chunks = 0
 **/