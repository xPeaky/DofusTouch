require('./styles.less');
var inherits = require('util').inherits;
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var windowsManager = require('windowsManager');

function HouseMenuButton() {
	Button.call(this, '', { className: 'HouseMenuButton', hidden: true });

	var self = this;

	this._reset();

	this._icon = this.createChild('div', { className: 'icon' });

	this.on('tap', function () {
		self._updateToolTip();
		window.gui.openContextualMenu('generic', self._tooltipParams);
	});

	this._registerListeners();
}

inherits(HouseMenuButton, Button);
module.exports = HouseMenuButton;

HouseMenuButton.prototype._reset = function () {
	this._locked = false;
	this._myHouse = null;
	this._onSale = false;
	this._tooltipParams = null;
};

HouseMenuButton.prototype._registerListeners = function () {
	var self = this;
	var gui = window.gui;
	var playerData = gui.playerData;
	var positionData = playerData.position;

	gui.on('disconnect', function () {
		self._reset();
	});

	positionData.on('myHouseNotification', function (params) {
		params = params || {};
		var isInMyHouse = params.isInMyHouse;
		var msg = params.msg;

		if (!isInMyHouse) {
			self.hide();
			self._reset();
			return;
		}

		self._myHouse = msg.currentHouse;
		self._onSale = !!(msg.currentHouse.price);
		self._locked = msg.currentHouse.isLocked;

		self._updateIcon();
		self.show();
	});

	gui.on('HousePropertiesMessage', function (msg) {
		var houseProperties = msg.properties;

		if (!self._tooltipParams || !self._myHouse || self._myHouse.houseId !== houseProperties.houseId) { return; }

		self._onSale = houseProperties.isOnSale;

		self._updateIcon();
	});

	gui.on('LockableStateUpdateHouseDoorMessage', function (msg) {
		if (!self._tooltipParams || !self._myHouse || self._myHouse.houseId !== msg.houseId) { return; }

		self._locked = msg.locked;

		self._updateIcon();
	});

	gui.on('HouseSoldMessage', function (msg) {
		var buyerName = msg.buyerName;

		if (!self._tooltipParams || !self._myHouse || buyerName !== playerData.identification.nickname) { return; }

		self._myHouse.price = msg.realPrice;
	});
};

HouseMenuButton.prototype._updateIcon = function () {
	var iconClassName = this._locked ? 'locked' : '';
	iconClassName = this._onSale ? 'onSale' : iconClassName;
	this._icon.replaceClassNames(['onSale', 'locked'], iconClassName ? [iconClassName] : []);
};

function openGuildHouseSetting() {
	windowsManager.open('guildHouseSetting');
	window.dofus.sendMessage('HouseGuildRightsViewMessage');
}

function openPadlockDialog() {
	windowsManager.open('padlock', { fromInside: true });
}

HouseMenuButton.prototype._updateToolTip = function () {
	var self = this;

	this._tooltipParams = {
		title: getText('ui.house.homeOf', this._myHouse.ownerName),
		actions: []
	};

	var buySellCaption = this._onSale ? getText('ui.common.changeHousePrice') : getText('ui.common.sell');
	this._tooltipParams.actions.push({
		caption: buySellCaption,
		cb: function () {
			var houseBuySellWindow = windowsManager.getWindow('houseBuySell');
			houseBuySellWindow.prepareDialog(self._myHouse);
			windowsManager.open('houseBuySell', { fromInside: true, myHouse: self._myHouse });
		}
	});

	var lockCaption = this._locked ? getText('ui.common.unlock') : getText('ui.common.lock');
	this._tooltipParams.actions.push({
		caption: lockCaption,
		cb: openPadlockDialog
	});

	var guildData = window.gui.playerData.guild;

	if (guildData.hasGuild()) {
		this._tooltipParams.actions.push({
			caption: getText('ui.common.guildHouseConfiguration'),
			cb: openGuildHouseSetting
		});
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/HouseMenuButton/index.js
 ** module id = 475
 ** module chunks = 0
 **/