require('./styles.less');
var inherit = require('util').inherits;
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');
var getText = require('getText').getText;
var ServersData = require('ServersData');

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class ServerDetails component
 * @desc  Component for server details
 */
function ServerDetails() {
	WuiDom.call(this, 'div', { className: 'ServerDetails' });

	var self = this;

	var label = {
		name: getText('ui.common.name') + ':',
		community: getText('ui.sersel.community') + ':',
		population: getText('ui.sersel.population') + ':',
		type: getText('ui.sersel.type') + ':',
		status: getText('ui.sersel.state') + ':',
		openingDate: getText('ui.sersel.date') + ':'
	};

	var content = this.createChild('div', { className: 'content' });

	var top = content.createChild('div', { className: 'top' });
	this._image = top.createChild('div', { className: 'image' });
	var details = top.createChild('div', { className: 'details' });
	this._detailsBlock = {};

	function addDetails(name) {
		var line = details.createChild('div', { className: ['detail', name] });
		line.createChild('div', { className: ['line', 'label'], text: label[name] });
		self._detailsBlock[name] = line.createChild('div', { className: ['line', 'text'] });
	}

	addDetails('name');
	addDetails('empty');
	addDetails('community');
	addDetails('population');
	addDetails('type');
	addDetails('status');
	addDetails('openingDate');

	var selectedTab = 'description';

	function openTab(id) {
		if (selectedTab === id) {
			return;
		}
		if (id === 'description') {
			descBtn.addClassNames('selected');
			rulesBtn.delClassNames('selected');
			selectedTab = 'description';
			self._descContent.show();
			self._rulesContent.hide();
		} else {
			descBtn.delClassNames('selected');
			rulesBtn.addClassNames('selected');
			selectedTab = 'rules';
			self._descContent.hide();
			self._rulesContent.show();
		}
	}

	var bottom = content.createChild('div', { className: 'bottom' });
	var descBtn = bottom.createChild('div', { className: 'descBtn', text: getText('ui.common.description') });
	var rulesBtn = bottom.createChild('div', { className: 'rulesBtn', text: getText('ui.sersel.rules') });
	tapBehavior(descBtn);
	tapBehavior(rulesBtn);
	descBtn.on('tap', function () {
		openTab('description');
	});
	rulesBtn.on('tap', function () {
		openTab('rules');
	});

	var bottomContent = bottom.createChild('div', { className: 'bottomContent' });
	this._descContent = bottomContent.createChild('div', { className: 'descContent' });
	this._rulesContent = bottomContent.createChild('div', { className: 'rulesContent' });

	descBtn.addClassNames('selected');
	this._rulesContent.hide();
}

inherit(ServerDetails, WuiDom);
module.exports = ServerDetails;

/**
 *
 * @param {Object} server - server data from ServerList
 */
ServerDetails.prototype.setServer = function (server) {
	var self = this;

	var SERVER_STATUS = {
		0: getText('ui.server.state.unknown'),
		1: getText('ui.server.state.offline'),
		2: getText('ui.server.state.starting'),
		3: getText('ui.server.state.online'),
		4: getText('ui.server.state.nojoin'),
		5: getText('ui.server.state.saving'),
		6: getText('ui.server.state.stoping'),
		7: getText('ui.server.state.full')
	};

	var SERVER_RULES = {
		0: getText('ui.server.rules.0'),
		1: getText('ui.server.rules.1')
	};

	window.gui.serversData.syncServerStaticData(function (error) {
		if (error) {
			return console.error('ServerDetails setServer error', error);
		}
		ServersData.getServerImage(server.id, function (error, serverImage) {
			if (error) {
				return console.error(error);
			}
			self._image.setStyle('backgroundImage', serverImage);
		});

		self._detailsBlock.status.setText(SERVER_STATUS[server.status]);

		var staticContent = window.gui.serversData.staticContent;
		var serverStaticData = staticContent.data[server.id] || {};
		var serverGameType = staticContent.gameTypes[serverStaticData.gameTypeId] || {};
		var population = staticContent.populations[serverStaticData.populationId] || {};
		var community = staticContent.communities[serverStaticData.communityId] || {};

		self._detailsBlock.name.setText(serverStaticData.nameId || server.id);
		self._detailsBlock.community.setText(community.nameId   || 'n/a');
		self._detailsBlock.population.setText(population.nameId || 'n/a');
		self._detailsBlock.type.setText(serverGameType.nameId   || 'n/a');

		var date = new Date(serverStaticData.openingDate || 0);
		self._detailsBlock.openingDate.setText(date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear());

		self._descContent.setText(serverStaticData.commentId);
		self._rulesContent.setText(SERVER_RULES[serverStaticData.gameTypeId] || '');
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ServerDetails/index.js
 ** module id = 797
 ** module chunks = 0
 **/