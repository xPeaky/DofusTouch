require('./styles.less');
var inherits = require('util').inherits;
var Button = require('Button');
var WuiDom = require('wuidom');
var addTooltip = require('TooltipBox').addTooltip;
var getText = require('getText').getText;
var Table = require('Table');
var windowsManager = require('windowsManager');
var assetPreloading = require('assetPreloading');


function GuildPaddocksWindow(options) {
	options = options || {};

	WuiDom.call(this, 'div', { className: 'GuildPaddocksWindow' });
	this.addClassNames(options.className);

	this.selectedPaddock = null;

	this.once('open', function () {
		this._createDom();
		this._setupEvents();
	});

	this.on('open', function () {
		this._resetAll();
		this.locationTable.addClassNames('spinner');
	});
}

inherits(GuildPaddocksWindow, WuiDom);
module.exports = GuildPaddocksWindow;


GuildPaddocksWindow.prototype._setupEvents = function () {
	var guild = window.gui.playerData.guild;
	var self = this;

	guild.on('guildPaddockUpdate', function () {
		if (self.isVisible()) {
			self.locationTable.delClassNames('spinner');
			self._updatePaddocks();
			self._updateJoinButton();
		}
	});

	guild.on('guildPaddockBought', function (paddock) {
		if (self.isVisible()) {
			self._addPaddock(paddock);
			self._updateJoinButton();
		}
	});

	guild.on('guildPaddockRemoved', function (paddockId) {
		if (self.isVisible()) {
			self._removePaddock(paddockId);
			self._updateJoinButton();
		}
	});
};

GuildPaddocksWindow.prototype._createDom = function () {
	var self = this;

	this.locationTable = this.appendChild(new Table({
		className: 'locationTable',
		headerContent: [getText('ui.common.localisation')],
		colIds: ['location', 'abandoned'],
		highlightable: true,
		onRowTap: function (row) {
			self._updatePaddockDetails(row);
		}
	}));

	var rightColumn = this.createChild('div', { className: 'rightColumn' });
	var infos = rightColumn.createChild('div', { className: 'infos' });
	var image = infos.createChild('div', { className: 'image' });
	var details = infos.createChild('div', { className: 'details' });

	this.paddockName = details.createChild('div', { className: 'name' });

	details.createChild('div', { className: ['text', 'clear'], text: getText('ui.common.objects') });
	this.maxItems = details.createChild('div', { className: ['text', 'right'], text: '-' });

	details.createChild('div', { className: ['text', 'clear'], text: getText('ui.common.mounts') });
	this.maxMounts = details.createChild('div', { className: ['text', 'right'], text: '-' });

	this.joinButton = new Button({ className: ['button', 'clear'], text: getText('ui.common.join') }, function () {
		if (self.selectedPaddock && self.selectedPaddock.paddockId) {
			window.dofus.sendMessage('GuildPaddockTeleportRequestMessage', {
				paddockId: self.selectedPaddock.paddockId
			});
			windowsManager.close('social');
		}
	});
	details.appendChild(this.joinButton);

	this.mountTable = rightColumn.appendChild(new Table({
		className: 'mountTable',
		headerContent: [getText('ui.common.mountType'), getText('ui.common.ownerWord')],
		colIds: ['mount', 'owner']
	}));

	assetPreloading.preloadImage('gfx/illusUi/IllusDinde.png', function (url) {
		image.setStyle('backgroundImage', url);
	});
};

GuildPaddocksWindow.prototype._updatePaddockDetails = function (row) {
	var selectedPaddock = this.selectedPaddock = row.paddock;

	var paddockEnrichData = selectedPaddock.enrichData || {};

	this.paddockName.setText(getText('ui.common.mountPark') + ' - ' + paddockEnrichData.subAreaName);
	this.maxItems.setText(selectedPaddock.maxItems + ' ' + getText('ui.common.maxWord'));

	var mountsInformations = selectedPaddock.mountsInformations;
	var mountsInfoLength = mountsInformations.length;
	this.maxMounts.setText(mountsInfoLength + ' / ' + selectedPaddock.maxOutdoorMount);

	this.mountTable.clearContent();

	if (!mountsInfoLength) {
		return;
	}

	for (var i = 0; i < mountsInfoLength; i += 1) {
		var mountsInformation = mountsInformations[i];
		var mountInfoEnrichData = mountsInformation.enrichData || {};

		var mountInfoRow = this.mountTable.addRow({
			mount: mountInfoEnrichData.mountType,
			owner: mountsInformation.ownerName
		});

		var mountName = mountsInformation.name || getText('ui.common.noName');
		addTooltip(mountInfoRow, mountName);
	}
};

GuildPaddocksWindow.prototype._createLocationTableRow = function (paddock) {
	var locationInfo = new WuiDom('div', { className: 'locationInfo' });
	var locationText = locationInfo.createChild('div');

	var abandoned;

	if (paddock.abandonned) {
		abandoned = locationInfo.createChild('div', { className: 'abandonedIcon' });
		addTooltip(abandoned, getText('ui.social.paddockWithNoOwner'));
	}

	var enrichData = paddock.enrichData || {};

	var worldX = isNaN(paddock.worldX) ? enrichData.worldX : paddock.worldX;
	var worldY = isNaN(paddock.worldY) ? enrichData.worldY : paddock.worldY;

	var coordinateText = '(' + worldX + ', ' + worldY + ')';

	locationText.setText(enrichData.areaName + ' (' + enrichData.subAreaName + ') ' + coordinateText);

	return {
		location: locationText,
		abandoned: abandoned || ''
	};
};

GuildPaddocksWindow.prototype._updateJoinButton = function () {
	var paddocks = window.gui.playerData.guild.current.paddocks || [];

	if (paddocks.length) {
		this.joinButton.enable();
	} else {
		this.joinButton.disable();
	}
};

GuildPaddocksWindow.prototype._updatePaddocks = function () {
	var paddocks = window.gui.playerData.guild.current.paddocks || [];

	this._resetAll();

	for (var i = 0; i < paddocks.length; i += 1) {
		this._addPaddock(paddocks[i]);
	}
};

GuildPaddocksWindow.prototype._addPaddock = function (paddock) {
	var locationRow = this._createLocationTableRow(paddock);
	this.locationTable.addRow(locationRow, { paddock: paddock });
};

GuildPaddocksWindow.prototype._removePaddock = function (paddockId) {
	var rows = this.locationTable.getRows();

	for (var i = 0; i < rows.length; i += 1) {
		var row = rows[i];

		if (row.paddock.paddockId === paddockId) {
			this.locationTable.delRow(i);
			break;
		}
	}
};

GuildPaddocksWindow.prototype._resetAll = function () {
	this.locationTable.clearContent();
	this.mountTable.clearContent();
	this.joinButton.disable();
	this.paddockName.setText('');
	this.maxItems.setText('-');
	this.maxMounts.setText('-');
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/GuildWindow/GuildPaddocksWindow/index.js
 ** module id = 878
 ** module chunks = 0
 **/