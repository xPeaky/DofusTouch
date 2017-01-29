require('./styles.less');
var assetPreloading = require('assetPreloading');
var Button = require('Button').DofusButton;
var CharacterDisplay = require('CharacterDisplayWebGL');
var CheckboxLabel = require('CheckboxLabel');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Ornament = require('Ornament');
var SingleSelectionList = require('ListV2').SingleSelectionList;
var staticContent = require('staticContent');
var Tabs = require('Tabs');
var userPref = require('UserPreferences');
var WuiDom = require('wuidom');

function OrnamentsWindow() {
	WuiDom.call(this, 'div', { className: 'OrnamentsWindow', name: 'ornaments' });

	var self = this;
	this._titlesAndOrnaments = null;
	this._currentTitleId = null;
	this._currentOrnamentId = null;
	this._titlesAndOrnamentsListRequested = false;

	function onOpened(params) {
		self._ornamentIdToSelect = ~~params.ornamentId;
		self._titleIdToSelect = ~~params.titleId;

		if (!self._titlesAndOrnamentsListRequested) {
			self._displayLoading(true);
			self._titlesAndOrnamentsListRequested = true;
			window.dofus.sendMessage('TitlesAndOrnamentsListRequestMessage');
			return;
		}
		self._selectOnceReady();
	}

	this.once('open', function (params) {
		self._createDom();
		self._displayLoading(true);
		self._loadContent(function () {
			self._setupEvents();
			self.on('opened', onOpened);
			onOpened(params);
		});

		var look = window.gui.playerData.characterBaseInformations.entityLook;
		self._updateCharacter(look);
	});
}

inherits(OrnamentsWindow, WuiDom);
module.exports = OrnamentsWindow;


OrnamentsWindow.prototype._selectOnceReady = function () {
	if (this._ornamentIdToSelect) {
		this.tabs.openTab('ornaments');
		this.ornamentList.selectItem(this._ornamentIdToSelect);
	} else if (this._titleIdToSelect) {
		this.tabs.openTab('titles');
		this.titleList.selectItem(this._titleIdToSelect);
	} else {
		this._selectActiveTitleAndOrnament();
	}
};

OrnamentsWindow.prototype._setupEvents = function () {
	var self = this;

	window.gui.on('disconnect', function () {
		self._titlesAndOrnamentsListRequested = false;
		if (self.tabs) { self.tabs.openFirstTab(); }
	});

	window.gui.on('TitlesAndOrnamentsListMessage', function (msg) {
		self._titlesAndOrnaments = msg;
		// making sure 'none' is also in the owned list
		self._titlesAndOrnaments.titles.push(0);
		self._titlesAndOrnaments.ornaments.push(0);
		self._updateOrnamentList();
		self._updateTitleList();
		self._displayLoading(false);
		var showAll = userPref.getValue('dofus_titleOrnaments_display_all', false);
		self.showAllCheckbox.toggleActivation(showAll);
		self._selectOnceReady();
	});

	window.gui.on('OrnamentSelectedMessage', function (msg) {
		if (!self._titlesAndOrnaments) { return; }
		self._titlesAndOrnaments.activeOrnament = msg.ornamentId;
	});

	window.gui.on('TitleSelectedMessage', function (msg) {
		if (!self._titlesAndOrnaments) { return; }
		self._titlesAndOrnaments.activeTitle = msg.titleId;
	});

	window.gui.on('OrnamentSelectErrorMessage', function () {
		// TODO: figure out how to display the error and it text
	});

	window.gui.on('TitleSelectErrorMessage', function () {
		// TODO: figure out how to display the error and it text
	});

	window.gui.on('TitleGainedMessage', function (msg) {
		var titleId = msg.titleId;
		self._titlesAndOrnaments.titles.push(titleId);
		self._updateTitleList();
		self._displayObtainedTitles();
	});

	window.gui.on('TitleLostMessage', function (msg) {
		var titleId = msg.titleId;
		var index = self._titlesAndOrnaments.titles.indexOf(titleId);
		if (index !== -1) {
			self._titlesAndOrnaments.titles.splice(index, 1);
		}
		self._updateTitleList();
		self._displayObtainedTitles();
	});

	window.gui.on('OrnamentGainedMessage', function (msg) {
		var ornamentId = msg.ornamentId;
		self._titlesAndOrnaments.ornaments.push(ornamentId);
		self._updateOrnamentList();
		self._displayObtainedOrnaments();
	});

	window.gui.playerData.on('lookUpdate', function (look) {
		if (self.character) {
			self._updateCharacter(look);
		}
	});
};

