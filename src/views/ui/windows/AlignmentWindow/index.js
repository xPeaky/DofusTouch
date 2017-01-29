require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Table = require('Table');
var ProgressBar = require('ProgressBar');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var CharacterDisplay = require('CharacterDisplayWebGL');
var DirectionsEnum = require('DirectionsEnum');
var addTooltip = require('TooltipBox').addTooltip;

/*
 * @class AlignmentWindow
*/
function AlignmentWindow() {
	WuiDom.call(this, 'div', { className: 'AlignmentWindow', name: 'alignment' });
	var self = this;
	this._setupEvents();
	this.once('opened', function () {
		self._createDom();
		self._updateDisplay();

		self.on('open', function () {
			self._updateDisplay();
		});

		self.on('opened', function () {
			self.updateCharacter();
		});
	});

	this.on('closed', function () {
		this.characterDisplay.release();
	});
}

inherits(AlignmentWindow, WuiDom);
module.exports = AlignmentWindow;

AlignmentWindow.prototype.updateCharacter = function () {
	var look = window.gui.playerData.characterBaseInformations.entityLook;
	this.characterDisplay.setLook(look, {
		riderOnly: true,
		direction: DirectionsEnum.DIRECTION_SOUTH,
		animation: 'AnimStatique',
		boneType:  'characters/',
		skinType:  'characters/'
	});
};

AlignmentWindow.prototype._createDom = function () {
	var leftColumn = this.createChild('div', { className: 'leftColumn' });
	var rightColumn = this.rightColumn = this.createChild('div', { className: 'rightColumn' });

	var topRow = leftColumn.createChild('div', { className: 'topRow' });
	var thumbnail = topRow.createChild('div', { className: 'thumbnail' });
	this.alignmentImage = thumbnail.createChild('div', { className: 'alignmentImage' });

	this.characterDisplay = topRow.appendChild(new CharacterDisplay({
		scale: 2, verticalAlign: 'top', horizontalAlign: 'center'
	}));

	var alignmentWingsWrapper = new WuiDom('div', { className: 'alignmentWingsWrapper' });
	this.characterDisplay.insertAsFirstChild(alignmentWingsWrapper);

	this.alignmentWingsContainer = alignmentWingsWrapper.createChild('div', { className: 'alignmentWingsContainer' });

	var infoRow = leftColumn.createChild('div', { className: 'alignmentInfo' });
	this.alignmentName = infoRow.createChild('div', { className: 'title' });
	this.alignmentLevel = infoRow.createChild('div', { className: 'level' });

	var pvpBox = leftColumn.createChild('div', { className: 'pvpBox' });
	pvpBox.createChild('div', { className: 'title', text: getText('ui.pvp.pvpMode') });

	var pvpContainer = this.pvpContainer = pvpBox.createChild('div', { className: 'pvpContainer' });
	var rankContainer = pvpContainer.createChild('div', { className: 'rankContainer' });
	rankContainer.createChild('div', { className: 'rank', text: getText('ui.pvp.rank') });
	this.alignmentGrade = rankContainer.createChild('div', { className: 'value' });

	var progress = pvpContainer.createChild('div', { className: 'progress' });
	progress.createChild('div', { className: 'text', text: getText('ui.pvp.honourPoints') });
	this.honorPoints = progress.appendChild(new ProgressBar({ className: 'yellow' }));

	function honorTooltip() {
		if (window.gui.playerData.isPvpAggressable()) {
			return window.gui.playerData.alignment.alignmentInfos.honor + ' / ' +
				window.gui.playerData.alignment.alignmentInfos.honorNextGradeFloor;
		} else {
			return '0';
		}
	}

	addTooltip(this.honorPoints, honorTooltip);

	//TODO: populate content for "Aligned area modifiers" list
	pvpContainer.createChild('div', { className: 'text' });
	pvpContainer.appendChild(new Table({
		className: 'balance',
		headerContent: [getText('ui.pvp.alignedAreaModificators')],
		colIds: ['modifier']
	}));

	this.pvpButton = pvpBox.appendChild(new Button(getText('ui.pvp.enabled', { className: 'pvpButton' })));
	this.pvpButton.on('tap', function () {
		window.dofus.sendMessage('SetEnablePVPRequestMessage', { enable: !window.gui.playerData.isPvpAggressable() });
	});

	var header = rightColumn.createChild('div', { className: 'headerRow' });
	this.icon = header.createChild('div', { className: ['icon', 'image'] });
	this.title = header.createChild('div', { className: 'title' });

	this.specialisations = rightColumn.appendChild(new Table({
		className: 'specialisations',
		headerContent: [getText('ui.pvp.allSpecializations')],
		colIds: ['spec', 'minimumAlignment']
	}));

	rightColumn.createChild('div', { className: 'arrow' });

	//TODO: populate content for "Abilities" list
	rightColumn.appendChild(new Table({
		className: 'abilities',
		headerContent: [getText('ui.common.feats')],
		colIds: ['ability']
	}));
};

