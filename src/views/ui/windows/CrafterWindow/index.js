require('./styles.less');
var Button = require('Button').DofusButton;
var CharacterDisplay = require('CharacterDisplayWebGL');
var CrafterDirectoryParamBitEnum = require('CrafterDirectoryParamBitEnum');
var SocialContactCategoryEnum = require('SocialContactCategoryEnum');
var DirectionsEnum = require('DirectionsEnum');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var CheckboxLabel = require('CheckboxLabel');
var staticContent = require('staticContent');
var assetPreloading = require('assetPreloading');
var AlignmentSideEnum = require('AlignmentSideEnum');

function CrafterWindow() {
	Window.call(this, {
		className: 'CrafterWindow',
		title: getText('ui.craft.crafter'),
		positionInfo: { top: 'c', left: 'c', width: 550, height: 380 }
	});

	var self = this;

	// fields
	var yesStr = getText('ui.common.yes');
	var noStr = getText('ui.common.no');

	// methods
	function updateCharacterLook(entityLook) {
		self.characterDisplay.clear();
		self.characterDisplay.setLook(entityLook, {
			direction: DirectionsEnum.DIRECTION_SOUTH,
			animation: 'AnimStatique',
			boneType:  'characters/',
			skinType:  'characters/',
			riderOnly: true
		});
	}

	function refreshPage(crafter, job) {
		var crafterId = crafter.playerInfo.playerId;
		if (window.gui.playerData.id === crafterId) {
			updateCharacterLook(window.gui.playerData.characterBaseInformations.entityLook);
		} else {
			// character look (request for ContactLookMessage)
			window.dofus.sendMessage('ContactLookRequestByIdMessage', {
				contactType: SocialContactCategoryEnum.SOCIAL_CONTACT_CRAFTER,
				playerId: crafter.playerInfo.playerId
			});
		}

		// general info
		self.name.setText(crafter.playerInfo.playerName);
		self.jobName.setText(job.nameId);
		self.jobLevel.setText(crafter.jobInfo.jobLevel);

		// alignment
		var alignmentSide = crafter.playerInfo.alignmentSide;

		if (alignmentSide !== AlignmentSideEnum.ALIGNMENT_ANGEL && alignmentSide !== AlignmentSideEnum.ALIGNMENT_EVIL) {
			alignmentSide = AlignmentSideEnum.ALIGNMENT_NEUTRAL;
		}
		var imagePath = 'gfx/alignments/wings/Artisan_tx_bg' + alignmentSide + '_frame0.png';
		assetPreloading.preloadImage(imagePath, function (imageUrl) {
			self.characterDisplay.setStyle('backgroundImage', imageUrl);
		});

		// location
		self.nearCraftTable.setText(crafter.playerInfo.isInWorkshop ? yesStr : noStr);
		self.coordinates.setText('-');

		if (crafter.playerInfo.isInWorkshop) {
			// NOTE: if not in workshop, Dofus does NOT respond with coordinates
			self.coordinates.setText('( ' + crafter.playerInfo.worldX + ',' + crafter.playerInfo.worldY + ' )');

			staticContent.getData('SubAreas', crafter.playerInfo.subAreaId, function (error, subArea) {
				if (error) {
					return console.error(error);
				}

				var area = window.gui.databases.Areas[subArea.areaId];
				self.location.setText(area.nameId + ' ( ' + subArea.nameId + ' )');
			});
		}

		// professional options
		var userDefinedParams = crafter.jobInfo.userDefinedParams;
		var mustPay = (userDefinedParams & CrafterDirectoryParamBitEnum.CRAFT_OPTION_NOT_FREE) !== 0;
		var freeOnFail = (userDefinedParams & CrafterDirectoryParamBitEnum.CRAFT_OPTION_NOT_FREE_EXCEPT_ON_FAIL) !== 0;
		var resourcesRequired = (userDefinedParams & CrafterDirectoryParamBitEnum.CRAFT_OPTION_RESOURCES_REQUIRED) !== 0;

		self.checkboxNotFree.toggleActivation(mustPay);
		self.freeOnFailCheckbox.toggleDisplay(!!job.specializationOfId);
		self.freeOnFailCheckbox.toggleActivation(freeOnFail);
		self.checkboxRessourcesNeeded.toggleActivation(resourcesRequired);
		self.minItems.setText(crafter.jobInfo.minSlots);

		// chat
		self.messageButton.enable();
	}

	function clean() {
		self.characterDisplay.release();
		delete self.crafter;
	}

	// init
	this.once('open', function () {
		// ui
		var colsWrapper = this.windowBody.createChild('div', { className: 'colsWrapper' });
		var col1 = colsWrapper.createChild('div', { className: 'col1' });
		var col2 = colsWrapper.createChild('div', { className: 'col2' });

		var blockCharacter = col1.createChild('div', { className: ['block', 'blockCharacter'] });
		this.characterDisplay = blockCharacter.appendChild(new CharacterDisplay({ scale: 2 }));
		this.characterDisplay.clear();

		var blockInfos = col2.createChild('div', { className: ['block', 'blockInfos'] });
		blockInfos.createChild('div', { className: 'title', text: getText('ui.common.informations') });

		var lineName = blockInfos.createChild('div', { className: 'line' });
		lineName.createChild('div', { className: 'label', text: getText('ui.common.name') });
		this.name = lineName.createChild('div', { className: ['value', 'name'] });

		var lineJob = blockInfos.createChild('div', { className: 'line' });
		lineJob.createChild('div', { className: 'label', text: getText('ui.craft.job') });
		this.jobName = lineJob.createChild('div', { className: ['value', 'job'] });

		var lineJobLevel = blockInfos.createChild('div', { className: 'line' });
		lineJobLevel.createChild('div', { className: 'label', text: getText('ui.craft.jobLevel') });
		this.jobLevel = lineJobLevel.createChild('div', { className: ['value', 'jobLevel'] });


		var blockLocation = col2.createChild('div', { className: ['block', 'blockLocation'] });
		blockLocation.createChild('div', { className: 'title', text: getText('ui.common.localisation') });

		var lineLocation = blockLocation.createChild('div', { className: 'line' });
		this.location = lineLocation.createChild('div', { className: ['value', 'location'] });

		var lineNear = blockLocation.createChild('div', { className: 'line' });
		lineNear.createChild('div', { className: 'label', text: getText('ui.craft.nearCraftTable') });
		this.nearCraftTable = lineNear.createChild('div', { className: ['value', 'nearCraftTable'] });

		var lineCoordinates = blockLocation.createChild('div', { className: 'line' });
		lineCoordinates.createChild('div', { className: 'label', text: getText('ui.common.coordinates') });
		this.coordinates = lineCoordinates.createChild('div', { className: ['value', 'coordinates'] });


		var blockOptions = col2.createChild('div', { className: ['block', 'blockOptions'] });
		blockOptions.createChild('div', { className: 'title', text: getText('ui.craft.jobOptions') });

		this.checkboxNotFree = blockOptions.appendChild(new CheckboxLabel(getText('ui.craft.notFree')));
		this.checkboxNotFree.disable();
		this.freeOnFailCheckbox = blockOptions.appendChild(new CheckboxLabel(getText('ui.craft.freeIfFailed')));
		this.freeOnFailCheckbox.addClassNames('freeOnFail');
		this.freeOnFailCheckbox.disable();
		this.checkboxRessourcesNeeded = blockOptions.appendChild(new CheckboxLabel(getText('ui.craft.ressourcesNeeded')));
		this.checkboxRessourcesNeeded.disable();

		var lineMinItem = blockOptions.createChild('div', { className: 'line' });
		lineMinItem.createChild('div', { className: 'label', text: getText('ui.craft.minItemInCraft') });
		this.minItems = lineMinItem.createChild('div', { className: ['value', 'minItems'] });

		this.messageButton = this.windowBody.appendChild(new Button(getText('ui.common.wMessage')));
		this.messageButton.addClassNames('messageButton');
		this.messageButton.on('tap', function () {
			window.gui.chat.startPrivateMessage(self.crafter.playerInfo.playerName);
		});

		// listeners

		// character look (response to ContactLookRequestByIdMessage)
		window.gui.on('ContactLookMessage', function (msg) {
			if (!self.crafter) {
				return;
			}
			updateCharacterLook(msg.look);
		});

		// player info updated
		window.gui.on('JobCrafterDirectoryAddMessage', function (msg) {
			if (!self.crafter) {
				return;
			}
			if (msg.listEntry.playerInfo.playerId === self.crafter.playerInfo.playerId) {
				self.crafter = msg.listEntry;
				refreshPage(self.crafter, self.job);
			}
		});

		// player left
		window.gui.on('JobCrafterDirectoryRemoveMessage', function (msg) {
			if (!self.crafter) {
				return;
			}
			if (msg.playerId === self.crafter.playerInfo.playerId) {
				self.messageButton.disable();
			}
		});
	});

	// open
	this.on('open', function (params) {
		params = params || {};
		this.crafter = params.crafter;
		this.job = params.job;

		refreshPage(this.crafter, this.job);
	});

	// close
	this.on('close', clean);
}

inherits(CrafterWindow, Window);
module.exports = CrafterWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CrafterWindow/index.js
 ** module id = 919
 ** module chunks = 0
 **/