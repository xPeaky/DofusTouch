require('./styles.less');
var WuiDom = require('wuidom');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var Selector = require('Selector');
var InputBox = require('InputBox');
var Table = require('Table');


function FellowAlliancesWindow() {
	WuiDom.call(this, 'div', { className: 'FellowAlliancesWindow' });

	var self = this;

	this.once('open', function () {
		self._setupDom();
	});
}

inherits(FellowAlliancesWindow, WuiDom);
module.exports = FellowAlliancesWindow;


FellowAlliancesWindow.prototype._setupDom = function () {
	var line = this.createChild('div', { className: 'line' });
	line.createChild('div', { className: 'left', text: getText('ui.search.criteria') });
	line.createChild('div', { className: 'right', text: getText('ui.social.dataUpdate') });

	line = this.createChild('div', { className: 'line' });
	this.selector = line.appendChild(new Selector());
	this.selector.addOption(getText('ui.common.name'), 'name');
	this.selector.addOption(getText('ui.alliance.memberName'), 'memberName');

	line.appendChild(new InputBox());

	this.table = this.appendChild(new Table({
		colIds: ['name', 'abbr', 'guilds', 'members', 'territories', 'button'],
		headerContent: [
			getText('ui.common.name'),
			getText('ui.alliance.tag'),
			getText('ui.social.guilds'),
			getText('ui.common.members'),
			getText('ui.common.territory')
		]
	}));
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/FellowPagesWindow/FellowAlliancesWindow/index.js
 ** module id = 888
 ** module chunks = 0
 **/