require('./styles.less');
var tooltip = require('TooltipBox');
var audioManager = require('audioManager');
var Button = require('Button').DofusButton;
var CheckboxLabel = require('CheckboxLabel');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var gameOptions = require('gameOptions');
var Scroller = require('Scroller');
var Selector = require('Selector');
var SingleSelectionList = require('ListV2').SingleSelectionList;
var SoundChannelVolume = require('SoundChannelVolume');
var tutorialTipsManager = require('tutorialTipsManager');
var userPref = require('UserPreferences');
var Window = require('Window');


function OptionsWindow() {
	Window.call(this, {
		className: 'OptionsWindow',
		title: getText('ui.common.options'),
		positionInfo: { left: 'c', top: 'c', width: '80%', height: '70%' }
	});

	this.optionDefinitions = null;
	this.sections = null;
	this.currentSection = null;
	this.optionMap = null;

	this.on('open', this._open);
}
inherits(OptionsWindow, Window);
module.exports = OptionsWindow;


OptionsWindow.prototype._initOptionDefinitions = function () {
	this.optionDefinitions = [{
		name: 'game',
		title: getText('ui.common.general'),
		optionDefs: [
			{ type: 'header', text: getText('ui.option.worldOption') },
			{ name: 'showAllMonsters', text: getText('ui.option.viewAllMonsterInGroup') },
			{ name: 'maxActorsBeforeCreatureMode', type: 'dropdown', text: getText('ui.option.creaturesMode'),
				values: [0, 10, 20, 40, 9999], labels: [0, 10, 20, 40, getText('ui.common.infinit')] },
			{ name: 'alwaysShowGrid', text: getText('tablet.option.alwaysShowGrid') },
			{ name: 'menubarSize', type: 'dropdown', text: getText('tablet.option.menubarSize'),
				values: [2, 3, 4, 5, 6], labels: [2, 3, 4, 5, 6] },

			{ type: 'header', text: getText('tablet.option.compass') },
			{ name: 'autoGpsFlags', text: getText('tablet.option.autoGpsFlags') },
			{ type: 'btn', text: getText('tablet.option.unfollowAllQuests'),
				action: window.gui.GPS.questFollower.unfollowAllQuests.bind(window.gui.GPS.questFollower) },
			{ name: 'autoGpsPhoenixes', text: getText('tablet.option.autoGpsPhoenixes') }
		]
	}, {
		name: 'fight',
		title: getText('tablet.option.fight'),
		optionDefs: [
			{ type: 'header', text: getText('tablet.option.fight') },
			{ name: 'menubarSizeInFight', type: 'dropdown',
				text: getText('tablet.option.fight.menubarSizeInFight'),
				values: [2, 3, 4, 5, 6], labels: [2, 3, 4, 5, 6] },
			{ name: 'toolbarThicknessInFight', type: 'dropdown', showedFor: ['narrowScreen'],
				text: getText('tablet.option.fight.toolbarThicknessInFight'),
				values: [1, 2, 3], labels: [1, 2, 3] },
			{ name: 'hideDeadFighters', text: getText('ui.option.hideDeadFighters') },
			{ name: 'allowSpellEffects', text: getText('ui.option.allowSpellEffects') },
			{ name: 'confirmBoxWhenDragCasting', text: getText('tablet.option.fight.confirmBoxWhenDragCasting') },
			{ name: 'confirmBoxWhenClickCasting', text: getText('tablet.option.fight.confirmBoxWhenClickCasting') },
			{ name: 'confirmBoxWhenWalking', text: getText('tablet.option.fight.confirmBoxWhenWalking') },
			{ name: 'showSpeechBubbleInFight', text: getText('tablet.option.fight.showSpeechBubbleInFight') },
			{ name: 'orderFighters', text: getText('tablet.option.fight.orderFighters') },
			{ name: 'showApMpUsed', text: getText('tablet.option.fight.showApMpUsed') }
		]
	}, {
		name: 'sounds',
		title: getText('ui.option.audio'),
		optionDefs: [
			{ type: 'header', text: getText('ui.option.audioSubtitle') },
			{ name: 'soundOnPlayerTurnStart', text: getText('ui.option.startTurnSound') }
			// TODO: other notification sound for Guild message reception
			// TODO: alerts for many events can do a notif + sound
			//       (sound can be on/off for each notif: make a custom "type" for this?)
		],
		create: OptionsWindow.prototype._createSoundOptions,
		init: OptionsWindow.prototype._initSoundOptions
	}, {
		name: 'misc',
		title: getText('ui.option.miscellaneousOptions'),
		optionDefs: [
			{ type: 'header', text: getText('ui.tutorial.tutorial') },
			{ name: 'tutorialTips', text: getText('ui.option.allowTutorial') },
			{ type: 'btn', text: getText('ui.option.resetHints'),
				action: tutorialTipsManager.resetTips.bind(tutorialTipsManager) },
			{ type: 'header', text: getText('tablet.option.spellTooltip') },
			{ name: 'spellTooltipName', text: getText('tablet.option.spellTooltipName') },
			{ name: 'spellTooltipApRange', text: getText('tablet.option.spellTooltipApRange') },
			{ name: 'spellTooltipCritical', text: getText('tablet.option.spellTooltipCritical') },
			{ name: 'spellTooltipEffect', text: getText('tablet.option.spellTooltipEffect') },
			{ name: 'spellTooltipDescription', text: getText('tablet.option.spellTooltipDescription') }
		]
	}];
};

