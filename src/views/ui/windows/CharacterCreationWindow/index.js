require('./styles.less');
var assetPreloading = require('assetPreloading');
var constants = require('constants');
var Button = require('Button');
var CharacterCreationResultEnum = require('CharacterCreationResultEnum');
var CharacterDisplay = require('CharacterDisplayWebGL');
var characterSelection = require('characterSelection');
var ColorPicker = require('ColorPicker');
var colorHelper = require('colorHelper');
var Entity = require('Entity');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var InputBox = require('InputBox');
var itemManager = require('itemManager');
var PlusColorButton = require('PlusColorButton');
var protocolConstants = require('protocolConstants');
var Scroller = require('Scroller');
var showProgressively = require('helper').showProgressively;
var staticContent = require('staticContent');
var SwipingTabs = require('SwipingTabs');
var tapBehavior = require('tapBehavior');
var tooltip = require('TooltipBox');
var Window = require('Window');
var windowsManager = require('windowsManager');
var WuiDom  = require('wuidom');

/** Breed gameplay "complexity" - easy, medium, hard */
var breedComplexity = [2, 1, 2, 1, 3, 2, 1, 1, 1, 3, 1, 2, 3, 2, 2];

var FACE_CHANGE_POTION_ID = 13518;
var NAME_CHANGE_POTION_ID = 10860;
var COLOR_CHANGE_POTION_ID = 10861;
var SEX_CHANGE_POTION_ID = 10862;

var DISABLED_FEATURE_OPACITY = 0.6;

/**
 * Position x,y of the center tile on the island (per breed).
 * NB: Island's width is constant at 346px
 */
var IslandTilePos = {
	1:  [174, 252],
	2:  [173, 252],
	3:  [197, 252],
	4:  [218, 254],
	5:  [172, 253],
	6:  [179, 255],
	7:  [189, 253],
	8:  [194, 254],
	9:  [195, 252],
	10: [210, 253],
	11: [200, 256],
	12: [174, 252],
	13: [238, 239],
	14: [213, 208],
	15: [259, 239]
};
var DEFAULT_ISLAND_TILE_POS = [200, 252]; // will only use this if something goes wrong

var STEP_BLANK = 0, STEP_RACE = 1, STEP_PERSO = 2;

var INITAL_SPRITE_ORIENTATION = 3;
var SPRITE_COLOR_UPDATE_INTERVAL = 1000 / 24;

var SEX_MALE = 0, SEX_FEMALE = 1;

var NUM_HEADS = 8;

var BUTTON_HAMMER_DELAY = 500;

var CHARACTER_RENDERER_FEET_Y = 0.85; // renderer should export this

var MIN_VERTICAL_MARGIN = 5; // px


/**
 * @class Button for various functions - the look is different than usual "green" buttons.
 */
function BlackButton(className, text, tooltipText, action, hasIcon) {
	var btn = new Button({ className: [className, 'blackButton'], text: text, tooltip: tooltipText }, action);
	if (hasIcon) {
		if (text) { btn.createChild('div', { className: 'btnText', text: text }); }
		btn.createChild('div', { className: 'btnIcon' });
	}
	return btn;
}

/**
 * @class Button for selectors
 * @param {string|Array} className - classname or array of classnames for WuiDom
 * @param {WuiDom} myWindow - the character creation window
 * @param {function} action - tap action
 */
function SelectionButton(className, myWindow, action) {
	WuiDom.call(this, 'div', { className: className });
	this.myWindow = myWindow;
	tapBehavior(this);
	this.on('tap', action);
}
inherits(SelectionButton, WuiDom);

SelectionButton.prototype.setSelected = function (on) {
	if (on) {
		this.addClassNames('selected');
	} else {
		this.delClassNames('selected');
	}
};



/**
 * @class Window for character creation.
 * Note it looks like 2 windows because we display separately Breed Selection from the rest.
 */
function CharacterCreationWindow() {
	Window.call(this, {
		title: '', // see topLabel
		noCloseButton: true,
		className: 'CharacterCreationWindow',
		positionInfo: { left: 'c', top: 'c', width: '85%', maxWidth: 950, height: '100%', isFullScreen: true }
	});

	this._reset();

	this.on('open', function () {
		// Show spinner & disabled window right from the beginning of the "openning animation"
		this.addClassNames(['disabled', 'spinner']);
	});

	this.on('opened', this._initialize);
}
inherits(CharacterCreationWindow, Window);
module.exports = CharacterCreationWindow;


CharacterCreationWindow.prototype._reset = function () {
	this.step = STEP_BLANK;
	this.relookingParams = null;

	this.allBreeds = null;
	this.numBreeds = 0;
	this.headsMap = null;
	this.loadedHeads = [];
	this.lastRendering = 0;

	// NB: breedBtns[0] corresponds to the *male* breedId 1, while breedBtns[0 + numBreeds] has the female
	this.breedBtns = [];
	// headContainers[1][SEX_FEMALE] has the heads for females of breedId 1 (headContainers[0] is not used)
	this.headContainers = [];

	this.nameInput = null;
	this.currentIllustration = null;
	this.breedIllustration = this.breedIllustrationFade = null;
	this.breedDescription = null;
	this.breedName = null;
	this.breedStory = null;
	this.breedSelector = null;
	this.headSelector = null;
	this.colorPicker = null;
	this.colorButtons = null;
	this.selectedColor = null;

	this._assetUrlCache = {}; // see _getAsset method
	this.spriteStatus = {};

	// Main caracteristics below are set during _initialize method
	this.breedId = 1;
	this.sex = SEX_MALE;
	this.cosmeticId = 1;
	this.headOrder = 0;
};

