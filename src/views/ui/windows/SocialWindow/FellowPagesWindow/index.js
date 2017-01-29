require('./styles.less');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var SwipingTabs = require('SwipingTabs');
var WuiDom = require('wuidom');
var FellowGuildsWindow = require('SocialWindow/FellowPagesWindow/FellowGuildsWindow');
var FellowAlliancesWindow = require('SocialWindow/FellowPagesWindow/FellowAlliancesWindow');


function FellowPagesWindow(options) {
	WuiDom.call(this, 'div', { className: 'FellowPagesWindow', name: 'directory' });
	options = options || {};
	this.addClassNames(options.className);

	var self = this;

	this.once('open', function () {
		self._setupDom();
	});
}

inherits(FellowPagesWindow, WuiDom);
module.exports = FellowPagesWindow;


FellowPagesWindow.prototype._setupDom = function () {
	var tabs = this.appendChild(new SwipingTabs({ className: 'tabs' }));

	tabs.addTab(getText('ui.social.guilds'), new FellowGuildsWindow(), 'guilds');
	tabs.addTab(getText('ui.alliance.alliances'), new FellowAlliancesWindow(), 'alliances');

	tabs.openTab(0);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/FellowPagesWindow/index.js
 ** module id = 884
 ** module chunks = 0
 **/