OptionsWindow.prototype.freeContent = function () {
	this.windowBody.clearContent();
	this.sections = this.currentSection = null;
};

OptionsWindow.prototype._open = function () {
	if (!this.sections) {
		this._createContent();
		this.menuList.selectItem(0, { noSound: true });
	}
	this._initContent();
};

OptionsWindow.prototype._initContent = function () {
	for (var i = 0; i < this.optionDefinitions.length; i++) {
		this._initOptionSection(i, this.optionDefinitions[i]);
	}
};

OptionsWindow.prototype._createContent = function () {
	this.sections = [];
	this.optionMap = {};

	this._initOptionDefinitions();

	var content = this.windowBody.createChild('div', { className: 'content' });

	var menu = content.createChild('div', { className: 'menuCol' });
	this.menuList = menu.appendChild(new SingleSelectionList({ className: 'menu' }, { disableSelectionToggle: true }));
	var self = this;
	this.menuList.on('selected', function (item) {
		self._showSection(item.id);
		this.scrollToElement(item);
	});

	var settings = content.createChild('div', { className: 'settingsCol' });
	this.settingsScroller = settings.appendChild(new Scroller({ className: 'settings' }));
	this.settingsCol = this.settingsScroller.content;

	for (var i = 0; i < this.optionDefinitions.length; i++) {
		this._createOptionSection(this.optionDefinitions[i]);
	}
};

OptionsWindow.prototype._showSection = function (id) {
	if (this.currentSection) { this.currentSection.hide(); }
	this.currentSection = this.sections[id];
	this.currentSection.show();
	this.settingsScroller.refresh();
};

function checkboxActionFn(isActive) {
	gameOptions.changeValue(this.myName, isActive);
}

function newCheckboxOption(section, name, text) {
	var checkbox = section.appendChild(new CheckboxLabel(text, false));
	checkbox.addClassNames('settingOption');
	checkbox.myName = name;
	checkbox.on('change', checkboxActionFn);
	return checkbox;
}

// NB: buttons do not change game options directly; they implement specific behaviors of the Option window itself.
function newButtonOption(section, text, tooltipText, action) {
	var btn = section.appendChild(new Button(text, { className: ['settingOption', 'optionButton'] }, action));
	if (tooltipText) { tooltip.addTooltip(btn, tooltipText); }
}

function selectorActionFn(value) {
	gameOptions.changeValue(this.myName, value);
}

function newDropdownOption(section, name, text, values, labels) {
	labels = labels || values;

	var div = section.createChild('div');
	div.createChild('div', { className: ['settingOption', 'dropdownLabel'], text: text });
	var selector = div.appendChild(new Selector({ className: 'settingOption' }));
	selector.myName = name;
	selector.on('change', selectorActionFn);

	for (var i = 0; i < values.length; i++) {
		selector.addOption(labels[i], values[i]);
	}
	return selector;
}