/**
 * Called when window is closed or hidden
 */
CharacterCreationWindow.prototype.freeContent = function () {
	document.activeElement.blur(); //make sure keyboard is closed

	if (this.characterDisplay) { this.characterDisplay.release(); }
	this.characterDisplay = null;

	this.windowBody.clearContent();
	this.centeredContent.clearContent();

	this._reset();
};

CharacterCreationWindow.prototype._initialize = function (params) {
	if (!this.allBreeds) {
		var self = this;
		this._createAll(function (error) {
			if (error) {
				return console.error('characterCreation: initialize error', error);
			}
			self._initialize(params);
			self._loadHeadImages();
		});
		return;
	}

	this.relookingParams = params && params.relookingParams;
	if (this.relookingParams) {
		this._initCharacterForRelooking();
	} else {
		this._initRandomCharacter();
	}
	this.delClassNames(['disabled', 'spinner']);
};

CharacterCreationWindow.prototype._initRandomCharacter = function () {
	this._stepLayoutSetup(STEP_RACE);

	this.nameInput.setValue('');

	// Pick gender randomly
	this.sex = Math.random() > 0.45 ? SEX_FEMALE : SEX_MALE;
	this.breedSexTabs.openTab(this.sex);
	this.headSexTabs.openTab(this.sex);

	// Pick one of the easy breeds
	var randomEasyBreed = Math.floor(Math.random() * this.numEasyBreeds);
	var count = 0, breedId;
	for (breedId = 1; breedId <= this.numBreeds; breedId++) {
		if (this.allBreeds[breedId].complexity > 1) { continue; }
		if (count === randomEasyBreed) { break; }
		count++;
	}

	// Pick one of the NUM_HEADS faces
	var randomHeadOrder = Math.floor(Math.random() * NUM_HEADS);

	this._selectBreed(breedId, randomHeadOrder);
};

function getHeadOrderFromSkin(headMap, headSkin) {
	for (var h in headMap) {
		var head = headMap[h];
		if (~~head.skins === headSkin) {
			return head.order;
		}
	}
	return 0;
}

CharacterCreationWindow.prototype._initCharacterForRelooking = function () {
	var params = this.relookingParams;
	var msg, title;
	if (params.canRename) {
		msg = getText('ui.connection.rename');
		title = getText('ui.charcrea.titleRename');
	} else if (params.canRecolor) {
		msg = getText('ui.connection.recolor');
		title = getText('ui.charcrea.titleRecolor');
	} else if (params.canReface) {
		msg = getText('ui.connection.relook');
		title = getText('ui.charcrea.titleRelook');
	}
	if (msg) {
		window.gui.openSimplePopup(msg, getText('ui.popup.warning'));
		this.pageTitle.setText(title);
	}

	var character = params.characterToRelook;
	var look = Entity.getLookWithoutMount(character.entityLook);
	var headOrder = getHeadOrderFromSkin(this.headsMap, look.skins[1]);

	this.nameInput.setValue(character.name);
	this.sex = character.sex ? SEX_FEMALE : SEX_MALE;
	this.headSexTabs.openTab(this.sex);

	this._stepLayoutSetup(STEP_PERSO);
	this._selectBreed(character.breed, headOrder, look.indexedColors);
	if (this.relookingParams.canRecolor) { this._selectColor(0); }
};

CharacterCreationWindow.prototype._createAll = function (cb) {
	this.allBreeds = window.gui.databases.Breeds;
	this.numBreeds = Object.keys(this.allBreeds).length;
	this.numEasyBreeds = 0;
	for (var breedId = 1; breedId <= this.numBreeds; breedId++) {
		var complexity = breedComplexity[breedId - 1];
		this.allBreeds[breedId].complexity = complexity;
		if (complexity === 1) { this.numEasyBreeds++; }
	}

	// Left, center and right columns

	this._leftSideSetup();
	this._centerSetup();
	this._rightSideSetup();

	this._createBreedElements();
	this._createHeadElements();

	this._createNavButtons();

	// Show & hide proper elements (do it as early as possible before they start loading content)
	this._stepLayoutSetup(STEP_RACE);

	this._listenersSetup();

	this._loadAsyncData(cb);
};

CharacterCreationWindow.prototype._leftSideSetup = function () {
	this.breedIllustration = this.windowBody.createChild('div', { className: 'breedIllustration' });
	this.breedIllustrationFade = this.windowBody.createChild('div', { className: 'breedIllustration' });
};

CharacterCreationWindow.prototype._centerSetup = function () {
	if (!this.centeredContent) { this.centeredContent = this.createChild('div'); }
	var centeredContent = this.centeredContent;
	this._createTopLabel(centeredContent);
	this._createNameSelector(centeredContent);
	this.breedSelector = this._createSelector(centeredContent, 'breedSexTabs');
	this.headSelector = this._createSelector(centeredContent, 'headSexTabs', /*hidden=*/true);
	this._createBreedDescription(centeredContent);
	this._setupColorTool(centeredContent);
};

CharacterCreationWindow.prototype._rightSideSetup = function () {
	var rightBar = this.windowBody.createChild('div', { className: 'rightBar' });

	this._setupCharacterOnIsland(rightBar);
};

CharacterCreationWindow.prototype._spreadVerticaly = function (elements, values) {
	var usedHeight = 0;
	for (var i = 0; i < elements.length; i++) {
		usedHeight += elements[i].rootElement.clientHeight;
	}
	var spaceLeft = this.windowBody.rootElement.clientHeight - usedHeight;
	for (i = 0; i < elements.length; i++) {
		var margin = Math.round(spaceLeft * values[i] / 100);
		elements[i].setStyle('marginBottom', Math.max(margin, MIN_VERTICAL_MARGIN) + 'px');
	}
};

