require('./styles.less');
var Button = require('Button');
var WuiDom = require('wuidom');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var channelsEnum = require('ChatActivableChannelsEnum');
var tweener = require('tweener');
var getElementPositionCenteredAt = require('positionHelper').getElementPositionCenteredAt;
var dimensions = require('dimensionsHelper').dimensions;
var pingSmileysEnum = require('PingSmileysEnum');
var assetPreloading = require('assetPreloading');
var tapBehavior = require('tapBehavior');

/**
 * Appear in the ping mode during the fight to select the quick action you want to send
 * @constructor
 */
function PingBox() {
	WuiDom.call(this, 'div', {
		className: 'PingBox',
		hidden: true
	});

	var self = this;
	var gui = window.gui;

	var TAP_CELL_HL_ID = 'pingBoxShowBoxId';
	var PING_CELL_COLOR = gui.pingSystem.PING_CELL_COLOR;

	// the ping message is just send to the allies
	this._MESSAGE_CHANNEL = channelsEnum.CHANNEL_TEAM;

	this._position = {
		x: 0,
		y: 0
	};
	this._isOpen = false;
	this._cellId = -1;
	this._talks = [];
	this._actions = [];

	var tabPanel = this.createChild('div', { className: 'tabPanel' });
	var containers = this.createChild('div', { className: 'containers' });

	// ping talk button

	tabPanel.appendChild(new Button({
		className: ['pingTalk', 'tab'],
		scaleOnPress: true
	}, function () {
		actionContainer.hide();
		sentenceContainer.hide();

		// if not in the top put the talk container on the top

		if (containers.getChildren()[0] !== talkContainer) {
			containers.insertAsFirstChild(talkContainer);
		}
		talkContainer.show();

		// reposition the box

		self.reposition();
	}));

	tabPanel.appendChild(new Button({
		className: ['pingSentence', 'tab'],
		scaleOnPress: true
	}, function () {
		talkContainer.hide();
		actionContainer.hide();

		// if not in the top put the talk container on the top

		if (containers.getChildren()[0] !== sentenceContainer) {
			containers.insertAsFirstChild(sentenceContainer);
		}
		sentenceContainer.show();

		// reposition the box

		self.reposition();
	}));

	// ping action button

	tabPanel.appendChild(new Button({
		className: ['pingAction', 'tab'],
		scaleOnPress: true
	}, function () {
		talkContainer.hide();
		sentenceContainer.hide();

		// if not in the top put the action container on the top

		if (containers.getChildren()[0] !== actionContainer) {
			containers.insertAsFirstChild(actionContainer);
		}
		actionContainer.show();

		// reposition the box

		self.reposition();
	}));

	var talkContainer = this._talkContainer = containers.createChild('div', {
		className: ['container', 'talkContainer']
	});
	var sentenceContainer = this._sentenceContainer = containers.createChild('div', {
		className: ['container', 'sentenceContainer']
	});
	var actionContainer = this._actionContainer = containers.createChild('div', {
		className: ['container', 'actionContainer']
	});

	talkContainer.hide();
	actionContainer.hide();
	sentenceContainer.hide();

	// filtering functions

	/**
	 * @param {WuiDom} wdom
	 */
	function alwaysShow(wdom) {
		wdom.toggleDisplay(true);
	}

	/**
	 * @param {WuiDom} wdom
	 * @param {object} filters
	 * @param {boolean=} filters.isEmptyCell
	 */
	function showOnEmptyCell(wdom, filters) {
		wdom.toggleDisplay(filters.isEmptyCell);
	}

	/**
	 * @param {WuiDom} wdom
	 * @param {object} filters
	 * @param {boolean=} filters.isEmptyCell
	 */
	function showOnOccupiedCell(wdom, filters) {
		wdom.toggleDisplay(!filters.isEmptyCell);
	}

	// add all the smileys

	this._addSmileys();

	// add all talk sentences

	this._addSentence(getText('tablet.pingsystem.hello'),      pingSmileysEnum.hello,      alwaysShow);
	this._addSentence(getText('tablet.pingsystem.thx'),        pingSmileysEnum.thx,        alwaysShow);
	this._addSentence(getText('tablet.pingsystem.great'),      pingSmileysEnum.great,      alwaysShow);
	this._addSentence(getText('tablet.pingsystem.goodJob'),    pingSmileysEnum.goodJob,    alwaysShow);
	this._addSentence(getText('tablet.pingsystem.yes'),        pingSmileysEnum.yes,        alwaysShow);
	this._addSentence(getText('tablet.pingsystem.no'),         pingSmileysEnum.no,         alwaysShow);
	this._addSentence(getText('tablet.pingsystem.ready'),      pingSmileysEnum.ready,      alwaysShow);
	this._addSentence(getText('tablet.pingsystem.tooFar'),     pingSmileysEnum.tooFar,     alwaysShow);
	this._addSentence(getText('tablet.pingsystem.outSight'),   pingSmileysEnum.outSight,   alwaysShow);
	this._addSentence(getText('tablet.pingsystem.comeCloser'), pingSmileysEnum.comeCloser, alwaysShow);
	this._addSentence(getText('tablet.pingsystem.retreat'),    pingSmileysEnum.retreat,    alwaysShow);
	this._addSentence(getText('tablet.pingsystem.challenge'),  pingSmileysEnum.lightBulb,  alwaysShow);

	// add all the actions

	// empty cell
	this._addAction(getText('tablet.pingsystem.mp'),      'mp',      showOnEmptyCell);
	this._addAction(getText('tablet.pingsystem.warning'), 'warning', showOnEmptyCell);
	this._addAction(getText('tablet.pingsystem.stop'),    'stop',    showOnEmptyCell);

	// cell with monster or ally on it
	this._addAction(getText('tablet.pingsystem.attack'), 'attack', showOnOccupiedCell);
	this._addAction(getText('tablet.pingsystem.move'),   'move',   showOnOccupiedCell);
	this._addAction(getText('tablet.pingsystem.heal'),   'heal',   showOnOccupiedCell);
	this._addAction(getText('tablet.pingsystem.boost'),  'boost',  showOnOccupiedCell);
	this._addAction(getText('tablet.pingsystem.tackle'), 'tackle', showOnOccupiedCell);
	this._addAction(getText('tablet.pingsystem.valid'),  'valid',  showOnOccupiedCell);

	this.on('show', function () {
		window.isoEngine.mapRenderer.addCellHighlight(TAP_CELL_HL_ID, [this._cellId], PING_CELL_COLOR);
	});

	this.on('hide', function () {
		window.isoEngine.mapRenderer.deleteCellHighlight(TAP_CELL_HL_ID);
	});

	gui.on('disconnect', function () {
		self.close();
	});
}