function isAvailableOption(opDef) {
	var showedFor = opDef.showedFor;
	if (!showedFor) { return true; } // no restriction => available

	for (var i = 0; i < showedFor.length; i++) {
		switch (showedFor[i]) {
		case 'narrowScreen':
			if (window.gui.ipadRatio) { return true; }
			break;
		default: console.error('Invalid showedFor value:', showedFor[i]);
		}
	}
	return false;
}

OptionsWindow.prototype._createOptionSection = function (sectionDef) {
	var sectionId = this.sections.length;

	var menuItem = this.menuList.addItem({ id: sectionId, element: sectionDef.title }, { noRefresh: true });
	if (sectionId % 2) { menuItem.addClassNames('odd'); }

	var section = this.settingsCol.createChild('div',
		{ className: ['optionSection', sectionDef.name + 'Section'], hidden: true });

	if (sectionDef.text) {
		var titleBox = section.createChild('div', { className: 'titleBox' });
		titleBox.createChild('div', { className: 'sectionDescription', text: sectionDef.text });
	}
	var allOptions = section.createChild('div', { className: 'allOptions' });

	var optionDefs = sectionDef.optionDefs;
	for (var i = 0; i < optionDefs.length; i++) {
		var opDef = optionDefs[i];
		if (!isAvailableOption(opDef)) { continue; } // skip unavailable options for this OS/device/etc.
		var opType = opDef.type || 'bool';
		var op = null;

		switch (opType) {
		case 'bool': op = newCheckboxOption(allOptions, opDef.name, opDef.text); break;
		case 'dropdown': op = newDropdownOption(allOptions, opDef.name, opDef.text, opDef.values, opDef.labels); break;
		case 'btn': newButtonOption(allOptions, opDef.text, opDef.tooltipText, opDef.action); break;
		case 'header': allOptions.createChild('div', { className: 'header', text: opDef.text }); break;
		default: console.warn('Unvalid option type:', opType);
		}
		if (op) { this.optionMap[opDef.name] = op; }
	}

	if (sectionDef.create) { sectionDef.create.call(this, allOptions); }

	this.sections.push(section);
	return section;
};

OptionsWindow.prototype._initOptionSection = function (sectionId, sectionDef) {
	var optionDefs = sectionDef.optionDefs;
	for (var i = 0; i < optionDefs.length; i++) {
		var opDef = optionDefs[i], name = opDef.name;
		if (!isAvailableOption(opDef)) { continue; } // skip unavailable options for this OS/device/etc.
		var element = this.optionMap[name];
		var opType = opDef.type || 'bool';

		switch (opType) {
		case 'bool': element.toggleActivation(gameOptions[name], /*isSilent=*/true); break;
		case 'dropdown': element.select(gameOptions[name], /*isSilent=*/true); break;
		case 'btn': break; // no init needed
		case 'header': break; // no init needed
		default: console.warn('Unvalid option type:', opType);
		}
	}

	if (sectionDef.init) { sectionDef.init.call(this); }
};

OptionsWindow.prototype._newSoundChannelOption = function (section, channelId, text, soundPreferences) {
	this.optionMap[channelId + 'Sound'] = section.appendChild(
		new SoundChannelVolume(soundPreferences, channelId, text));
};

OptionsWindow.prototype._setSoundChannelVolume = function (channelId, soundPreferences) {
	this.optionMap[channelId + 'Sound'].setPosition(soundPreferences[channelId].volume || 0);
};

OptionsWindow.prototype._createSoundOptions = function (section) {
	// TODO: mute sound checkbox to mute all channels in one action (audio manager will implement this later)

	var soundPreferences = userPref.getValue('soundPreferences', audioManager.getDefaultParams(), true);

	this._newSoundChannelOption(section, 'music', getText('ui.option.musics'), soundPreferences);
	this._newSoundChannelOption(section, 'sfx', getText('ui.option.environment'), soundPreferences);
	this._newSoundChannelOption(section, 'ui', getText('ui.option.sounds'), soundPreferences);
};

OptionsWindow.prototype._initSoundOptions = function () {
	var soundPreferences = userPref.getValue('soundPreferences', audioManager.getDefaultParams(), true);

	this._setSoundChannelVolume('music', soundPreferences);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/OptionsWindow/index.js
 ** module id = 947
 ** module chunks = 0
 **/