CharacterCreationWindow.prototype._stepLayoutSetup = function (step) {
	this.step = step;

	var isPerso = step === STEP_PERSO;
	var isRace = step === STEP_RACE;

	this.breedIllustration.toggleDisplay(isRace || isPerso);
	this.characterOnIsland.toggleDisplay(isRace || isPerso);

	this.breedSexTabs.toggleDisplay(isRace);
	this.breedDescription.toggleDisplay(isRace);
	this.nextBtn.toggleDisplay(isRace);

	this.nameSelector.toggleDisplay(isPerso);
	this.createBtn.toggleDisplay(isPerso);
	this.headSexTabs.toggleDisplay(isPerso);
	this.colorTool.toggleDisplay(isPerso);

	if (isRace) {
		this._spreadVerticaly(
			[this.topLabel, this.breedSexTabs, this.breedDescription],
			[15, 15, 50]
		);
		this.backButton.setText(getText('ui.common.cancel'));
	} else if (isPerso) {
		this._spreadVerticaly(
			[this.topLabel, this.headSexTabs, this.nameSelector, this.colorTool],
			[5, 5, 5, 85]
		);
		this._selectCurrentHeads(); // makes sure we show at least the current heads
		if (this.relookingParams) {
			this._allowElement(this.headSexTabs, false);
			this._allowElement(this.nameSelector, this.relookingParams.canRename, NAME_CHANGE_POTION_ID);
			this._allowElement(this.colorTool, this.relookingParams.canRecolor, COLOR_CHANGE_POTION_ID);

			this.createBtn.setText(getText('ui.common.validation'));
			this.backButton.setText(getText('ui.common.cancel'));
		} else {
			this._selectColor(0, /*isReset=*/true);
			this.backButton.setText(getText('ui.common.back'));
		}
	}
};

function onDisabledFeatureTap() {
	// "this" is the transparent div covering an element
	var self = this, div = self; // style checker stops us from doing "div = this"
	itemManager.getItems([div.itemId], function (error, items) {
		if (error) { return console.error(error); }
		tooltip.showNotification(getText('tablet.charCrea.potionNeeded', items[0].getName()), div);
	});
}

CharacterCreationWindow.prototype._allowElement = function (element, isEnabled, itemId) {
	if (element.toggleTabAvailability) {
		// Special case of swiping tab element
		var isMale = this.sex === SEX_MALE;
		var tabButtons = element.header.getChildren();
		var sexChangeBtn = tabButtons[isMale ? SEX_FEMALE : SEX_MALE];
		var currentSexBtn = tabButtons[this.sex];
		var headChangeArea = element.content;

		this._allowElement(sexChangeBtn, false, SEX_CHANGE_POTION_ID);
		this._allowElement(currentSexBtn, this.relookingParams.canReface);
		this._allowElement(headChangeArea, this.relookingParams.canReface, FACE_CHANGE_POTION_ID);

		element.toggleTabAvailability(SEX_MALE, isMale);
		element.toggleTabAvailability(SEX_FEMALE, !isMale);
		return;
	}

	element.setStyle('opacity', isEnabled ? 1 : DISABLED_FEATURE_OPACITY);

	if (!isEnabled) {
		// Disable the element behavior by adding a transparent div on top of it
		var div = element.appendChild(new WuiDom('div', { className: 'disabledFeature' }));
		if (itemId) {
			div.itemId = itemId;
			tapBehavior(div);
			div.on('tap', onDisabledFeatureTap);
		}
	}
};

CharacterCreationWindow.prototype._next = function () {
	this._stepLayoutSetup(STEP_PERSO);
};

CharacterCreationWindow.prototype._back = function () {
	if (this.step === STEP_RACE || this.relookingParams) {
		windowsManager.close(this.id);
		characterSelection.backToSelection();
	} else {
		this._stepLayoutSetup(STEP_RACE);
	}
};

/** Creates a "selector" and a "sexTab" element - used for breed and head selection */
CharacterCreationWindow.prototype._createSelector = function (parent, tabsName, hidden) {
	var selector = {};
	selector.females = new WuiDom('div', { className: 'females' });
	selector.males = new WuiDom('div', { className: 'males' });

	var tabs = parent.appendChild(
		new SwipingTabs({ className: ['sexTabs', tabsName], tabClassName: 'mySwipeTabBtn' }));
	if (hidden) { tabs.hide(); }
	tabs.addTab('', selector.males, SEX_MALE);
	tabs.addTab('', selector.females, SEX_FEMALE);
	var self = this;
	tabs.on('openTab', function (tabId) {
		self._updateSex(tabId);
	});

	this[tabsName] = tabs;
	return selector;
};

function selectBreedBtnAction() {
	var theWindow = this.myWindow;
	if (theWindow.breedId === this.breedId) { return; } // already selected
	if (Date.now() - theWindow.lastRendering < BUTTON_HAMMER_DELAY) {
		return console.warn('Ignoring hammered button');
	}
	theWindow._selectBreed(this.breedId);
}

function selectHeadBtnAction() {
	this.myWindow._selectHead(this.headOrder, /*shouldRender=*/true);
}