OrnamentsWindow.prototype._createDom = function () {
	var self = this;
	var col1 = this.createChild('div', { className: 'col1' });
	this.col2 = this.createChild('div', { className: 'col2' });

	var tabs = this.tabs = col1.appendChild(new Tabs());

	this.titleList = col1.appendChild(
		new SingleSelectionList({ className: 'titleList' }, { disableSelectionToggle: true }));

	this.titleList.on('selected', function (item) {
		self._setCharacterTitle(item.data.id);
		this.showElement(item);
	});

	this.ornamentList = col1.appendChild(
		new SingleSelectionList({ className: 'ornamentList' }, { disableSelectionToggle: true }));

	this.ornamentList.on('selected', function (item) {
		self._setCharacterOrnament(item.data.id);
		this.showElement(item);
	});

	var tabId = tabs.addTab(getText('ui.ornament.titles'), this.titleList, 'titles');
	var titlesTab = tabs.getTabTarget(tabId);
	titlesTab.on('opened', function () {
		self.titleList.refresh();
	});
	tabId = tabs.addTab(getText('ui.ornament.ornaments'), this.ornamentList, 'ornaments');
	var ornamentTab = tabs.getTabTarget(tabId);
	ornamentTab.on('opened', function () {
		self.ornamentList.refresh();
	});
	tabs.openFirstTab();

	this.showAllCheckbox = col1.appendChild(new CheckboxLabel(getText('ui.ornament.displayAll')));

	this.showAllCheckbox.on('change', function (checked) {
		userPref.setValue('dofus_titleOrnaments_display_all', checked);
		self._displayObtainedTitlesOrnaments();
	});

	this.container = this.col2.createChild('div', { className: 'container' });
	this.character = this.container.appendChild(new CharacterDisplay({ scale: 'cover', verticalAlign: 'bottom' }));
	this.ornamentContainer = this.container.createChild('div', { className: 'ornamentContainer' });

	// update the ornament width and height dynamically based on screen size
	this.ornament = this.ornamentContainer.appendChild(new Ornament());
	this.ornament.on('sizeChanged', function () {
		self.ornament.setStyle('marginTop', '0px');
		var marginTop = self.ornamentContainer.rootElement.offsetHeight - this.getHeight();
		if (marginTop < 0) {
			marginTop = 0;
		}
		self.ornament.setStyle('marginTop', marginTop + 'px');

		self.ornament.setStyle('marginLeft', '0px');
		var marginLeft = 0;
		if (self.ornament._canvas.rootElement.offsetWidth > self.ornamentContainer.rootElement.offsetWidth) {
			marginLeft = -(self.ornament._canvas.rootElement.offsetWidth - self.ornamentContainer.rootElement.offsetWidth) * 0.5;
		}
		self.ornament.setStyle('marginLeft', marginLeft + 'px');
	});

	this.warningWings = this.col2.createChild('div', {
		className: 'warningWings',
		text: getText('ui.ornament.warningWings'),
		hidden: true
	});

	var buttons = this.col2.createChild('div', { className: 'buttons' });
	var resetButton = buttons.appendChild(new Button(getText('ui.common.reset')));
	this.saveButton = buttons.appendChild(new Button(getText('ui.common.save')));
	this.saveButton.disable();

	resetButton.on('tap', function () {
		self._selectActiveTitleAndOrnament();
		self.saveButton.disable();
	});

	this.saveButton.on('tap', function () {
		var activeTitleId = self._getActiveTitleId();
		var activeOrnamentId = self._getActiveOrnamentId();

		if (activeTitleId !== self._currentTitleId) {
			window.dofus.sendMessage('TitleSelectRequestMessage', { titleId: self._currentTitleId });
		}
		if (activeOrnamentId !== self._currentOrnamentId) {
			window.dofus.sendMessage('OrnamentSelectRequestMessage', { ornamentId: self._currentOrnamentId });
		}
		this.disable();
	});
};

/**
 * @param {Object} data
 * @param {number} data.id - id from the static content
 * @param {string} data.maleText - maleText from the static content
 * @param {string} data.femaleText - femaleText from the static content
 * @param {boolean} data.visible - visible from the static content
 * @private
 */
OrnamentsWindow.prototype._addTitleElement = function (data) {
	var text = this._getTitleText(data);
	var title = new WuiDom('div', {
		className: 'row',
		text: text || getText('ui.common.none')
	});
	this.titleList.addItem(
		{
			id: data.id,
			element: title,
			data: data
		},
		{ noRefresh: true }
	);
};

OrnamentsWindow.prototype._getTitleText = function (data) {
	var gender = window.gui.playerData.characterBaseInformations.sex;
	return gender ? data.femaleText : data.maleText;
};