inherits(PingBox, WuiDom);
module.exports = PingBox;

PingBox.prototype._addSmileys = function () {
	var self = this;
	self._talkContainer.addClassNames('spinner');

	var smileysList = window.gui.databases.Smileys;
	var smileyIds = Object.keys(smileysList);
	var images = [];
	for (var i = 0; i < smileyIds.length; i++) {
		images.push('gfx/smilies/' + smileysList[smileyIds[i]].gfxId + '.png');
	}

	function addSmileyIcon(data, url) {
		var icon = new WuiDom('div', { name: data.id, className: ['chatIcon', 'smileyIcon'] });
		icon.id = data.id;
		icon.setStyle('backgroundImage', url);

		function smileyTapped() {
			window.dofus.sendMessage('ChatSmileyRequestMessage', { smileyId: icon.id });
			self.emit('actionSent');
			self._talkContainer.hide();
		}

		tapBehavior(icon);
		icon.on('tap', smileyTapped);
		self._talkContainer.appendChild(icon);
	}

	assetPreloading.preloadImages(images, function (urls) {
		for (var i = 0; i < urls.length; i++) {
			addSmileyIcon(smileysList[smileyIds[i]], urls[i]);
		}
		self._talkContainer.delClassNames('spinner');
	});
};

/**
 * Add an entry to the sentence category menu.
 * The purpose is:
 *  - Send predefined sentences during the fight in the chat
 *  - Play a smiley on the top of the character
 *
 * @param {String} text - Text will send to the chat
 * @param {number} smileyId
 * @param {function} displayFn - function that hide/show
 * @param {String=} label - Label of the action (if empty, take the text)
 * @private
 */
PingBox.prototype._addSentence = function (text, smileyId, displayFn, label) {
	label = label || text;
	var self = this;

	// need the database to have the asset name
	var smileyData = window.gui.databases.Smileys[smileyId];
	if (!smileyData) {
		smileyData = {};
		console.warn('PingBox: Smiley ' + smileyId + ' details are not available, it could not be displayed');
	}

	var sentenceAction = this._sentenceContainer.createChild('div', { className: 'pingRow' });

	// add tap behavior on the sentenceAction

	tapBehavior(sentenceAction, null);
	sentenceAction.on('tap', function () {
		window.dofus.sendMessage('ChatSmileyRequestMessage', { smileyId: smileyId });
		window.gui.chat.sendChatMessage(text, self._MESSAGE_CHANNEL);
		self.emit('actionSent');
	});

	// add the smiley

	var smiley = sentenceAction.createChild('div', { className: 'smiley' });
	assetPreloading.preloadImage('gfx/smilies/' + smileyData.gfxId + '.png', function (url) {
		smiley.setStyle('backgroundImage', url);
	});

	// label

	sentenceAction.createChild('div', {
		text: text,
		className: 'label'
	});

	sentenceAction.displayFn = displayFn;

	this._talks.push(sentenceAction);
};

/**
 *
 * @param {String} text - Text will send to the chat
 * @param {String} className
 * @param {function} displayFn - function that hide/show
 * @param {String=} label - Label of the action
 * @private
 */