CharacterCreationWindow.prototype._createBreedButton = function (breedData, gender) {
	var btn = new SelectionButton('breedSelectionButton', this, selectBreedBtnAction);
	btn.breedId = breedData.id;

	// Add the container to appropriate breed selector
	var selector = gender === SEX_MALE ? this.breedSelector.males : this.breedSelector.females;
	selector = selector.getChild(breedData.complexity);
	selector.appendChild(btn);

	return btn;
};

CharacterCreationWindow.prototype._createHeadContainer = function (breedId, gender) {
	var container = new WuiDom('div', { className: 'headContainer', hidden: true });
	var cosmeticIdBase = 1 + (breedId - 1) * NUM_HEADS * 2 + gender * NUM_HEADS;
	container.buttons = [];
	for (var order = 0; order < NUM_HEADS; order++) {
		var btn = new SelectionButton('headSelectionButton', this, selectHeadBtnAction);
		container.appendChild(btn);
		container.buttons.push(btn);
		btn.headOrder = order;
		btn.cosmeticId = cosmeticIdBase + order;
		btn.gender = gender;
	}
	// Add the container to appropriate head selector
	var selector = gender === SEX_MALE ? this.headSelector.males : this.headSelector.females;
	selector.appendChild(container);

	return container;
};

// NB: breed selector must exist before this is called
CharacterCreationWindow.prototype._createBreedElements = function () {
	for (var complexity = 1; complexity <= 3; complexity++) {
		this.breedSelector.males.createChild('div', { className: 'complexityLevel', name: complexity });
		this.breedSelector.females.createChild('div', { className: 'complexityLevel', name: complexity });
	}
	for (var i = 0; i < this.numBreeds; i++) {
		var breedId = i + 1;
		var breedData = this.allBreeds[breedId];
		this.breedBtns[i] = this._createBreedButton(breedData, SEX_MALE);
		this.breedBtns[i + this.numBreeds] = this._createBreedButton(breedData, SEX_FEMALE);
	}
};

// NB: head selector must exist before this is called
CharacterCreationWindow.prototype._createHeadElements = function () {
	for (var breedId = 1; breedId <= this.numBreeds; breedId++) {
		this.headContainers[breedId] = [
			this._createHeadContainer(breedId, SEX_MALE),
			this._createHeadContainer(breedId, SEX_FEMALE)
		];
	}
};

CharacterCreationWindow.prototype._loadAsyncData = function (cb) {
	// Head static data - we cannot create UI elements without this (but we don't load head images yet!)
	var self = this;
	staticContent.getAllDataMap('Heads', function (error, headsMap) {
		if (error) { return cb(error); }

		self.headsMap = headsMap;

		// Preload breed images (the 1st UI would look terrible without these 30 small images)
		var images = [];
		for (var i = 1; i <= self.numBreeds; i++) {
			var breedBtnId = ('0' + i).slice(-2); // e.g. 01..15

			images.push('gfx/classes/CreaPerso_btn_0' + breedBtnId + '.png');
			images.push('gfx/classes/CreaPerso_btn_1' + breedBtnId + '.png');
		}

		assetPreloading.preloadImages(images, function (imageUrls) {
			for (var i = 0; i < self.numBreeds; i++) {
				var btn = self.breedBtns[i];
				btn.setStyles({ backgroundImage: imageUrls[i * 2 + SEX_MALE] });

				btn = self.breedBtns[i + self.numBreeds];
				btn.setStyles({ backgroundImage: imageUrls[i * 2 + SEX_FEMALE] });
			}
			cb();
		});
	});
};

// Populate cosmetic (heads) button's data - if breedId is not given we preload them all
CharacterCreationWindow.prototype._loadHeadImages = function (breedId, cb) {
	if (this.loadedHeads[breedId]) { return cb && cb(); }

	// heads: push cosmetic images path
	var firstHead, lastHead;
	if (breedId) {
		firstHead = 1 + (breedId - 1) * NUM_HEADS * 2;
		lastHead = firstHead + NUM_HEADS * 2 - 1;
		this.loadedHeads[breedId] = true;
	} else {
		firstHead = 1;
		lastHead = this.numBreeds * NUM_HEADS * 2;
	}

	var headsMap = this.headsMap;
	var images = [];
	for (var i = firstHead; i <= lastHead; i++) {
		images.push('gfx/cosmetics/' + headsMap[~~i].assetId + '.png');
	}

	var self = this;
	assetPreloading.preloadImages(images, function (imageUrls) {
		if (!breedId) {
			for (var b = 1; b <= self.numBreeds; b++) {
				self.loadedHeads[b] = true;
			}
		}
		var imgNdx = 0;
		for (var i = firstHead; i <= lastHead; i++) {
			var head = headsMap[~~i];
			var btn = self.headContainers[head.breed][head.gender].buttons[head.order];
			btn.setStyle('backgroundImage', imageUrls[imgNdx++]);
		}
		if (cb) { cb(); }
	});
};