OrnamentsWindow.prototype._addOrnamentElement = function (data, imageUrl) {
	var ornament = new WuiDom('div', { className: 'row' });
	var icon = ornament.createChild('div', { className: 'icon' });
	icon.setStyle('backgroundImage', imageUrl);
	ornament.createChild('div', { text: data.nameId || getText('ui.common.none'), className: 'name' });
	this.ornamentList.addItem(
		{
			id: data.id,
			element: ornament,
			data: { id: data.id, assetId: data.assetId, visible: data.visible }
		},
		{ noRefresh: true }
	);
};

OrnamentsWindow.prototype._loadContent = function (cb) {
	var self = this;
	var images = ['ui/slot.png', 'gfx/illusUi/tx_bgTitleOrnament.png'];

	for (var i = 0; i < 6; i++) {
		images.push('gfx/ornaments/' + i + '.png');
	}

	assetPreloading.preloadImages(images, function (imageUrls) {
		staticContent.getAllDataTable(['Titles', 'Ornaments'], function (error, results) {
			if (error) {
				console.error('Titles and Ornaments: failed getting data', error);
				return cb(error);
			}

			var titles = results.Titles;
			var ornaments = results.Ornaments;

			self.container.setStyle('backgroundImage', imageUrls[1]);

			self._addTitleElement({ id: 0 });
			self._addOrnamentElement({ id: 0 }, imageUrls[0]);

			var i, data;

			for (i = 0; i < titles.length; i += 1) {
				data = titles[i];
				self._addTitleElement({
					id: data.id,
					maleText: data.nameMaleId,
					femaleText: data.nameFemaleId,
					visible: data.visible
				});
			}

			for (i = 0; i < ornaments.length; i += 1) {
				data = ornaments[i];
				self._addOrnamentElement(data, imageUrls[data.iconId + 2]);
			}

			cb();
		});
	});
};

OrnamentsWindow.prototype._displayLoading = function (isLoading) {
	this.titleList.toggleClassName('spinner', isLoading);
	this.ornamentList.toggleClassName('spinner', isLoading);
	this.titleList.getContentElement().toggleDisplay(!isLoading);
	this.ornamentList.getContentElement().toggleDisplay(!isLoading);
};

OrnamentsWindow.prototype._getActiveOrnamentId = function () {
	return this._titlesAndOrnaments && this._titlesAndOrnaments.activeOrnament;
};

OrnamentsWindow.prototype._getActiveTitleId = function () {
	return this._titlesAndOrnaments && this._titlesAndOrnaments.activeTitle;
};

OrnamentsWindow.prototype._getOwnedOrnaments = function () {
	return this._titlesAndOrnaments && this._titlesAndOrnaments.ornaments;
};

OrnamentsWindow.prototype._getOwnedTitles = function () {
	return this._titlesAndOrnaments && this._titlesAndOrnaments.titles;
};

OrnamentsWindow.prototype._updateCharacter = function (look) {
	console.log('Setting character\'s look', look);
	this.character.setLook(look, {
		riderOnly: true,
		direction: 2,
		boneType:  'characters/',
		skinType:  'characters/'
	});
};

OrnamentsWindow.prototype._selectActiveTitleAndOrnament = function () {
	if (!this._titlesAndOrnaments) { return; }
	var activeTitleId = this._getActiveTitleId();
	var activeOrnamentId = this._getActiveOrnamentId();
	this._currentTitleId = activeTitleId;
	this._currentOrnamentId = activeOrnamentId;
	this.titleList.deselectAll();
	this.ornamentList.deselectAll();
	this.titleList.selectItem(activeTitleId, { noEvent: true, noSound: true });
	this.ornamentList.selectItem(activeOrnamentId, { noEvent: true, noSound: true });
	this._setCharacterTitleAndOrnament(activeTitleId, activeOrnamentId);
};

OrnamentsWindow.prototype._displayObtainedTitles = function () {
	var displayAll = userPref.getValue('dofus_titleOrnaments_display_all', false);
	var titleList = this.titleList.getItems();
	var count = 0;

	for (var i = 0; i < titleList.length; i += 1) {
		var title = titleList[i];
		var showMe = displayAll && title.data.visible;
		title.toggleDisplay(showMe || title.data.isAvailable);
		if (title.isVisible()) {
			title.toggleClassName('odd', count % 2 === 0);
			count += 1;
		}
	}

	this.titleList.refresh();

	if (this._currentTitleId === null) { return; }
	var currentTitleElement = this.titleList.getItem(this._currentTitleId);
	if (!currentTitleElement.data.isAvailable) {
		this.titleList.selectItem(this._getActiveTitleId(), { noSound: true });
	}
};

