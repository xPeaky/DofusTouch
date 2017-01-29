require('./styles.less');
var addTooltip                  = require('TooltipBox').addTooltip;
var characterSelection          = require('characterSelection');
var inherits                    = require('util').inherits;
var Window                      = require('Window');
var windowsManager              = require('windowsManager');
var getText                     = require('getText').getText;
var md5                         = require('md5');
var Button                      = require('Button');
var tapBehavior                 = require('tapBehavior');
var Table                       = require('Table');
var login                       = require('login');
var CharacterDisplay            = require('CharacterDisplayWebGL');
var CharacterDeletionErrorEnum  = require('CharacterDeletionErrorEnum');


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class CharacterSelectionWindow
 * @desc  Window for character selection
 */
function CharacterSelectionWindow() {
	Window.call(this, {
		className:    'CharacterSelectionWindow',
		title:        getText('ui.charsel.title'),
		positionInfo: {
			left:   'c',
			top:    'c',
			width:  650,
			height: 520,
			isFullScreen: true
		}
	});

	var self = this;

	// minimum row to show in the table
	var NUMBER_BOXES = 7;
	var CONFIRM_DELETION_LVL = 20;
	var name, level;
	var content = this.windowBody;
	var gui = window.gui;

	function updateMainBlock(selectedRow) {
		windowsManager.close('deleteCharacterConfirm');
		var characterData = selectedRow.data;
		name.setText(characterData.name);
		level.setText(getText('ui.common.level') + ' ' + characterData.level);
		self.selectedCharacter = characterData;

		self.characterDisplay.setLook(characterData.entityLook, {
			boneType: 'characters/',
			skinType: 'characters/'
		});

		self.xpSticker.setClassNames(['xpSticker', 'x' + characterData.bonusXp]);
	}

	function onDelete() {
		var secretQuestion = gui.playerData.identification.secretQuestion;
		var level = self.selectedCharacter.level;
		var id = self.selectedCharacter.id;
		var name = self.selectedCharacter.name;

		if (level >= CONFIRM_DELETION_LVL && secretQuestion) {
			// open DeleteCharacterConfirmWindow
			windowsManager.open('deleteCharacterConfirm', {
				id:             id,
				name:           name,
				secretQuestion: secretQuestion
			});
		} else {
			// deletion confirm popup

			gui.openConfirmPopup({
				title:   getText('ui.popup.warning'),
				message: getText('ui.popup.warnBeforeDelete', name),
				cb:      function (agreed) {
					if (agreed) {
						var secretAnswer = md5(id + '~000000000000000000');
						window.dofus.sendMessage('CharacterDeletionRequestMessage', {
							characterId:      id,
							secretAnswerHash: secretAnswer
						});
					}
				}
			});
		}
	}

	function onCharacterDeletionError(msg) {
		var reason = 'default';
		var gtReason = {
			TooManyDeletion: getText('ui.charSel.deletionErrorTooManyDeletion'),
			WrongAnswer:     getText('ui.charSel.deletionErrorWrongAnswer'),
			UnsecureMode:    getText('ui.charSel.deletionErrorUnsecureMode'),
			default:         getText('ui.charSel.deletionError')
		};

		if (msg.reason === CharacterDeletionErrorEnum.DEL_ERR_TOO_MANY_CHAR_DELETION) {
			reason = 'TooManyDeletion';
		} else if (msg.reason === CharacterDeletionErrorEnum.DEL_ERR_BAD_SECRET_ANSWER) {
			reason = 'WrongAnswer';
		} else if (msg.reason === CharacterDeletionErrorEnum.DEL_ERR_RESTRICED_ZONE) {
			reason = 'UnsecureMode';
		}
		gui.openSimplePopup(gtReason[reason]);
	}

	this.selectedCharacter = null;

	// left part = character table

	var leftColumn = this.leftColumn = content.createChild('div', { className: 'leftColumn' });

	this.charactersTable = leftColumn.appendChild(new Table({
		className:     'characterTable',
		minRows:       NUMBER_BOXES,
		highlightable: true,
		colIds:        [
			'name',
			'bonusXp'
		],
		headerContent: [''],
		onRowTap:      function (row) {
			if (!row.data) {
				return;
			}
			updateMainBlock(row);
		}
	}));

	var buttonsDiv = leftColumn.createChild('div', { className: 'buttonsDiv' });

	this.btnCreate = buttonsDiv.appendChild(new Button({
		text:      getText('ui.charsel.createCharacter'),
		className: ['newCharacterBtn', 'button'],
		sound:     'OK_BUTTON'
	}, function () {
		windowsManager.close('deleteCharacterConfirm');
		windowsManager.close(self.id);
		windowsManager.open('characterCreation');
	}));
	buttonsDiv.createChild('div', { className: 'xpBubble' });

	var btnChangeServer = buttonsDiv.appendChild(new Button({
		text:      getText('ui.charsel.changeServer'),
		className: ['changeServerBtn', 'button'],
		sound:     'CANCEL_BUTTON'
	}, function () {
		windowsManager.close(self.id);
		login.goBackToSelectionOf('server');
	}));

	// center panel

	var centerPanel = content.createChild('div', { className: 'centerPanel' });

	var nameLine = centerPanel.createChild('div', { className: ['line', 'nameLine'] });
	var nameDiv = nameLine.createChild('div', { className: 'nameDiv' });
	name = nameDiv.createChild('div', { className: 'name' });

	this.btnDelete = nameDiv.appendChild(new Button({
		className: 'delCharacterBtn',
		text:      'X'
	}, onDelete));

	var levelLine = centerPanel.createChild('div', { className: ['line', 'levelLine'] });
	level = levelLine.createChild('div', { className: 'level' });

	var characterDisplay = centerPanel.appendChild(new CharacterDisplay({ scale: 2.3 }));
	this.characterDisplay = characterDisplay;

	var leftBtn = characterDisplay.createChild('div', { className: 'leftButton' });
	tapBehavior(leftBtn, { repeatDelay: 100 });
	leftBtn.on('tap', function () {
		characterDisplay.rotateCharacter(false);
	});

	var rightBtn = characterDisplay.createChild('div', { className: 'rightButton' });
	tapBehavior(rightBtn, { repeatDelay: 100 });
	rightBtn.on('tap', function () {
		characterDisplay.rotateCharacter(true);
	});

	this.xpSticker = characterDisplay.createChild('div', { className: 'xpSticker' });
	addTooltip(this.xpSticker, getText('ui.information.xpFamilyBonus'));

	var btnPlay = this.btnPlay = centerPanel.appendChild(new Button({
		text:      getText('ui.common.play'),
		className: ['btnPlay', 'button'],
		sound:     'PLAY_BUTTON'
	}, function () {
		this.disable();
		characterSelection.selectCharacter(self.selectedCharacter.id);
	}));

	//trying to close the window is equivalent to going back to "server select"
	this.closeButton.on('tap', function () {
		btnChangeServer.emit('tap');
	});

	this.on('open', function (charactersList) {
		charactersList = charactersList.length ? charactersList : null; // getting empty object here
		this.charactersList = charactersList || this.charactersList;
		if (!this.charactersList) {
			return console.error('CharacterSelectionWindow opened without character list info');
		}

		self.updateCharacterList(this.charactersList);
		btnPlay.enable();
	});

	this.on('close', function () {
		windowsManager.close('deleteCharacterConfirm');
		characterDisplay.release();
	});

	gui.on('CharacterDeletionErrorMessage', this.localizeEvent(onCharacterDeletionError));
}

