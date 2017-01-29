require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');
var playUiSound = require('audioManager').playUiSound;

function Tabs(options) {
	WuiDom.call(this, 'div', { className: 'tabs' });

	options = options || {};
	this.addClassNames(options.className);

	this.options = options;

	this.tabsMap = {};
	this.tabsOrderIds = [];
	this.curentTabId = null;
	this.nextId = 0;
}

inherits(Tabs, WuiDom);
module.exports = Tabs;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a new tab
 *
 * @param {String} caption  - text displayed in tab
 * @param {WuiDom} [target] - WuiDom controled by tab
 * @param {String} id - Tab id
 *
 * @return {String} tabId of the created tab
 */
Tabs.prototype.addTab = function (caption, target, id) {
	var self = this;
	var tabId = id;
	var defaultIdUsed = false;

	if (!tabId) {
		tabId = this.nextId;
		this.nextId += 1;
		defaultIdUsed = true;
	}

	var tabClassName = defaultIdUsed ? 'tab' + tabId : tabId;
	var tab = this.createChild('div', { className: ['tab', tabClassName], text: caption });
	tapBehavior(tab);
	tab.on('tap', function () {
		if (self.options.closable && tabId === self.curentTabId) {
			self.close();
		} else {
			self.openTab(tabId);
			playUiSound('TAB');
		}
	});

	// Ability to enable / disable each tab individually
	tab.on('enable', function (enable) {
		this._isDisable = !enable;
		this.toggleClassName('disabled', !enable);
		// disabling the current tab? (e.g. divorcing while watching the Spouse tab, etc.)
		if (!enable && self.curentTabId === tabId) { self.openFirstTab(); }
	});

	this.tabsMap[tabId] = {
		tab: tab,
		target: target
	};

	this.tabsOrderIds.push(tabId);

	if (target) {
		target.hide();
	}

	return tabId;
};

Tabs.prototype.toggleTabDisplay = function (tabId, toggle) {
	var tabObj = this.tabsMap[tabId];
	if (tabObj) {
		tabObj.tab.toggleDisplay(toggle);
	}

	if (this.curentTabId === tabId && !tabObj.tab.isVisible()) {
		var firstTabId = this.tabsOrderIds[0];
		if (tabId === firstTabId) {
			this.close();
		} else {
			this.openTab(firstTabId);
		}
	}
};

/** Opens a given tab
 *  @param {String|Number} tabId - name or index of tab.
 *  @param {Object} params - params to be pass into the opening tab
 *  @param {Object} options - options when opening tab
 *  @param {Boolean} options.forceOpen - open the tab even though it already opened
 */
Tabs.prototype.openTab = function (tabId, params, options) {
	options = options || {};
	params = params || {};

	var isSameTab = this.curentTabId === tabId;

	if (!options.forceOpen && isSameTab) { return; }

	// find which tab; if ID is a number we convert it to the tab's name
	if (typeof tabId === 'number') { tabId = this.tabsOrderIds[tabId]; }
	var tabObj = this.tabsMap[tabId];
	if (!tabObj) {
		return console.error('openTab - invalid tab ID given: ' + tabId);
	}

	if (!isSameTab) {
		this.close();
	}

	tabObj.tab.addClassNames('on');

	// if we have a nofitication, currently by default is to hide it when we click on the tab,
	// and the nofitication is not shown again
	this.toggleTabNotification(tabId, false);

	// show new selected tab
	var target = tabObj.target;
	if (target) {
		target.emit('open', params);
		target.show();
		if (!options.delayOpenedEvent) {
			target.emit('opened', params);
		}
	}

	this.curentTabId = tabId;

	this.emit('openTab', tabId);
};

Tabs.prototype.openFirstTab = function () {
	this.openTab(this.tabsOrderIds[0]);
};

Tabs.prototype.getTabsMap = function () {
	return this.tabsMap;
};

Tabs.prototype.getFirstTab = function () {
	return this.tabsMap[this.tabsOrderIds[0]];
};

Tabs.prototype.getCurrentTabId = function () {
	return this.curentTabId;
};

Tabs.prototype.getCurrentTab = function () {
	return this.tabsMap[this.curentTabId];
};

Tabs.prototype.getTabTarget = function (tabId) {
	var tabObj = this.tabsMap[tabId] || {};
	return tabObj.target;
};

Tabs.prototype.close = function () {
	if (this.curentTabId || typeof this.curentTabId === 'number') {
		var tabObj = this.tabsMap[this.curentTabId];
		tabObj.tab.delClassNames('on');
		// hide old selected tab
		var target = tabObj.target;
		if (target) {
			target.hide();
			target.emit('close');
		}
	}
	this.curentTabId = null;
};

Tabs.prototype.setClosable = function (value) {
	this.options.closable = value;
};

Tabs.prototype.toggleTabNotification = function (tabId, toggle) {
	var tabObj = this.tabsMap[tabId];
	if (tabObj) {
		tabObj.tab.toggleClassName('notification', toggle);
	}
};

Tabs.prototype.toggleTabAvailability = function (tabId, shouldEnable) {
	var tabObj = this.tabsMap[tabId];

	if (!tabObj) {
		return;
	}

	var tab = tabObj.tab;

	if (shouldEnable === undefined) {
		shouldEnable = !tab._isDisable;
	}

	tab.setEnable(shouldEnable);
};

Tabs.prototype.emitOnCurrentTab = function (eventName, params) {
	params = params || {};
	var currentTab = this.getCurrentTab();
	if (currentTab) {
		currentTab.target.emit(eventName, params);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Tabs/index.js
 ** module id = 680
 ** module chunks = 0
 **/