require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var CheckboxLabel = require('CheckboxLabel');
var getText = require('getText').getText;
var EmblemLogo = require('EmblemLogo');


function GuildHouseSettingWindow() {
	Window.call(this, {
		className: 'GuildHouseSettingWindow',
		positionInfo: { left: 'c', top: 'c', width: 500, height: 490 }
	});

	var self = this;

	this.checkboxes = [];

	this.once('open', function () {
		self._setupDom();
		self.setupSockets();
	});
}

inherits(GuildHouseSettingWindow, Window);
module.exports = GuildHouseSettingWindow;


GuildHouseSettingWindow.prototype._setupDom = function () {
	var self = this;

	var topContainer = this.windowBody.createChild('div', { className: ['container', 'topContainer'] });
	this.emblemLogo = topContainer.appendChild(new EmblemLogo({ width: 100, height: 100 }));

	var content = topContainer.createChild('div', { className: 'content' });
	this.checkboxes.push(content.appendChild(new CheckboxLabel(getText('ui.common.guildHouseEnabledForThisHouse'))));
	content.createChild('div', { className: 'description', text: getText('ui.common.guildHouseNotice') });

	var bottomContainer = this.windowBody.createChild('div', { className: ['container', 'bottomContainer'] });
	var wrapper = bottomContainer.createChild('div', { className: 'wrapper' });

	// door emblem section
	var container = this.doorEmblem = wrapper.createChild('div', { className: 'section' });
	container.createChild('div', {
		className: 'title',
		text: getText('ui.common.guildHouseDisplayEmblemOnDoorTitle') + ':'
	});
	this.checkboxes.push(container.appendChild(new CheckboxLabel(getText('ui.common.guildHouseDisplayEmblemForGuild'))));
	this.checkboxes.push(container.appendChild(new CheckboxLabel(getText('ui.common.guildHouseDisplayEmblemForOthers'))));

	// house access section
	container = this.houseAccess = wrapper.createChild('div', { className: 'section' });
	container.createChild('div', { className: 'title', text: getText('ui.common.guildHouseHouseAccessTitle') + ':' });
	this.checkboxes.push(container.appendChild(
		new CheckboxLabel(getText('ui.common.guildHouseAccessHouseAllowGuildmates'))
	));
	this.checkboxes.push(container.appendChild(new CheckboxLabel(getText('ui.common.guildHouseAccessHouseDenyOthers'))));

	// chests section
	container = this.chests = wrapper.createChild('div', { className: 'section' });
	container.createChild('div', { className: 'title', text: getText('ui.common.guildHouseSafesAccessTitle') + ':' });
	this.checkboxes.push(container.appendChild(new CheckboxLabel(getText('ui.common.guildHouseRight32'))));
	this.checkboxes.push(container.appendChild(new CheckboxLabel(getText('ui.common.guildHouseRight64'))));

	// miscellaneous settings section
	container = this.miscellaneous = wrapper.createChild('div', { className: 'section' });
	container.createChild('div', { className: 'title', text: getText('ui.common.guildHouseOtherTitle') + ':' });
	this.checkboxes.push(container.appendChild(new CheckboxLabel(getText('ui.common.guildHouseAllowRespawn'))));
	this.checkboxes.push(container.appendChild(new CheckboxLabel(getText('ui.common.guildHouseAllowTeleport'))));

	var buttonContainer = this.windowBody.createChild('div', { className: 'buttonContainer' });
	var confirmButton = buttonContainer.appendChild(new Button(getText('ui.common.validation')));

	confirmButton.on('tap', function () {
		var rights = 0;

		for (var i = 0; i < self.checkboxes.length; i++) {
			if (self.checkboxes[i].isActivate()) {
				rights += 1 << i;
			}
		}

		var enable = self.checkboxes[0].isActivate();
		window.dofus.sendMessage('HouseGuildShareRequestMessage', { enable: enable, rights: rights });
		windowsManager.close(self.id);
	});

	this.checkboxes[0].on('activate', function () {
		self.enableContainers();
	});

	this.checkboxes[0].on('deactivate', function () {
		self.disableContainers();
	});
};


GuildHouseSettingWindow.prototype.updateCheckboxes = function (rights) {
	for (var i = 0; i < this.checkboxes.length; i++) {
		if ((rights >> i) & 1) {
			this.checkboxes[i].activate();
			continue;
		}

		this.checkboxes[i].deactivate();
	}
};


GuildHouseSettingWindow.prototype.enableContainers = function () {
	this.doorEmblem.delClassNames('disabled');
	this.houseAccess.delClassNames('disabled');
	this.chests.delClassNames('disabled');
	this.miscellaneous.delClassNames('disabled');

	for (var i = 0; i < this.checkboxes.length; i++) {
		this.checkboxes[i].enable();
	}
};


GuildHouseSettingWindow.prototype.disableContainers = function () {
	this.doorEmblem.addClassNames('disabled');
	this.houseAccess.addClassNames('disabled');
	this.chests.addClassNames('disabled');
	this.miscellaneous.addClassNames('disabled');

	for (var i = 1; i < this.checkboxes.length; i++) {
		this.checkboxes[i].disable();
	}
};


GuildHouseSettingWindow.prototype.setupSockets = function () {
	var self = this;

	window.gui.on('HouseGuildRightsMessage', function (msg) {
		self.windowTitle.setText(getText('ui.common.houseOwnerName', msg.guildInfo.guildName));

		var emblem = msg.guildInfo.guildEmblem;
		self.emblemLogo.setValue(emblem, true);

		self.updateCheckboxes(msg.rights);
		self.enableContainers();
	});

	window.gui.on('HouseGuildNoneMessage', function () {
		for (var i = 0; i < self.checkboxes.length; i++) {
			self.checkboxes[i].deactivate();
		}

		self.disableContainers();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/GuildHouseSettingWindow/index.js
 ** module id = 768
 ** module chunks = 0
 **/