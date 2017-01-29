require('./styles.less');
var CrafterDirectoryParamBitEnum = require('CrafterDirectoryParamBitEnum');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var CheckboxLabel = require('CheckboxLabel');
var Selector = require('Selector');

function JobOptionsWindow() {
	Window.call(this, {
		className: 'JobOptionsWindow',
		title: getText('ui.craft.jobOptions'),
		positionInfo: { left: 'c', top: 'c', width: 400, height: 240 }
	});

	var self = this;

	// fields
	var activateStr = getText('ui.craft.enablePublicMode');
	var deactivateStr = getText('ui.craft.disablePublicMode');
	var minSlot = 1;

	// methods
	function getUserDefinedParamsBit() {
		var notFreeExceptOnFail = self.freeOnFailCheckbox.isActivate() && self.freeOnFailCheckbox.isVisible();

		var mustPayBit;
		if (self.payingCheckbox.isActivate()) {
			mustPayBit = CrafterDirectoryParamBitEnum.CRAFT_OPTION_NOT_FREE;
		} else {
			mustPayBit = CrafterDirectoryParamBitEnum.CRAFT_OPTION_NONE;
		}

		var freeOnFailBit;
		if (notFreeExceptOnFail) {
			freeOnFailBit = CrafterDirectoryParamBitEnum.CRAFT_OPTION_NOT_FREE_EXCEPT_ON_FAIL;
		} else {
			freeOnFailBit = CrafterDirectoryParamBitEnum.CRAFT_OPTION_NONE;
		}

		var noResourcesBit;
		if (self.noResourceCheckbox.isActivate()) {
			noResourcesBit = CrafterDirectoryParamBitEnum.CRAFT_OPTION_RESOURCES_REQUIRED;
		} else {
			noResourcesBit = CrafterDirectoryParamBitEnum.CRAFT_OPTION_NONE;
		}

		return mustPayBit + freeOnFailBit + noResourcesBit;
	}

	function saveSettings() {
		self.jobCrafterDirectorySettings = {
			jobId: self.job.id,
			minSlot: minSlot,
			userDefinedParams: getUserDefinedParamsBit()
		};
		window.dofus.sendMessage('JobCrafterDirectoryDefineSettingsMessage', { settings: self.jobCrafterDirectorySettings });
		// => if success we receive a JobCrafterDirectorySettingsMessage (no known case of fail beside broken connection)
	}

	function loadSettings(jobId) {
		// Get the crafter's settings for a specific jobId
		var craftersSettings = window.gui.playerData.jobs.craftersSettings;
		var settings = {};
		for (var id in craftersSettings) {
			if (craftersSettings[id].jobId === jobId) {
				settings = craftersSettings[id];
				break;
			}
		}

		// update the checkboxes
		var userDefinedParams = settings.userDefinedParams;

		var mustPay = (userDefinedParams & CrafterDirectoryParamBitEnum.CRAFT_OPTION_NOT_FREE) !== 0;
		var freeOnFail = (userDefinedParams & CrafterDirectoryParamBitEnum.CRAFT_OPTION_NOT_FREE_EXCEPT_ON_FAIL) !== 0;
		var requireResource = (userDefinedParams & CrafterDirectoryParamBitEnum.CRAFT_OPTION_RESOURCES_REQUIRED) !== 0;

		self.payingCheckbox.toggleActivation(mustPay);
		self.freeOnFailCheckbox.toggleActivation(freeOnFail);
		self.noResourceCheckbox.toggleActivation(requireResource);

		// selector
		self.selector.clearContent();
		var maxSlots = window.gui.playerData.jobs.getMaxSlotsByJobId(self.job.id);
		for (var i = 1; i <= maxSlots; i += 1) {
			self.selector.addOption(i, i);
		}

		// the first time the server give you a minSlot of 0, but the selector first options is 1
		self.selector.setValue(!settings.minSlot ? 1 : settings.minSlot);
	}

	function togglePublicMode() { // NOTE: active immediately
		window.dofus.sendMessage('JobAllowMultiCraftRequestSetMessage', { enabled: !this.isPublicMode });
		// => if success we will receive event 'jobPublicMode' below...
		// => if refused by server (e.g. if we did not equip the right tool), only a TextInformationMessage
	}

	this.once('open', function () {
		// set the layout
		var container = self.windowBody.createChild('div', { className: 'container' });
		container.createChild('div', { text: getText('ui.craft.referencingOptions') });

		self.payingCheckbox = container.appendChild(new CheckboxLabel(getText('ui.craft.notFree')));
		self.freeOnFailCheckbox = container.appendChild(new CheckboxLabel(getText('ui.craft.freeIfFailed')));
		self.freeOnFailCheckbox.addClassNames('freeOnFail');
		self.noResourceCheckbox = container.appendChild(new CheckboxLabel(getText('ui.craft.ressourcesNeeded')));

		var selectorWrapper = container.createChild('div', { className: 'selectorWrapper' });
		selectorWrapper.createChild('div', { className: 'selectorLabel', text: getText('ui.craft.minItemInCraft') });

		self.selector = selectorWrapper.appendChild(new Selector());
		self.selector.on('change', function (value) {
			minSlot = Number(value);
		});

		var buttons = self.windowBody.createChild('div', { className: 'buttons' });

		this.publicButton = buttons.appendChild(new Button(activateStr, { className: 'publicButton' }));
		this.publicButton.on('tap', togglePublicMode);

		this.saveButton = buttons.appendChild(new Button(getText('ui.common.save'), { className: 'saveButton' }));
		this.saveButton.on('tap', saveSettings);

		// listeners

		// public mode
		window.gui.playerData.jobs.on('jobPublicMode', function (isPublicMode) {
			self.publicButton.setText(isPublicMode ? deactivateStr : activateStr);
			self.publicButton.isPublicMode = isPublicMode;
		});
	});

	this.on('open', function (params) {
		this.job = window.gui.playerData.jobs.list[params.jobId];
		this.freeOnFailCheckbox.toggleDisplay(!!this.job.info.specializationOfId);
		loadSettings(params.jobId);
	});
}

inherits(JobOptionsWindow, Window);
module.exports = JobOptionsWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/JobOptionsWindow/index.js
 ** module id = 900
 ** module chunks = 0
 **/