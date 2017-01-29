require('./styles.less');
var inherit = require('util').inherits;
var WuiDom = require('wuidom');
var wuiButton = require('tapBehavior');
var assetPreloading = require('assetPreloading');

function ServerRow(server, odd) {
	WuiDom.call(this, 'div', { className: ['ServerRow', 'listRow'] });

	wuiButton(this);

	if (odd) {
		this.addClassNames('odd');
	}

	this._DEFAULT_POPULATION_CLASSES = ['listBox', 'listCell', 'population'];
	this._DEFAULT_NAME_CLASSES = ['listBox', 'listCell', 'name'];

	var flagDiv = this.createChild('div', { className: ['listBox', 'listCell', 'flag'] });
	this._flag = flagDiv.createChild('div', { className: 'flagImage' });
	this._serverName = this.createChild('div', { className: this._DEFAULT_NAME_CLASSES });
	this._population = this.createChild('div', { className: this._DEFAULT_POPULATION_CLASSES });
	var statusDiv = this.createChild('div', { className: ['listBox', 'listCell', 'status'] });
	this._status = statusDiv.createChild('div', { className: 'statusImage' });

	this.setServer(server);
}

inherit(ServerRow, WuiDom);
module.exports = ServerRow;

ServerRow.prototype.setServer = function (server) {
	if (!server) {
		this._flag.hide();
		this._serverName.setText('');
		this._population.setText('');
		this._status.hide();
		return;
	}
	var self = this;

	this.id = server.id;
	this.data = server;

	var staticContent = window.gui.serversData.staticContent;
	var serverStaticData = window.gui.serversData.staticContent.data[this.id] || {};

	this._flag.show();
	this._status.show();

	this._serverName.setText(serverStaticData.nameId || server.id);

	this._serverName.setClassNames(this._DEFAULT_NAME_CLASSES);

	// if heroic

	if (serverStaticData.gameTypeId === 1) {
		this._serverName.setClassNames(this._DEFAULT_NAME_CLASSES, 'heroic');
	}

	this._population.setClassNames(this._DEFAULT_POPULATION_CLASSES, 'popu_', serverStaticData.populationId);
	var population = staticContent.populations[serverStaticData.populationId] || {};
	this._population.setText(population.nameId || 'n/a');

	this._status.setClassNames(['statusImage', 'status_' + server.status]);

	// get flag images

	assetPreloading.preloadImage('gfx/flags/flag_' + serverStaticData.communityId + '.png', function (url) {
		self._flag.setStyle('backgroundImage', url);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ServerListSelectionWindow/ServerRow/index.js
 ** module id = 801
 ** module chunks = 0
 **/