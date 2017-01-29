require('./styles.less');
var Button = require('Button');
var dimensions = require('dimensionsHelper').dimensions;
var gripBehavior = require('gripBehavior');
var inherits = require('util').inherits;
var windowsManager = require('windowsManager');
var analytics = require('analytics');
var WuiDom = require('wuidom');


function ShopFloatingToolbar() {
	WuiDom.call(this, 'div', { className: 'shopFloatingToolbar' });

	gripBehavior(this, { grip: this });

	this.appendChild(new Button({ className: 'shopBtn' }, shopBtnTap));

	var self = this;
	var gui = window.gui;

	gui.once('resize', function () {
		if (gui.ipadRatio) {
			self.setStyles({ left: dimensions.mapRight + 'px', top: '30px' });
		} else {
			self.setStyles({ left: dimensions.mapRight - 80 + 'px', top: '0px' });
		}
	});
	gui.on('connected', function () { self.show(); });
	gui.on('disconnect', function () { self.hide(); });

	gui.fightManager.on('fightStart', function () { self.hide(); });
	gui.fightManager.on('fightEnd', function () { self.show(); });
}
inherits(ShopFloatingToolbar, WuiDom);
module.exports = ShopFloatingToolbar;


function shopBtnTap() {
	windowsManager.open('market', { tabId: 'shop' });

	var position = this.rootElement.getBoundingClientRect();
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	analytics.log('HUD.Click_on_button', {
		interface_id: 'ShopFloatingToolbar',
		button_id: 'BTN_IG_SHOP',
		clic_parameter_key: 'position',
		clic_parameter_value: ~~position.left + ',' + ~~position.top,
		clic_type: 'Simple_court'
	});
	//jscs:enable requireCamelCaseOrUpperCaseIdentifiers
}



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/ShopFloatingToolbar/index.js
 ** module id = 467
 ** module chunks = 0
 **/