AlignmentWindow.prototype._displayPvpInformations = function () {
	var self = this;
	var alignmentModule = window.gui.playerData.alignment;
	var isPvpAggressable = window.gui.playerData.isPvpAggressable();
	if (isPvpAggressable) {
		this.pvpButton.setText(getText('ui.pvp.disabled'));
		this.pvpContainer.delClassNames('disabled');

		alignmentModule.getTopWings(alignmentModule.alignmentInfos, function (wingsInfos) {
			self.alignmentWingsContainer.setStyles({
				backgroundImage: wingsInfos.backgroundImage,
				left: wingsInfos.left,
				top: wingsInfos.top,
				width: wingsInfos.width,
				height: wingsInfos.height
			});
		});

		this.alignmentGrade.setText(alignmentModule.getAlignmentGradeString());
		this.honorPoints.setValue(alignmentModule.getHonor());
	} else {
		this.pvpButton.setText(getText('ui.pvp.enabled'));
		this.pvpContainer.addClassNames('disabled');
		// remove wings
		this.alignmentWingsContainer.setStyle('backgroundImage', 'none');

		this.alignmentGrade.setText('-');
		this.honorPoints.setValue(0);
	}
};

AlignmentWindow.prototype._displaySpecialisations = function (orderId) {
	var alignmentModule = window.gui.playerData.alignment;
	var alignmentInfos = alignmentModule.alignmentInfos;
	this.specialisations.clearContent();
	if (alignmentInfos.alignmentSide === 0) { return; } //otherwise the code below shows a dumb "Neutral" row

	for (var i = 0; i < alignmentModule.alignmentRanks.length; i++) {
		var rank = alignmentModule.alignmentRanks[i];
		if (rank.orderId !== orderId) { continue; }
		this.specialisations.addRow([rank.nameId, rank.minimumAlignment]);
	}
};

AlignmentWindow.prototype._updateDisplay = function () {
	var alignmentModule = window.gui.playerData.alignment;
	var alignmentInfos = alignmentModule.alignmentInfos;
	if (!this.characterDisplay) { return; }
	var self = this;
	if (alignmentInfos.alignmentSide === 0) {
		this.rightColumn.addClassNames('disabled');
		this.pvpButton.hide();
	} else {
		this.rightColumn.delClassNames('disabled');
		this.pvpButton.show();
	}
	this._displayPvpInformations();

	var nameId = alignmentModule.getNameId();
	self.alignmentName.setText(getText('ui.common.alignment') + ' ' + nameId);

	alignmentModule.getRank(function (error, rank) {
		if (error) {
			return console.error('Failed to get alignment rank', error);
		}
		self.alignmentLevel.setText(rank.nameId + ' - ' +
			getText('ui.common.level') + ' ' + alignmentInfos.alignmentValue);
		self._displaySpecialisations(rank.orderId);
		alignmentModule.getOrder(rank, function (error, alignmentOrder) {
			if (error) {
				return console.error('Failed to get AlignmentOrder', error);
			}
			self.title.setText(alignmentOrder.nameId);

			alignmentModule.getAlignmentImageUrl(function (url) {
				self.alignmentImage.setStyle('backgroundImage', url);
			});

			alignmentModule.getOrderImageUrl(alignmentOrder.id, function (url) {
				self.icon.setStyle('backgroundImage', url);
			});
		});
	});
};


AlignmentWindow.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;
	var alignmentModule = window.gui.playerData.alignment;

	alignmentModule.on('alignmentChanged', function () {
		self._updateDisplay();
	});

	gui.playerData.on('lookUpdate', function () {
		if (self.characterDisplay) {
			self.updateCharacter();
		}
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/AlignmentWindow/index.js
 ** module id = 735
 ** module chunks = 0
 **/