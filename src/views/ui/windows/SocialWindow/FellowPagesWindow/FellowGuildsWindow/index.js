require('./styles.less');
var WuiDom = require('wuidom');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var Selector = require('Selector');
var InputBox = require('InputBox');
var Table = require('Table');


function FellowGuildsWindow() {
	WuiDom.call(this, 'div', { className: 'FellowGuildsWindow' });

	this.selector = null;
	this.table = null;

	var self = this;

	this.once('open', function () {
		self._setupDom();
	});
}

inherits(FellowGuildsWindow, WuiDom);
module.exports = FellowGuildsWindow;


FellowGuildsWindow.prototype._setupDom = function () {
	var line = this.createChild('div', { className: 'line' });
	line.createChild('div', { className: 'left', text: getText('ui.search.criteria') });
	line.createChild('div', { className: 'right', text: getText('ui.social.dataUpdate') });

	line = this.createChild('div', { className: 'line' });
	this.selector = line.appendChild(new Selector());
	this.selector.addOption(getText('ui.common.name'), 'name');
	this.selector.addOption(getText('ui.alliance.memberName'), 'memberName');

	line.appendChild(new InputBox());

	this.table = this.appendChild(new Table({
		colIds: ['name', 'level', 'members', 'button'],
		headerContent: [getText('ui.common.name'), getText('ui.common.level'), getText('ui.common.members')]
	}));
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/FellowPagesWindow/FellowGuildsWindow/index.js
 ** module id = 886
 ** module chunks = 0
 **/