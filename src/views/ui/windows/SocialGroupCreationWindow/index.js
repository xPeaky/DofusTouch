require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var processText = require('getText').processText;
var windowsManager = require('windowsManager');
var Selector = require('Selector');
var DofusButton = require('Button').DofusButton;
var ColorPicker = require('ColorPicker');
var InputBox = require('InputBox');
var staticContent = require('staticContent');
var Button = require('Button');
var Scroller = require('Scroller');
var SwipingTabs = require('SwipingTabs');
var EmblemLogo = require('EmblemLogo');
var protocolConstants = require('protocolConstants');
var assetPreloading = require('assetPreloading');
var WuiDom = require('wuidom');

var COLOR_PICKER_WIDTH = 250;
var COLOR_PICKER_HEIGHT = 110;
var COLOR_PICKER_LUM_WIDTH = 20;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @constructor
 * @classdesc    The window that will let the user create a new guild.
 */
function SocialGroupCreationWindow() {
	Window.call(this, {
		className: 'SocialGroupCreationWindow',
		title: '',
		positionInfo: { left: 'c', top: 'c', width: '80%', height: '90%' }
	});

	var self = this;

	this._isModeratorOrMore = false;

	this.once('open', function () {
		self.addClassNames('spinner');
		self.windowBody.hide();

		self._createDom();

		assetPreloading.preloadImage('ui/slot.png', function (url) {
			self.slotIconImage = url;
		});

		staticContent.getAllDataTable(
			['EmblemSymbolCategories', 'EmblemSymbols', 'EmblemBackgrounds'],
			function (error, emblemData) {
				if (error) {
					return console.error('SocialGroupCreationWindow: Failed to retrieve emblem data', error);
				}

				self.emblemBackgrounds = emblemData.EmblemBackgrounds;
				self.emblemSymbols = emblemData.EmblemSymbols;
				self.emblemSymbolCategories = emblemData.EmblemSymbolCategories;

				self._generateSelectorOptions();
				self._displayEmblemBackgrounds(emblemData.EmblemBackgrounds);
				self._displayEmblemSymbols(emblemData.EmblemSymbols);
				self._setupUI();

				self.delClassNames('spinner');
				self.windowBody.show();

				self._updateUISize();

				self.on('open', function () {
					self.addClassNames('spinner');
					self._generateSelectorOptions();
					self.windowBody.hide();

					self.tabs.openTab('background');
					self._setupUI();

					self.delClassNames('spinner');
					self.windowBody.show();
				});

				self.on('opened', function () {
					self._updateUISize();
				});
			}
		);
	});

	var gui = window.gui;
	gui.on('GuildCreationStartedMessage', function () {
		self.mode = 'guild';
		self.modification = false;
		windowsManager.openDialog(self.id);
	});

	gui.on('GuildModificationStartedMessage', function (msg) {
		self.mode = 'guild';
		if (msg.canChangeName &&  msg.canChangeEmblem) {
			self.modification = 'all';
		} else if (msg.canChangeName) {
			self.modification = 'name';
		} else {
			self.modification = 'emblem';
		}
		windowsManager.openDialog(self.id);
	});

	gui.on('AllianceCreationStartedMessage', function () {
		self.mode = 'alliance';
		self.modification = false;
		windowsManager.openDialog(self.id);
	});

	gui.on('AllianceModificationStartedMessage', function (msg) {
		self.mode = 'alliance';
		if (msg.canChangeName &&  msg.canChangeEmblem && msg.canChangeTag) {
			self.modification = 'all';
		} else if (msg.canChangeName) {
			self.modification = 'name';
		} else {
			self.modification = 'emblem';
		}
		windowsManager.openDialog(self.id);
	});
}

inherits(SocialGroupCreationWindow, Window);
module.exports = SocialGroupCreationWindow;