PingBox.prototype._addAction = function (text, className, displayFn, label) {
	var self = this;
	label = label || text;

	var action = this._actionContainer.createChild('div', { className: 'pingRow' });

	// add tap behavior on the action

	tapBehavior(action, null);
	action.on('tap', function () {
		//TODO: add the name of the actor if possible
		// send to chat

		var hyperlink = '{pingsystem,' + self._cellId + ',' + className + '::[' + text + ']}';
		window.gui.chat.sendChatMessage(hyperlink, self._MESSAGE_CHANNEL);
		self.emit('actionSent');
	});

	// add the iconBox

	var iconBox = action.createChild('div', { className: 'iconBox' });
	/*var icon = */
	iconBox.createChild('div', { className: ['icon', className] });

	// label

	action.createChild('div', {
		text: text,
		className: 'label'
	});

	action.displayFn = displayFn;

	this._actions.push(action);
};

/**
 * Going through all talks and actions buttons and show/hide them
 * @param {object=} filters
 * @param {boolean=} filters.isEmptyCell
 * @private
 */
PingBox.prototype._filterActionsMenu = function (filters) {
	filters = filters || {};

	var i, len;
	var talks = this._talks;
	var actions = this._actions;

	for (i = 0, len = talks.length; i < len; i += 1) {
		var talkAction = talks[i];
		talkAction.displayFn(talkAction, filters);
	}

	for (i = 0, len = actions.length; i < len; i += 1) {
		var action = actions[i];
		action.displayFn(action, filters);
	}
};

/**
 * @return {boolean}
 */
PingBox.prototype.isOpen = function () {
	return this._isOpen;
};

/**
 * Make sure it's on the screen with an offset from the screen by 10 pixels
 */
PingBox.prototype.reposition = function () {
	//TODO: check if the box is bigger than the screen
	var OFFSET_FROM_SCREEN = 10;
	var element = this.rootElement.getBoundingClientRect();
	var xMin = element.left;
	var xMax = element.left + element.width;
	var yMin = element.top;
	var yMax = element.top + element.height;

	if (xMin < OFFSET_FROM_SCREEN) {
		xMin = OFFSET_FROM_SCREEN;
	}
	if (xMax > dimensions.screenWidth - OFFSET_FROM_SCREEN) {
		xMin = dimensions.screenWidth - OFFSET_FROM_SCREEN - element.width;
	}
	if (yMin < OFFSET_FROM_SCREEN) {
		yMin = OFFSET_FROM_SCREEN;
	}
	if (yMax > dimensions.screenHeight - OFFSET_FROM_SCREEN) {
		yMin = dimensions.screenHeight - OFFSET_FROM_SCREEN - element.height;
	}

	if (xMin !== element.left || yMin !== element.top) {
		tweener.tween(this,
			{ webkitTransform: 'scale(1) translate3d(' + Math.round(xMin) + 'px, ' + Math.round(yMin) + 'px, 0)' }, {
				time: 100,
				easing: 'linear'
			});
	}
};

/**
 * Open the ping box to specific coordinates given by x and y
 * @param {number} x
 * @param {number} y
 * @param {number} cellId
 * @param {boolean} isEmptyCell - does the cell have an actor or not
 */
PingBox.prototype.open = function (x, y, cellId, isEmptyCell) {
	var foreground = window.foreground;

	this._cellId = cellId;

	// close the confirm box if open

	foreground.confirmBox.close();

	// deselect spell

	foreground.deselectSpell();
	window.gui.shortcutBar.deselectIcon();

	// filtering

	this._filterActionsMenu({ isEmptyCell: isEmptyCell });

	this.show();
	var position = this._position = getElementPositionCenteredAt(this, x, y);
	if (!this._isOpen) {
		this.setStyles({
			webkitTransform: 'scale(0) translate3d(' + position.x + 'px, ' + position.y + 'px, 0)',
			webkitTransformOrigin: x + 'px ' + y + 'px'
		});
	} else {
		this.setStyles({
			webkitTransformOrigin: x + 'px ' + y + 'px'
		});
	}
	tweener.tween(this, { webkitTransform: 'scale(1) translate3d(' + position.x + 'px, ' + position.y + 'px, 0)' }, {
		time: 100,
		easing: 'linear'
	});
	this._isOpen = true;
};

/**
 * Close the ping box
 */
PingBox.prototype.close = function () {
	var self = this;
	var position = this._position;

	if (!this._isOpen) {
		return;
	}
	this._isOpen = false;
	this._cellId = -1;

	tweener.tween(this, { webkitTransform: 'scale(0) translate3d(' + position.x + 'px,' + position.y + 'px,0)' }, {
		time: 100,
		easing: 'linear'
	}, function () {
		self.hide();
		self._sentenceContainer.hide();
		self._actionContainer.hide();
		self._talkContainer.hide();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PingEmoteSystem/PingBox/index.js
 ** module id = 555
 ** module chunks = 0
 **/