OrnamentsWindow.prototype._displayObtainedOrnaments = function () {
	var displayAll = userPref.getValue('dofus_titleOrnaments_display_all', false);
	var ornamentList = this.ornamentList.getItems();
	var count = 0;

	for (var i = 0; i < ornamentList.length; i += 1) {
		var ornament = ornamentList[i];
		var showMe = displayAll && ornament.data.visible;
		ornament.toggleDisplay(showMe  || ornament.data.isAvailable);
		if (ornament.isVisible()) {
			ornament.toggleClassName('odd', count % 2 === 0);
			count += 1;
		}
	}

	this.ornamentList.refresh();

	if (this._currentOrnamentId === null) { return; }
	var currentOrnamentElement = this.ornamentList.getItem(this._currentOrnamentId);
	if (!currentOrnamentElement.data.isAvailable) {
		this.ornamentList.selectItem(this._getActiveOrnamentId(), { noSound: true });
	}
};

OrnamentsWindow.prototype._displayObtainedTitlesOrnaments = function () {
	this._displayObtainedTitles();
	this._displayObtainedOrnaments();
};

OrnamentsWindow.prototype._updateTitleList = function () {
	var titles = this._getOwnedTitles();
	var titleElements = this.titleList.getItems();

	for (var i = 0; i < titleElements.length; i += 1) {
		var titleElement = titleElements[i];
		var titleId = titleElement.data.id;

		var title = this._getTitleText(titleElement.data);
		if (title) {
			var childs = titleElement.getChildren();
			childs[0].setText(title);
		}

		var isAvailable = titles.indexOf(titleId) >= 0;
		titleElement.data.isAvailable = isAvailable;

		titleElement.toggleClassName('unavailable', !isAvailable);
	}
};

OrnamentsWindow.prototype._updateOrnamentList = function () {
	var ornaments = this._getOwnedOrnaments();
	var ornamentElements = this.ornamentList.getItems();

	for (var i = 0; i < ornamentElements.length; i += 1) {
		var ornamentElement = ornamentElements[i];
		var ornamentId = ornamentElement.data.id;
		var isAvailable = ornaments.indexOf(ornamentId) >= 0;
		ornamentElement.data.isAvailable = isAvailable;
		ornamentElement.toggleClassName('unavailable', !isAvailable);
	}
};

OrnamentsWindow.prototype._isSavable = function (titleId, ornamentId) {
	var titles = this._getOwnedTitles();
	var ornaments = this._getOwnedOrnaments();
	var activeTitleId = this._getActiveTitleId();
	var activeOrnamentId = this._getActiveOrnamentId();
	return (activeTitleId !== titleId || activeOrnamentId !== ornamentId) &&
		titles.indexOf(titleId) >= 0 && ornaments.indexOf(ornamentId) >= 0;
};

OrnamentsWindow.prototype._setCharacterTitle = function (titleId) {
	var titleItem = this.titleList.getItem(titleId);
	this._currentTitleId = titleId;
	var isSavable = this._isSavable(this._currentTitleId, this._currentOrnamentId);
	this.saveButton.setEnable(isSavable);
	this.ornament.changeAttributes({ title: this._getTitleText(titleItem.data) || '' });
	this.ornament.display();
};

OrnamentsWindow.prototype._setCharacterOrnament = function (ornamentId) {
	var ornamentItem = this.ornamentList.getItem(ornamentId);
	this._currentOrnamentId = ornamentId;
	var isSavable = this._isSavable(this._currentTitleId, this._currentOrnamentId);
	this.saveButton.setEnable(isSavable);
	this.ornament.changeAttributes({ ornamentAssetId: ornamentItem.data.assetId });
	this.ornament.display();
};

OrnamentsWindow.prototype._setCharacterTitleAndOrnament = function (titleId, ornamentId) {
	var playerData = window.gui.playerData;
	var titleElm = this.titleList.getItem(titleId);
	var ornamentElm = this.ornamentList.getItem(ornamentId);

	var title;
	if (titleElm) {
		title = this._getTitleText(titleElm.data);
	}

	this.ornament.setAttributes({
		charName: window.gui.playerData.characterBaseInformations.name,
		title: title,
		ornamentAssetId: ornamentElm && ornamentElm.data && ornamentElm.data.assetId,
		guild: playerData.guild && playerData.guild.current,
		alliance: playerData.alliance && playerData.alliance.current,
		alignmentInfos: window.gui.playerData.alignment.alignmentInfos
	});
	this.ornament.display();

	if (window.gui.playerData.alignment.alignmentInfos.alignmentGrade !== 0) {
		this.warningWings.show();
	} else {
		this.warningWings.hide();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/OrnamentsWindow/index.js
 ** module id = 745
 ** module chunks = 0
 **/