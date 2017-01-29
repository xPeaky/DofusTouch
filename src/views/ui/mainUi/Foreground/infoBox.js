var Foreground  = require('./main.js');
var getText     = require('getText').getText;

Foreground.prototype._setupInfoBox = function () {
	var infoBox = this.infoBox = this.createChild('div', { className: 'infoBox', hidden: true });
	infoBox.mp = infoBox.createChild('div', { className: 'mp' });
	infoBox.ap = infoBox.createChild('div', { className: 'ap' });
};

Foreground.prototype.hideInfobox = function () {
	this.infoBox.hide();
};

Foreground.prototype.showInfobox = function (type, value) {
	if (type === 'tackle') {
		this.infoBox.mp.setText(value.mp ? -value.mp + ' ' + getText('ui.stats.shortMP') : '');
		this.infoBox.ap.setText(value.ap ? -value.ap + ' ' + getText('ui.stats.shortAP') : '');
	}
	this.infoBox.show();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Foreground/infoBox.js
 ** module id = 213
 ** module chunks = 0
 **/