CharacterCreationWindow.prototype._listenersSetup = function () {
	var self = this;

	window.gui.on('CharacterCreationResultMessage', function (msg) {
		if (msg.result === CharacterCreationResultEnum.OK) {
			//confirm the creation was completed (NB: server will now send us a CharactersListMessage)
			characterSelection.confirmNewCharacterCreation();
			return windowsManager.close(self.id);
		}
		var errMsg;
		switch (msg.result) {
		case CharacterCreationResultEnum.ERR_INVALID_NAME:
			errMsg = getText('ui.charcrea.nameRules'); // generic msg not used: ui.popup.charcrea.invalidName
			break;
		case CharacterCreationResultEnum.ERR_NAME_ALREADY_EXISTS:
			errMsg = getText('ui.popup.charcrea.nameAlreadyExist');
			break;
		case CharacterCreationResultEnum.ERR_TOO_MANY_CHARACTERS:
			errMsg = getText('ui.popup.charcrea.tooManyCharacters');
			break;
		case CharacterCreationResultEnum.ERR_NOT_ALLOWED:
			errMsg = getText('ui.popup.charcrea.notSubscriber');
			break;
		case CharacterCreationResultEnum.ERR_RESTRICED_ZONE:
			errMsg = getText('ui.charSel.deletionErrorUnsecureMode');
			break;
		default: //everything else is "no reason"
		//case 1: //ERR_NO_REASON
		//case 6: //ERR_NEW_PLAYER_NOT_ALLOWED not handled in Ankama's code
			errMsg = getText('ui.popup.charcrea.noReason');
		}
		tooltip.showNotification(errMsg, self.createBtn);
		self.delClassNames(['disabled', 'spinner']);
	});

	window.gui.on('CharacterNameSuggestionSuccessMessage', function (msg) {
		self.nameInput.setValue(msg.suggestion);
	});

	/*
	// TODO: waiting for translations of errors
	window.gui.on('CharacterNameSuggestionFailureMessage', function (msg) {
		window.gui.openSimplePopup(msg.reason);
	});
	*/
};

CharacterCreationWindow.prototype._buildColorsArray = function () {
	var colors = new Array(constants.CHARACTER_COLORS);
	for (var i = 0; i < constants.CHARACTER_COLORS; i++) {
		var col = this.colorButtons[i].getColor();
		colors[i] = colorHelper.getIndexedColor(i + 1, col.rgb[0], col.rgb[1], col.rgb[2]);
	}
	return colors;
};

/** Show head container matching the current breed */
CharacterCreationWindow.prototype._selectCurrentHeads = function () {
	if (!this.headSexTabs.isVisible()) { return; }

	for (var i = 1, len = this.numBreeds; i <= len; i++) {
		this.headContainers[i][SEX_MALE].hide();
		this.headContainers[i][SEX_FEMALE].hide();
	}

	this.headContainers[this.breedId][SEX_MALE].show();
	this.headContainers[this.breedId][SEX_FEMALE].show();
};

function parseLook(lookString) {
	var look = lookString.substring(1, lookString.length - 1).split('|');
	return {
		bone: look[0],
		skin: look[1],
		color: look[2],
		scale: look[3]
	};
}

CharacterCreationWindow.prototype._updateSprite = function (useSmoothing) {
	var breedData = this.allBreeds[this.breedId];

	// body skin
	var look = parseLook(breedData[(this.sex === SEX_FEMALE ? 'female' : 'male') + 'Look']);
	var bodySkin = look.skin;
	var scale = look.scale;

	var headSkin = this.headsMap[this.cosmeticId].skins;

	var colorsHash = this._buildColorsArray().join('#');

	if (this.spriteStatus.bodySkin === bodySkin &&
		this.spriteStatus.headSkin === headSkin &&
		this.spriteStatus.colorsHash === colorsHash &&
		this.spriteStatus.orientation === this.orientation &&
		this.spriteStatus.scale === scale) {
		return;
	}

	this.spriteStatus.bodySkin = bodySkin;
	this.spriteStatus.headSkin = headSkin;
	this.spriteStatus.colorsHash = colorsHash;
	this.spriteStatus.orientation = this.orientation;
	this.spriteStatus.scale = scale;

	this._drawCharacter(useSmoothing);
};

/**
 * Asset preloading with local cache of URL.
 * This does not keep anything else than a string so no need to clear _assetUrlCache ever.
 */
CharacterCreationWindow.prototype._getAsset = function (assetUrl, cb) {
	var self = this;
	if (this._assetUrlCache[assetUrl]) {
		return cb(this._assetUrlCache[assetUrl]);
	}
	assetPreloading.preloadImage(assetUrl, function (imagesUrl) {
		self._assetUrlCache[assetUrl] = imagesUrl;
		cb(imagesUrl);
	});
};

CharacterCreationWindow.prototype._updateBreedIllustration = function () {
	if (!this.breedIllustration.isVisible()) { return; }

	var illustration = 'gfx/illusUi/illus_classe/artwork_' + this.breedId + this.sex + '.png';
	if (illustration === this.currentIllustration) { return; }

	// now we are sure we need to update the illustration
	this.currentIllustration = illustration;

	var tmp = this.breedIllustration;
	this.breedIllustration = this.breedIllustrationFade;
	this.breedIllustrationFade = tmp;
	showProgressively(null, 500, null, this.breedIllustrationFade);

	this.breedIllustration.addClassNames('spinner');
	var self = this;
	this._getAsset(illustration, function (imageUrl) {
		if (!self.breedIllustration) {
			// the window is already closed
			return;
		}
		self.breedIllustration.setStyle('backgroundImage', imageUrl);
		self.breedIllustration.delClassNames('spinner');
		showProgressively(self.breedIllustration, 500);
	});
};

CharacterCreationWindow.prototype._updateBreedIsland = function () {
	var self = this;
	// change breed illustration
	this._getAsset('gfx/bases/base_' + this.breedId + '.png', function (imageUrl) {
		if (!self.characterDisplay) {
			// the window is already closed
			return;
		}
		// Position island so that center's tile is under character's feet (island assets are often different!)
		var tilePos = IslandTilePos[self.breedId];
		if (!tilePos) {
			console.warn('Missing center tile data for breed:', self.breedId);
			tilePos = DEFAULT_ISLAND_TILE_POS;
		}
		var charRect = self.characterDisplay.rootElement.getBoundingClientRect();
		var xFeet = 0.5 * charRect.width;
		var yFeet = CHARACTER_RENDERER_FEET_Y * charRect.height;

		self.islandImage.setStyles({
			backgroundImage: imageUrl,
			left: xFeet - tilePos[0] + 'px',
			top: self.characterDisplay.rootElement.offsetTop + yFeet - tilePos[1] + 'px'
		});
		showProgressively(self.islandImage);
		showProgressively(self.rotationLeft);
		showProgressively(self.rotationRight);
	});
};

