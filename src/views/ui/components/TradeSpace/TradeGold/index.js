require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var getText = require('getText').getText;
var NumberInputBox = require('NumberInputBox');
var TooltipBox = require('TooltipBox');


function TradeGold() {
	WuiDom.call(this, 'div', { className: 'TradeGold' });

	var self = this;
	this._blinkTimeout = null;
	this._currentKama = 0;

	this._kamaContent = this.createChild('div', { className: 'kamaContent' });
	var tooltipContent;
	TooltipBox.addTooltip(this._kamaContent, function () {
		if (!tooltipContent) {
			tooltipContent = new WuiDom('div', { className: 'kamaTooltip', text: getText('ui.exchange.kamas') });
		}
		return tooltipContent;
	});
	TooltipBox.enableTooltip(this._kamaContent, false);

	var imgContent = this._kamaContent.createChild('div', { className: 'imgContent' });
	imgContent.createChild('div', { className: 'kamaImg' });

	var kamaInput = this._kamaContent.createChild('div', { className: 'kamaInput' });
	var input = this._input = kamaInput.appendChild(
		new NumberInputBox({ minValue: 0, title: getText('ui.common.kamas') }));
	kamaInput.createChild('div', { className: 'kamaUnit', text: getText('ui.common.short.kama') });

	input.on('focus', function () {
		input.maxValue = window.gui.playerData.inventory.kamas;
	});
	input.on('change', function (kama) {
		if (self._currentKama !== kama) {
			self._currentKama = kama;
			self.emit('kamaChange', kama);
		}
	});
}


inherits(TradeGold, WuiDom);
module.exports = TradeGold;


TradeGold.prototype.getKama = function () {
	return this._input.getValue();
};


TradeGold.prototype.setKama = function (value) {
	this._input.setValue(value);
};


TradeGold.prototype.blink = function (duration) {
	duration = duration || 3;
	var self = this;

	window.clearTimeout(this._blinkTimeout);
	this._blinkTimeout = window.setTimeout(function () {
		self._kamaContent.delClassNames('blink');
	}, duration * 1000);
	this._kamaContent.addClassNames('blink');
};


TradeGold.prototype.toggleReady = function (isReady) {
	this._kamaContent.toggleClassName('isReady', isReady);
};


TradeGold.prototype.setAsRemote = function () {
	TooltipBox.enableTooltip(this._kamaContent, true);
	this._input.setReadonly(true);
};


TradeGold.prototype.reset = function () {
	this._input.setValue(0);
	this._input.setReadonly(false);
	window.clearTimeout(this._blinkTimeout);
	this._kamaContent.delClassNames('blink');
	this._currentKama = 0;
	TooltipBox.enableTooltip(this._kamaContent, false);
};

TradeGold.prototype.setReadOnly = function (value) {
	this._input.setReadonly(value);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/TradeSpace/TradeGold/index.js
 ** module id = 939
 ** module chunks = 0
 **/