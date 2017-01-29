require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var wuiButton = require('tapBehavior');
var getText = require('getText').getText;
var ServersData = require('ServersData');
var ServerStatusEnum = require('ServerStatusEnum');


function ServerBox(server) {
	WuiDom.call(this, 'div', { className: 'ServerBox' });
	wuiButton(this);

	this._SERVER_STATUS = {
		0: getText('ui.server.state.unknown'),
		1: getText('ui.server.state.offline'),
		2: getText('ui.server.state.starting'),
		3: getText('ui.server.state.online'),
		4: getText('ui.server.state.nojoin'),
		5: getText('ui.server.state.saving'),
		6: getText('ui.server.state.stoping'),
		7: getText('ui.server.state.full')
	};

	this._completions = [];

	this._title = this.createChild('div', { className: 'title' });
	this._content = this.createChild('div', { className: 'content' });
	this._placeholder = this.createChild('div', { className: 'placeholderDiv' });
	this._content.createChild('div', { className: 'selection' });

	this._image = this._content.createChild('div', { className: 'image' });

	for (var i = 0; i < 5; i += 1) {
		this._completions.push(this._content.createChild('div', { className: 'completion' }));
	}

	this._heroicIcon = this._content.createChild('div', { className: 'heroicIcon' });

	var statusBlock = this._content.createChild('div', { className: 'statusBlock' });

	// the class of _statusIcon is overwriting in setServer
	this._statusIcon = statusBlock.createChild('div', { className: 'statusIcon' });
	this._statusText = statusBlock.createChild('div', { className: 'statusText' });

	this.setServer(server);
}

inherits(ServerBox, WuiDom);
module.exports = ServerBox;

ServerBox.prototype.setServer = function (server) {
	var self = this;
	this.delClassNames('placeHolder');
	this._placeholder.hide();

	if (!server) {
		this.addClassNames('placeHolder');
		this.disable();
		this._content.hide();
		this._placeholder.show();
		this._title.setText('');
		return;
	}

	this._title.setText(server._name || '');

	for (var i = 0, len = this._completions.length; i < len; i += 1) {
		var completion = this._completions[i];
		if (i < server.charactersCount) {
			completion.addClassNames('on');
		} else {
			completion.delClassNames('on');
		}
	}

	var isHeroic = (server._gameTypeId === 1);
	this._heroicIcon.toggleDisplay(isHeroic);

	this.data = server;

	// if the server status is online you can select it, in other case you cannot
	if (server.status === ServerStatusEnum.ONLINE) {
		this.enable();
	} else {
		this.disable();
	}
	this._statusIcon.setClassNames(['statusIcon', 'status_' + server.status]);
	this._statusText.setText(this._SERVER_STATUS[server.status || 0]);

	this._content.show();

	ServersData.getServerImage(server.id, function (error, serverImage) {
		if (error) { return console.error(error); }
		self._image.setStyle('backgroundImage', serverImage);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ServerSelectionWindow/ServerBox/index.js
 ** module id = 805
 ** module chunks = 0
 **/