var dimensions = require('dimensionsHelper').dimensions;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
require('./style.less');

function TutorialPopup(options) {
	WuiDom.call(this, 'div', options);
	this.addClassNames('tutorialPopup');
	this.appendChild(new WuiDom('div', { className: 'tutorialPopupTitle', text: getText('tablet.joris') }));
	this.content = this.appendChild(new WuiDom('div', { className: 'tutorialPopupContent' }));
	this.appendChild(new WuiDom('div', { className: 'joris' }));
}

inherits(TutorialPopup, WuiDom);
module.exports = TutorialPopup;

TutorialPopup.prototype.setContent = function (content) {
	this.content.clearContent();
	if (content instanceof WuiDom) {
		this.content.appendChild(content);
	} else {
		this.content.setText(content);
	}
	this.show();
};

TutorialPopup.prototype.open = function () {
	this.setStyle('bottom', (dimensions.screenHeight - dimensions.mapHeight + 7) + 'px');
	this.hide();
	window.gui.windowsContainer.appendChild(this);
};

TutorialPopup.prototype.close = function () {
	this.hide();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/TutorialPopup/index.js
 ** module id = 597
 ** module chunks = 0
 **/