CharacterCreationWindow.prototype._updateBreedDescription = function () {
	var breedData = this.allBreeds[this.breedId];

	this.breedName.setText(breedData.longNameId);

	this.breedStory.content.setText(breedData.gameplayDescriptionId);
	this.breedStory.refresh();
	this.breedStory.goToTop();

	this.breedComplexity.replaceClassNames(['level1', 'level2', 'level3'], ['level' + breedData.complexity]);
};

CharacterCreationWindow.prototype._toggleBreedBtn = function (breedId, on) {
	// we have 1 button for each gender, male & female
	this.breedBtns[breedId - 1].setSelected(on);
	this.breedBtns[breedId - 1 + this.numBreeds].setSelected(on);
};

CharacterCreationWindow.prototype._selectBreed = function (breedId, headOrder, colors) {
	// deselect old breed button and select new one
	this._toggleBreedBtn(this.breedId, false);
	this._toggleBreedBtn(breedId, true);

	this.breedId = breedId;

	this._updateBreedIllustration();

	// hide previous character now (avoids old character "in the air" in case of slow rendering)
	this.characterDisplay.setStyle('opacity', 0);
	this._updateBreedIsland();

	this._updateBreedDescription();

	this._selectCurrentHeads();
	this._loadHeadImages(breedId);
	this._selectHead(headOrder !== undefined ? headOrder : this.headOrder);

	if (!colors) {
		this._resetColors();
	} else {
		this._loadColors(colors);
	}
	this.orientation = INITAL_SPRITE_ORIENTATION;
	this._updateSprite(/*useSmoothing=*/true);
};

CharacterCreationWindow.prototype._updateSex = function (sex) {
	if (this.sex === sex) { return; }
	this.sex = sex;

	this._updateBreedIllustration();
	this._selectCurrentHeads();
	this._selectHead(this.headOrder); // keep same head order just in case player switches back sex later

	// we update the gender on the other selector too
	this.headSexTabs.openTab(sex);
	this.breedSexTabs.openTab(sex);

	this._resetColors(/*leaveCustom=*/true);
	this._updateSprite(/*useSmoothing=*/true);
};

// NB: Default is to NOT render, because we usually select a head while switching sex or race
CharacterCreationWindow.prototype._selectHead = function (headOrder, shouldRender) {
	var headBtn = this.headContainers[this.breedId][this.sex].buttons[headOrder];
	if (headBtn.cosmeticId === this.cosmeticId) { return; } // already selected

	this.cosmeticId = headBtn.cosmeticId;
	this.headOrder = headOrder;

	var buttons = this.headContainers[this.breedId][this.sex].buttons;
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].setSelected(buttons[i] === headBtn);
	}

	if (shouldRender) {
		this._updateSprite(/*useSmoothing=*/false);
	}
};


var HIGHLIGHT_FREQ = 100; // in ms
var HIGHLIGHT_DURATION = 500; // in ms
var HIGHLIGHT_COLORS = [[255, 144, 0], [255, 228, 0]];

var highlightNum = 0;
var highlightStart = 0;
var highlightSavedColor, highlightSavedCustomFlag;
var highlightBtn = null;
var highlightTimer = null;

function stopHighlight() {
	window.clearInterval(highlightTimer);
	highlightTimer = null;

	highlightBtn.setColor(highlightSavedColor, /*isCustom=*/highlightSavedCustomFlag);
	highlightBtn.myWindow._updateSprite();
}

function highlightColor(btn) {
	if (btn) {
		// Starting a new highlight period
		if (highlightTimer) { stopHighlight(); }
		highlightBtn = btn;
		highlightSavedColor = btn.getColor();
		highlightSavedCustomFlag = btn.isCustomColor();
		highlightNum = 0;
		highlightStart = Date.now();
		highlightTimer = window.setInterval(highlightColor, HIGHLIGHT_FREQ);
	}

	var newRgb = HIGHLIGHT_COLORS[highlightNum % HIGHLIGHT_COLORS.length];
	var color = { rgb: newRgb, hex: colorHelper.colorArrayToHexa(newRgb) };

	highlightBtn.setColor(color);
	highlightBtn.myWindow._updateSprite();

	highlightNum++;
	if (Date.now() - highlightStart >= HIGHLIGHT_DURATION) { stopHighlight(); }
}

function colorBtnAction() {
	var self = this.myWindow;

	// change the currently selected button
	self._selectColor(this.id);

	highlightColor(self.selectedColorBtn);
}

