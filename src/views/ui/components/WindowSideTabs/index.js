require('./styles.less');
var inherits = require('util').inherits;
var Tabs = require('Tabs');

function WindowSideTabs() {
	Tabs.call(this, { className: 'WindowSideTabs' });
	this.delClassNames('tabs'); // delete the default tabs styles
}

inherits(WindowSideTabs, Tabs);
module.exports = WindowSideTabs;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/WindowSideTabs/index.js
 ** module id = 733
 ** module chunks = 0
 **/