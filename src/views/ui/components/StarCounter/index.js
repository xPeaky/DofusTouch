require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Button = require('Button');
var windowsManager = require('windowsManager');

var NB_STARS = 5;

function StarCounter(value) {
	var self = this;
	WuiDom.call(this, 'div', { className: 'StarCounter' });
	this.stars = [];
	for (var i = 0; i < NB_STARS; i++) {
		var star = this.createChild('div', { className: 'star' });
		this.stars[i] = star;
	}

	this.bonusContainer = this.createChild('div', { className: 'bonusContainer' });
	this.bonusContainer.createChild('div', { className: 'bonusContainerPlus', text: '+' });
	for (var j = 0; j < 3; j++) {
		var bonusStar = this.bonusContainer.createChild('div', { className: 'bonusStar' });
		bonusStar.addClassNames('star' + (j + 1));
	}

	this.linkToShop = this.bonusContainer.appendChild(new Button({ className: 'linkToShop', scaleOnPress: false }));
	this.linkToShop.on('tap', function () {
		windowsManager.open('market', { tabId: 'shop', tabParams: { category: 'bonuspack' } });

		self.emit('shopOpened');
	});

	if (value !== undefined) {
		this.setValue(value);
	}
}

inherits(StarCounter, WuiDom);
module.exports = StarCounter;


/**
 * stars become yellow until 100% and become red until 200%
 * @param {number} value between 0 and 200
 */
StarCounter.prototype.setValue = function (value) {
	var color1 = 'level1';
	var color2 = '';
	if (value > 100) {
		color1 = 'level2';
		color2 = 'level1';
		value -= 100;
	}
	value /= 20;
	value -= 0.5;
	for (var i = 0; i < NB_STARS; i++) {
		this.stars[i].delClassNames(['level1', 'level2']);
		this.stars[i].addClassNames(i <= value ? color1 : color2);
	}

	if (window.gui.playerData.isSubscriber()) {
		// bonus stars are colored, shop button is hidden
		this.bonusContainer.addClassNames('bonusPackActive');
	} else {
		// bonus stars are grayed, shop button is displayed
		this.bonusContainer.delClassNames('bonusPackActive');
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/StarCounter/index.js
 ** module id = 283
 ** module chunks = 0
 **/