inherits(CharacterSelectionWindow, Window);
module.exports = CharacterSelectionWindow;


/**
 * This logic is from GameServerApproachFrame.as and CharacterSelection.as
 * @return {number} the "bonusXpCreation" that will be applied if we create a new character (1, 2, 3 or 4)
 */
function calculateBonusXp(characters) {
	var bonusXpCreation = 1;

	for (var i = 0, len = characters.length; i < len; i++) {
		var bonusXp = 1;
		for (var j = 0; j < len; j++) {
			if (characters[j].id !== characters[i].id && characters[j].level > characters[i].level && bonusXp < 4) {
				bonusXp++;
			}
		}
		characters[i].bonusXp = bonusXp;

		if (characters[i].level > 1) { bonusXpCreation++; }
	}
	return Math.min(bonusXpCreation, 4);
}

CharacterSelectionWindow.prototype.updateCharacterList = function (characters) {
	// NB: When bubble is not visible the character list is longer to avoid a big empty space
	var bonusXpCreation = calculateBonusXp(characters);
	this.leftColumn.setClassNames(['leftColumn', 'x' + bonusXpCreation + 'Bubble']);

	this.charactersTable.clearContent();

	var headerNameCol = this.charactersTable.header.getChildren()[0].getChild('name');
	headerNameCol.setHtml(getText('ui.connection.listCharacterLabel', characters.length));

	var breeds = window.gui.databases.Breeds;

	for (var i = 0; i < characters.length; i++) {
		var character = characters[i];
		var breedId   = character.breed || 0;
		var name      = character.name + ' (' + breeds[breedId].shortNameId + ' ' + character.level + ')';
		var row = this.charactersTable.addRow({ name: name }, { data: character });

		var bonusXp = character.bonusXp;
		if (bonusXp > 1) { row.getChildren()[1].addClassNames(['x' + bonusXp]); }
	}
};

//



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CharacterSelectionWindow/index.js
 ** module id = 688
 ** module chunks = 0
 **/