SocialGroupCreationWindow.prototype._setupUI = function () {
	if (this.mode === 'alliance') {
		this.tagNameBox.show();
		this.tagInput.show();
		this.nameLabel.setText(getText('ui.alliance.name') + getText('ui.common.colon'));
		this.setTitle(getText('ui.alliance.creation'));
	} else {
		this.tagNameBox.hide();
		this.tagInput.hide();
		this.nameLabel.setText(getText('ui.social.guildName') + getText('ui.common.colon'));
		this.setTitle(getText('ui.social.guildCreation'));
	}

	if (!this.modification) {
		this._generateRandomEmblem();
		this.nameInput.enable();
		this.nameInput.setValue('');
		this.tagInput.enable();
		this.tagInput.setValue('');
		this.cover.hide();
		return;
	}

	var current = window.gui.playerData[this.mode].current;
	if (this.mode === 'alliance') {
		this.nameInput.setValue(current.allianceName);
		this.tagInput.setValue(current.allianceTag);
		this._setEmblem(current.allianceEmblem);
	} else {
		this.nameInput.setValue(current.guildName);
		this._setEmblem(current.guildEmblem);
	}

	switch (this.modification) {
	case 'all':
		this.nameInput.enable();
		this.tagInput.enable();
		this.cover.hide();
		break;
	case 'name':
		this.nameInput.enable();
		this.tagInput.enable();
		this.cover.show();
		break;
	case 'emblem':
		this.nameInput.disable();
		this.tagInput.disable();
		this.cover.hide();
		break;
	}
};

SocialGroupCreationWindow.prototype._setEmblem = function (emblem) {
	this.emblem.setValue(emblem, true);
	this.bgColor = emblem.backgroundColor;
	this.bgId = emblem.backgroundShape;
	this.symbolColor = emblem.symbolColor;
	this.symbolId = emblem.symbolShape;

	this.selector.select(this.emblemSymbols[emblem.symbolShape].categoryId);
	// TODO select right positions on the color pickers
};

SocialGroupCreationWindow.prototype._generateSelectorOptions = function () {
	if (!this.emblemSymbolCategories) {
		return;
	}

	this.selector.clearContent();
	this._isModeratorOrMore = window.gui.playerData.isModeratorOrMore();

	for (var i = 0; i < this.emblemSymbolCategories.length; i++) {
		var category = this.emblemSymbolCategories[i];

		if (!this._isModeratorOrMore && category.id === 13) { // category 13 is the admins logo
			continue;
		}

		this.selector.addOption(category.nameId, category.id);
	}

	this.selector.select(1);
};


SocialGroupCreationWindow.prototype._generateRandomEmblem = function () {
	this.bgColorPicker.generateRandomColor();
	this.motifColorPicker.generateRandomColor();

	var randomBgIndex = Math.round(Math.random() * (this.emblemBackgrounds.length - 1));
	var randomSymbolIndex = Math.round(Math.random() * (this.emblemSymbols.length - (this._isModeratorOrMore ? 2 : 1)));
	this._setBackgroundShape(this.emblemBackgrounds[randomBgIndex].id);
	this._setSymbolShape(this.emblemSymbols[randomSymbolIndex].iconId);
};


SocialGroupCreationWindow.prototype._setBackgroundShape = function (id) {
	this.emblem.setValue({ backgroundShape: id });
	this.bgId = id;
};


SocialGroupCreationWindow.prototype._setSymbolShape = function (id) {
	this.emblem.setValue({ symbolShape: id });
	this.symbolId = id;
};


SocialGroupCreationWindow.prototype._displayEmblemBackgrounds = function (backgrounds) {
	var self = this;
	var iconImages = [];

	for (var i = 0; i < backgrounds.length; i++) {
		iconImages.push('gfx/emblems/icons/back/' + backgrounds[i].id + '.png');
	}

	function tapBackground() {
		self._setBackgroundShape(this.id);
	}

	assetPreloading.preloadImages(iconImages, function (urls) {
		for (var i = 0; i < urls.length; i++) {
			var icon = self.backgroundScroller.content.appendChild(new Button({ className: 'icon' }, tapBackground));
			icon.setStyle('backgroundImage', urls[i] + ', ' + self.slotIconImage);
			icon.id = backgrounds[i].id;
		}
		self.backgroundScroller.refresh();
	});
};


