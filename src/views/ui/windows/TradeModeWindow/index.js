require('./styles.less');
var BidHouseShopWindow = require('BidHouseShopWindow');
var inherits = require('util').inherits;
var TradeItemWindow = require('TradeItemWindow');
var Window = require('Window');
var windowsManager = require('windowsManager');
var getText = require('getText').getText;
var Button = require('Button');
var helper = require('helper');

var HORIZONTAL_MARGIN = 20; // between button and windows around it


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class TradeModeWindow
 * @desc  Now only used for "Switch to Merchant Mode" button; this logic should move to TradeStorageWindow
 */
function TradeModeWindow() {
	Window.call(this, {
		className: 'TradeModeWindow',
		noCloseButton: true,
		noTitle: true
	});

	var merchantButton;

	this.once('open', function () {
		merchantButton = this.windowBody.appendChild(
			new Button({ className: 'greenButton', text: getText('ui.humanVendor.switchToMerchantMode') }));
		merchantButton.on('tap', function () {
			window.dofus.sendMessage('ExchangeShowVendorTaxMessage');
		});
	});

	this.on('open', function (msg) {
		switch (msg._messageType) {
		case 'ExchangeShopStockStartedMessage':
			var width = TradeItemWindow.minWidth - HORIZONTAL_MARGIN;
			var x = BidHouseShopWindow.minWidth + HORIZONTAL_MARGIN / 2;
			windowsManager.positionWindow(this.id, { left: x, bottom: '5%', width: width, height: 70 });
			break;
		default: throw new Error('Invalid open msg: ' + msg._messageType);
		}
	});

	/** Received from server after we sent an ExchangeShowVendorTaxMessage
	 * @event module:protocol/inventoryExchange.client_ExchangeReplyTaxVendorMessage */
	window.gui.on('ExchangeReplyTaxVendorMessage', function (msg) {
		return window.gui.openConfirmPopup({
			title: getText('ui.humanVendor.poupTitleTaxMessage'),
			message: getText('ui.humanVendor.taxPriceMessage', helper.kamasToString(msg.totalTaxValue)),
			cb: function (result) {
				if (result) {
					windowsManager.close('tradeStorage'); //if open, we MUST close the dialog (otherwise server ignores us)
					window.dofus.sendMessage('ExchangeStartAsVendorMessage');
					window.gui.connectionGonnaBeClosed('SWITCHING_TO_HUMAN_VENDOR');
					//NB: merchant mode can be refused by server but we only get a "text" message in this case (no issue)
				}
			}
		});
	});
}

inherits(TradeModeWindow, Window);
module.exports = TradeModeWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TradeModeWindow/index.js
 ** module id = 823
 ** module chunks = 0
 **/