CharacterCreationWindow.prototype._setupColorTool = function (parent) {
	var colorTool = this.colorTool = parent.createChild('div', { className: 'colorTool', hidden: true });
	colorTool.setStyle('opacity', 0);
	colorTool.show();

	var colorSelector = this.colorSelector = colorTool.createChild('div', { className: 'colorSelector' });

	// color buttons

	var div = colorSelector.createChild('div', { className: 'colorButtons' });
	var colorButtonsContainer = div.createChild('div', { className: 'buttonBox' });
	this.colorButtons = new Array(constants.CHARACTER_COLORS + 1);
	for (var i = 0; i <= constants.CHARACTER_COLORS; i++) {
		this.colorButtons[i] = colorButtonsContainer.appendChild(
			new PlusColorButton(this, i, colorBtnAction, { active: i < constants.CHARACTER_COLORS }));
	}
	this.selectedColorBtn = null;

	// color picker

	var picker = colorSelector.createChild('div', { className: 'picker' });
	var pickerRect = this.pickerRect = picker.rootElement.getBoundingClientRect();

	this.colorPicker = picker.appendChild(new ColorPicker());
	this.colorPicker.updateDimensions(pickerRect.width, pickerRect.height);

	// when we are done resizing the color picker we can hide again
	colorTool.hide();
	colorTool.setStyle('opacity', 1);

	var self = this;
	this.colorPicker.on('newColor', function (col) {
		if (!self.selectedColorBtn) { return; }

		self.selectedColorBtn.setColor(col, /*isCustom=*/true);

		var now = Date.now();
		if (!self.colorPicker.lastUpdate || (now - self.colorPicker.lastUpdate) > SPRITE_COLOR_UPDATE_INTERVAL) {
			self.colorPicker.lastUpdate = now;
			self._updateSprite();
		}
	});

	// NB: we always receive a 'colorChanged' after 1 or more newColor events.
	this.colorPicker.on('colorChanged', function (col) {
		if (!self.selectedColorBtn) { return; }
		self.selectedColorBtn.setColor(col, /*isCustom=*/true);
		self._updateSprite();
	});

	// reset a color, reset all, and randomize buttons

	var colorPickerFooter = this.colorPickerFooter = colorTool.createChild('div', { className: 'colorPickerFooter' });

	colorPickerFooter.appendChild(
		new BlackButton('resetColorBtn', '', getText('tablet.charCrea.resetCurrentColor'),
		function () {
			if (!self.selectedColorBtn || !self.selectedColorBtn.getColor()) {
				return tooltip.showNotification(getText('tablet.charCrea.resetCurrentColor'), this);
			}
			self._resetColorButton(self.selectedColorBtn);
			self._selectColor(self.selectedColorBtn.id, /*isReset=*/true);
			self._updateSprite();
		}, /*hasIcon=*/true));

	colorPickerFooter.appendChild(
		new BlackButton('randomColorBtn', getText('tablet.charCrea.randomColors'),
			getText('tablet.charCrea.randomColorsTip'),
		function () {
			for (var i = 0; i < constants.CHARACTER_COLORS; i++) {
				self.colorButtons[i].randomize();
			}
			self._selectColor(0, /*isReset=*/true);
			self._updateSprite();
		}, /*hasIcon=*/true));

	colorPickerFooter.appendChild(
		new BlackButton('resetAllColorBtn', getText('tablet.charCrea.resetAll'),
			getText('tablet.charCrea.resetAllTip'),
		function () {
			self._resetColors();
			self._updateSprite();
		}));
};

CharacterCreationWindow.prototype._createTopLabel = function (parent) {
	var topLabel = this.topLabel = parent.createChild('div', { className: 'topLabel' });
	topLabel.createChild('div', { className: 'topLabelBackground' });
	topLabel.createChild('div', { className: 'fioritureRococo' });
	this.pageTitle = topLabel.createChild('div', { className: 'topLabelText', text: getText('ui.charcrea.title') });
};

CharacterCreationWindow.prototype._createBreedDescription = function (parent) {
	// breed name and description
	this.breedDescription = parent.createChild('div', { className: 'breedDescription' });
	var zone = this.breedDescription.createChild('div', { className: 'descriptionZone' });
	var text = zone.createChild('div', { className: 'descriptionText' });
	this.breedName = text.createChild('div', { className: 'breedName', text: '.' });
	this.breedName.setText('');
	this.breedStory = text.appendChild(
		new Scroller({ className: 'breedStory' }, { showHintArrows: true }));

	var footer = text.createChild('div', { className: 'footer' });
	var complexity = this.breedComplexity = footer.createChild('div', { className: 'breedComplexity' });
	complexity.createChild('div', { className: 'label',
		text: getText('tablet.charCrea.difficulty') + getText('ui.common.colon') });
	complexity.createChild('div', { className: ['sword', 'sword1'] });
	complexity.createChild('div', { className: ['sword', 'sword2'] });
	complexity.createChild('div', { className: ['sword', 'sword3'] });
	var self = this;
	this.moreInfoBtn = footer.appendChild(new BlackButton('moreInfoBtn', getText('ui.charcrea.more'), '',
		function () {
			windowsManager.open('breedDetail', { breedData: self.allBreeds[self.breedId] });
		}));

	// compute scroller's max height
	var maxHeight = this.rootElement.clientHeight - this.breedDescription.rootElement.offsetTop -
		this.breedStory.rootElement.offsetTop * 2;
	this.breedStory.setStyle('maxHeight', maxHeight + 'px');
};

CharacterCreationWindow.prototype._createNameSelector = function (parent) {
	var nameSelector = this.nameSelector = parent.createChild('div', { className: 'nameSelector', hidden: true });
	this.nameInput = nameSelector.appendChild(new InputBox({
		className: 'nameInput',
		attr: {
			type: 'text',
			id: 'nameInput',
			maxlength: protocolConstants.MAX_PLAYER_NAME_LEN
		}
	}, function (elm) {
		elm.blur();
	}));
	this.nameInput.setPlaceholder(getText('ui.popup.charcrea.noName'));

	nameSelector.appendChild(new BlackButton('randomiseBtn', '',  getText('tablet.charCrea.randomNameTip'),
		function () {
			window.dofus.sendMessage('CharacterNameSuggestionRequestMessage');
		}, /*hasIcon=*/true));
};