SocialGroupCreationWindow.prototype._displayEmblemSymbols = function (symbols) {
	var self = this;
	var iconImages = [];

	self.notColorizable = [];

	for (var i = 0; i < symbols.length; i++) {
		iconImages.push('gfx/emblems/icons/up/' + symbols[i].iconId + '.png');

		if (!symbols[i].colorizable) {
			self.notColorizable.push(symbols[i].id);
		}
	}

	function tapSymbol() {
		self._setSymbolShape(this.id);
	}

	assetPreloading.preloadImages(iconImages, function (urls) {
		for (var i = 0; i < urls.length; i++) {
			var icon = self.symbolScroller.content.appendChild(new Button({ className: ['icon', 'white'] }, tapSymbol));
			icon.setStyle('backgroundImage', urls[i] + ', ' + self.slotIconImage);
			icon.categoryId = symbols[i].categoryId;
			icon.id = symbols[i].id;
		}

		self.selector.select(1);
	});
};

function checkEntry(entry, min, max, errorMsg) {
	var len = entry.length;
	if (len < min || len > max) {
		window.gui.openSimplePopup(processText(errorMsg, min, max));
		return false;
	}

	return true;
}


SocialGroupCreationWindow.prototype._createDom = function () {
	var self = this;

	var guildNameBox = this.windowBody.createChild('div', { className: 'guildNameBox' });
	this.nameLabel = guildNameBox.createChild('div', { className: 'label' });
	var info = guildNameBox.createChild('div', { className: 'info' });
	addTooltip(info, getText('ui.social.nameRules'), { openOnTap: true });
	var nameInput = this.nameInput = this.windowBody.appendChild(new InputBox({
		className: 'socialInputBox',
		attr: {
			type: 'text',
			maxlength: 30
		}
	}));

	var tagNameBox = this.tagNameBox = this.windowBody.createChild('div', { className: 'tagNameBox' });
	tagNameBox.createChild('div', {
		className: 'label',
		text: getText('ui.alliance.tagInfo') + getText('ui.common.colon')
	});
	info = tagNameBox.createChild('div', { className: 'info' });
	addTooltip(info, getText('ui.alliance.tagRules'), { openOnTap: true });
	var tagInput = this.tagInput = this.windowBody.appendChild(new InputBox({
		className: 'socialInputBox',
		attr: {
			type: 'text',
			maxlength: 30
		}
	}));

	this.emblem = this.windowBody.appendChild(new EmblemLogo());
	this.windowBody.createChild('div', {
		className: 'text',
		text: getText('ui.social.createEmblem') + getText('ui.common.colon')
	});

	var tabs = this.tabs = this.windowBody.appendChild(new SwipingTabs());
	this.cover = tabs.content.createChild('div', { className: 'cover' });
	var backgroundTab = new WuiDom('div', { className: 'backgroundTab' });
	var motifTab = new WuiDom('div', { className: 'motifTab' });

	tabs.addTab(getText('ui.social.emblemBack'), backgroundTab, 'background');
	tabs.addTab(getText('ui.social.emblemUp'), motifTab, 'motif');
	tabs.openTab('background');

	this.backgroundScroller = backgroundTab.appendChild(new Scroller({ className: 'iconScroller' }));
	this.bgColorPicker = backgroundTab.appendChild(new ColorPicker({
		tintWidth: COLOR_PICKER_WIDTH,
		tintHeight: COLOR_PICKER_HEIGHT,
		lumWidth: COLOR_PICKER_LUM_WIDTH
	}));

	function setBgColor(color) {
		if (self.bgColor === color.hex.substr(1)) {
			return;
		}

		self.bgColor = parseInt(color.hex.substr(1), 16);
		self.emblem.setValue({ backgroundColor: color.rgb });
	}

	this.bgColorPicker.on('colorChanged', setBgColor);
	this.bgColorPicker.on('newColor', setBgColor);

	var motifContainer = motifTab.createChild('div', { className: 'motifContainer' });
	this.selector = motifContainer.appendChild(new Selector());
	this.selector.on('change', function (value) {
		var list = self.symbolScroller.content.getChildren();
		value = parseInt(value, 10);

		for (var i = 0; i < list.length; i++) {
			if (value === list[i].categoryId) {
				list[i].show();
				continue;
			}

			list[i].hide();
		}
		self.symbolScroller.refresh();
	});
	this.symbolScroller = motifContainer.appendChild(new Scroller({ className: 'iconScroller' }));
	motifTab.once('opened', function () {
		self.symbolScroller.refresh();
	});

	this.motifColorPicker = motifTab.appendChild(new ColorPicker({
		tintWidth: COLOR_PICKER_WIDTH,
		tintHeight: COLOR_PICKER_HEIGHT,
		lumWidth: COLOR_PICKER_LUM_WIDTH
	}));

	function setEmblemColor(color) {
		if (self.symbolColor === color.hex.substr(1)) {
			return;
		}

		self.symbolColor = parseInt(color.hex.substr(1), 16);
		if (self.notColorizable.indexOf(self.symbolId) !== -1) {
			return;
		}

		self.emblem.setValue({ symbolColor: color.rgb });
	}

	this.motifColorPicker.on('colorChanged', setEmblemColor);
	this.motifColorPicker.on('newColor', setEmblemColor);

	var buttonContainer = this.windowBody.createChild('div', { className: 'buttonContainer' });
	var confirmButton = buttonContainer.appendChild(new DofusButton(getText('ui.common.validation')));

	confirmButton.on('tap', function () {
		var name = nameInput.getValue();

		var emblem = {
			symbolShape: self.symbolId,
			symbolColor: self.symbolColor,
			backgroundShape: self.bgId,
			backgroundColor: self.bgColor
		};

		if (self.mode === 'alliance') {
			if (!checkEntry(
					name,
					protocolConstants.MIN_ALLIANCENAME_LEN,
					protocolConstants.MAX_ALLIANCENAME_LEN,
					getText('ui.alliance.invalidLengthName')
				)) {
				return;
			}

			var tag = tagInput.getValue();
			if (!checkEntry(
					tag,
					protocolConstants.MIN_ALLIANCETAG_LEN,
					protocolConstants.MAX_ALLIANCETAG_LEN,
					getText('ui.alliance.invalidLengthTag')
				)) {
				return;
			}

			if (!self.modification) {
				return window.dofus.sendMessage('AllianceCreationValidMessage', {
					allianceName: name,
					allianceTag: tag,
					allianceEmblem: emblem
				});
			}

			switch (self.modification) {
			case 'all':
				window.dofus.sendMessage('AllianceModificationValidMessage', {
					allianceName: name,
					allianceTag: tag,
					Alliancemblem: emblem
				});
				break;
			case 'emblem':
				window.dofus.sendMessage('AllianceModificationEmblemValidMessage', {
					Alliancemblem: emblem
				});
				break;
			case 'name':
				window.dofus.sendMessage('AllianceModificationNameAndTagValidMessage', {
					allianceName: name,
					allianceTag: tag
				});
			}
		} else {
			if (!checkEntry(
					name,
					protocolConstants.MIN_GUILDNAME_LEN,
					protocolConstants.MAX_GUILDNAME_LEN,
					getText('ui.alliance.invalidLengthName')
				)) {
				return;
			}

			if (!self.modification) {
				return window.dofus.sendMessage('GuildCreationValidMessage', {
					guildName: name,
					guildEmblem: emblem
				});
			}

			switch (self.modification) {
			case 'all':
				window.dofus.sendMessage('GuildModificationValidMessage', {
					guildName: name,
					guildEmblem: emblem
				});
				break;
			case 'emblem':
				window.dofus.sendMessage('GuildModificationEmblemValidMessage', {
					guildEmblem: emblem
				});
				break;
			case 'name':
				window.dofus.sendMessage('GuildModificationNameValidMessage', {
					guildName: name
				});
			}
		}
	});
};

SocialGroupCreationWindow.prototype._updateUISize = function () {
	var contentHeight = this.bgColorPicker.rootElement.clientHeight;
	var contentWidth = this.bgColorPicker.rootElement.clientWidth;
	if (contentHeight === 0 || contentWidth === 0) { return; }

	this.bgColorPicker.updateDimensions(contentWidth, contentHeight, COLOR_PICKER_LUM_WIDTH);
	this.motifColorPicker.updateDimensions(contentWidth, contentHeight, COLOR_PICKER_LUM_WIDTH);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialGroupCreationWindow/index.js
 ** module id = 760
 ** module chunks = 0
 **/