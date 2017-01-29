require('./styles.less');
var Button = require('Button');
var helper = require('helper');
var inherits = require('util').inherits;
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');


function Wallet(options) {
	options = options || {};
	WuiDom.call(this, 'div', options);
	this.addClassNames('wallet');

	this.goultineAmount = 0;
	this.kamaAmount = 0;
	this.emitTap = options.emitTap;

	this._createContent();
	this._initialize();
}
inherits(Wallet, WuiDom);
module.exports = Wallet;


Wallet.prototype._initialize = function () {
	this._setupListeners();

	var inventory = window.gui.playerData.inventory;
	this._setSoftAmount(inventory.kamas);
	this._setHardAmount(inventory.goultines);
};

Wallet.prototype._setHardAmount = function (amount) {
	this.goultineAmount = amount;
	this.hardAmountElt.setText(helper.intToString(amount));
};

Wallet.prototype._setSoftAmount = function (amount) {
	this.kamaAmount = amount;
	this.softAmountElt.setText(helper.intToString(amount));
};

function goultinesBtnAction() {
	var self = this.myWallet;
	if (self.emitTap) {
		return self.emit('moreGoultinesTap');
	}
	windowsManager.open('market', { tabId: 'shop', tabParams: { category: 'goultines' } });
}

Wallet.prototype._createContent = function () {
	// Goultine amount
	var goultines = this.createChild('div', { className: ['currency', 'goultines'] });
	this.hardAmountElt = goultines.createChild('div', { className: 'text' });
	goultines.createChild('div', { className: 'currencyIcon' });

	// Button to buy more goultines
	this.goultinesBtn = goultines.appendChild(new Button({ className: 'moreButton' }, goultinesBtnAction));
	this.goultinesBtn.myWallet = this;

	// Kama amount
	var kamas = this.createChild('div', { className: ['currency', 'kamas'] });
	this.softAmountElt = kamas.createChild('div', { className: 'text' });
	kamas.createChild('div', { className: 'currencyIcon' });
};

Wallet.prototype._setupListeners = function () {
	var inventory = window.gui.playerData.inventory;

	var self = this;
	function hardUpdateHandler(amount) {
		self._setHardAmount(amount);
	}
	function softUpdateHandler(amount) {
		self._setSoftAmount(amount);
	}

	inventory.on('goultinesUpdated', hardUpdateHandler);
	inventory.on('kamasUpdated', softUpdateHandler);

	this.on('destroy', function () {
		inventory.removeListener('goultinesUpdated', hardUpdateHandler);
		inventory.removeListener('kamasUpdated', softUpdateHandler);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Wallet/index.js
 ** module id = 831
 ** module chunks = 0
 **/