CharacterCreationWindow.prototype._createRotationButton = function (className, isClockwise) {
	var self = this;
	var parent = this.characterOnIsland.createChild('div', { className: className, hidden: true });
	var btn = parent.appendChild(new Button({ className: 'shadow', repeatDelay: 100 }, function () {
		self.orientation = self.characterDisplay.rotateCharacter(isClockwise);
	}));
	btn.createChild('div', { className: 'arrow' });
	return parent;
};

CharacterCreationWindow.prototype._setupCharacterOnIsland = function (parent) {
	var characterOnIsland = this.characterOnIsland = parent.createChild('div', { className: 'characterOnIsland' });

	this.islandImage = characterOnIsland.createChild('div', { className: 'islandImage' });

	this.characterDisplay = characterOnIsland.appendChild(new CharacterDisplay({ scale: 2 }));

	this.rotationRight = this._createRotationButton('rotationRight', true);
	this.rotationLeft = this._createRotationButton('rotationLeft', false);
};

CharacterCreationWindow.prototype._createNavButtons = function () {
	var self = this;

	this.backButton = this.windowBody.appendChild(
		new BlackButton('cancelBtn', '', '', function () { self._back(); }));

	this.nextBtn = this.characterOnIsland.appendChild(
		new Button({ text: getText('tablet.charCrea.next'), className: ['greenButton', 'nextBtn'] }, function () {
			self._next();
		}));

	this.createBtn = this.characterOnIsland.appendChild(
		new Button({ text: getText('ui.charcrea.create'), className: ['greenButton', 'createButton'] }, function () {
			self._createCharacter();
		}));
};

CharacterCreationWindow.prototype._createCharacter = function () {
	var name = this.nameInput.getValue(), len = name.length;
	if (len === 0) {
		return tooltip.showNotification(getText('ui.popup.charcrea.noName'), this.createBtn);
	}
	if (len < protocolConstants.MIN_PLAYER_NAME_LEN || len > protocolConstants.MAX_PLAYER_NAME_LEN) {
		// generic msg not used: ui.popup.charcrea.invalidName
		return tooltip.showNotification(getText('ui.charcrea.nameRules'), this.createBtn);
	}

	var characterData = {
		name: name,
		breed: this.breedId,
		sex: this.sex === SEX_FEMALE ? true : false,
		colors: this._buildColorsArray(),
		cosmeticId: this.cosmeticId
	};

	if (this.relookingParams) {
		characterData.headSkin = this.spriteStatus.headSkin;
		characterSelection.confirmCharacterRelooking(characterData);
	} else {
		this.addClassNames(['disabled', 'spinner']);
		document.activeElement.blur(); //close keyboard now - in case a popup window appears with error message
		window.dofus.sendMessage('CharacterCreationRequestMessage', characterData);
	}
};

CharacterCreationWindow.prototype._buildEntityLook = function () {
	return {
		bonesId: 1,
		indexedColors: this._buildColorsArray(),
		scales: [this.spriteStatus.scale],
		skins: [this.spriteStatus.bodySkin, this.spriteStatus.headSkin],
		subentities: []
	};
};

CharacterCreationWindow.prototype._drawCharacter = function (useSmoothing) {
	this.lastRendering = Date.now();
	var self = this;
	this.characterDisplay.setLook(this._buildEntityLook(), {
		boneType: 'characters/',
		skinType: 'characters/',
		direction: this.orientation
	}, function () {
		if (useSmoothing) { showProgressively(self.characterDisplay, 300, 50); }
	});
};

/** Selects the current color (index 0 is first color button) and shows it inside picker */
CharacterCreationWindow.prototype._selectColor = function (index, isReset) {
	var btn = this.colorButtons[index];
	if (btn === this.selectedColorBtn && !isReset) { return; }

	if (this.selectedColorBtn) { this.selectedColorBtn.deselect(); }
	this.selectedColorBtn = btn;
	btn.select();

	this.colorPicker.setCurrentColor(btn.getColor().rgb);
};

function setColorButton(btn, rawColor) {
	var rgb = colorHelper.parseIndexedColor(rawColor).color;
	var color = [rgb.r, rgb.g, rgb.b];
	btn.setColor({ rgb: color, hex: colorHelper.colorArrayToHexa(color) });
}

CharacterCreationWindow.prototype._resetColorButton = function (btn) {
	var genreIndex = (this.sex === SEX_FEMALE ? 'female' : 'male') + 'Colors';
	var rawColor = this.allBreeds[this.breedId][genreIndex][btn.id];
	setColorButton(btn, rawColor);
};

/**
 * Resets default colors for this breed + sex
 * @param {boolean} leaveCustom - give true if custom colors should be left unchanged
 */
CharacterCreationWindow.prototype._resetColors = function (leaveCustom) {
	for (var i = 0; i < constants.CHARACTER_COLORS; i++) {
		var btn = this.colorButtons[i];
		if (leaveCustom && btn.isCustomColor()) { continue; }
		this._resetColorButton(btn);
	}
	this._selectColor(0, /*isReset=*/true);
};

CharacterCreationWindow.prototype._loadColors = function (indexedColors) {
	for (var i = 0; i < constants.CHARACTER_COLORS; i++) {
		setColorButton(this.colorButtons[i], indexedColors[i]);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CharacterCreationWindow/index.js
 ** module id = 905
 ** module chunks = 0
 **/