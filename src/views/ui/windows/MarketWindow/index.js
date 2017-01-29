require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');

var ShopWindow = require('./ShopWindow');
// TODO: BidHouse window
var WindowSideTabs = require('WindowSideTabs');

/**
 * @class MarketWindow
 */
function MarketWindow() {
	Window.call(this, {
		className: 'MarketWindow',
		positionInfo: { top: 20, left: 60, right: 20, bottom: 20 }
	});

	var tabsOrders = ['shop'/*, 'auctionHouse'*/]; // TODO: BidHouse window

	var tabsDefinitions = this.tabsDefinitions = {
		shop: { target: new ShopWindow() }
		// bidHouse: { target: new BidHouseWindow() } // TODO: BidHouse window
	};

	var windowBody = this.windowBody;
	this.tabs = windowBody.appendChild(new WindowSideTabs());

	for (var i = 0; i < tabsOrders.length; i++) {
		var tabId = tabsOrders[i];
		var tabDef = tabsDefinitions[tabId];
		var target = windowBody.appendChild(tabDef.target);
		target.tabId = tabId;
		this.tabs.addTab('', target, tabId);
	}

	this._initTabs();

	this.on('open', function (params) {
		this.tabs.openTab(params.tabId, params.tabParams, { delayOpenedEvent: true, forceOpen: true });
	});

	this.on('opened', function (params) {
		params = params || {};
		this.tabs.emitOnCurrentTab('opened', params.tabParams || {});
	});

	this.on('close', function () {
		this._resetTabs();
	});

	this._setupEvents();
}
inherits(MarketWindow, Window);
module.exports = MarketWindow;


MarketWindow.prototype._initTabs = function () {
	var tabsDefinitions = this.tabsDefinitions;

	for (var tabId in tabsDefinitions) {
		this.tabs.toggleTabAvailability(tabId, !tabsDefinitions[tabId].disabled);
	}
};

MarketWindow.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;

	gui.on('disconnect', function () {
		self._resetTabs();
		self._initTabs();
	});
};

MarketWindow.prototype.getOpenedTabId = function () {
	return this.tabs.getCurrentTabId();
};

MarketWindow.prototype._resetTabs = function () {
	this.tabs.close();
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MarketWindow/index.js
 ** module id = 962
 ** module chunks = 0
 **/