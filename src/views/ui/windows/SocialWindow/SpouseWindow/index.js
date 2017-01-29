require('./styles.less');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var WuiDom = require('wuidom');

var Button = require('Button');
var staticContent = require('staticContent');
var CharacterDisplay = require('CharacterDisplayWebGL');
var DirectionsEnum = require('DirectionsEnum');
var windowsManager = require('windowsManager');
var assetPreloading = require('assetPreloading');


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function SpouseWindow() {
	WuiDom.call(this, 'div', { className: 'SpouseWindow', name: 'spouse' });

	var self = this;

	window.gui.playerData.socialData.once('spouseUpdate', function (spouseData) {
		self._updateSocialWindowTitle(spouseData);
	});

	this.once('open', function () {
		self._setupDom();
		self._setupEvents();
	});

	this.on('open', function () {
		window.dofus.sendMessage('SpouseGetInformationsMessage');
	});
}


inherits(SpouseWindow, WuiDom);
module.exports = SpouseWindow;


SpouseWindow.prototype._setupDom = function () {
	var self = this;
	var col1 = this.createChild('div', { className: 'col1' });
	var col2 = this.createChild('div', { className: 'col2' });

	this.name = col1.createChild('div', { className: 'name' });

	var info = this.info = col1.createChild('div', { className: 'info' });

	var line = info.createChild('div', { className: 'line' });
	line.createChild('div', { className: 'title', text: getText('ui.charcrea.breed') + ':' });
	this.class = line.createChild('div', { className: 'value' });

	line = info.createChild('div', { className: 'line' });
	line.createChild('div', { className: 'title', text: getText('ui.common.averageLevel') + ':' });
	this.level = line.createChild('div', { className: 'value' });

	line = info.createChild('div', { className: 'line' });
	line.createChild('div', { className: 'title', text: getText('ui.common.alignment') + ':' });
	this.alignment = line.createChild('div', { className: 'value' });

	line = info.createChild('div', { className: ['line', 'guild'] });
	line.createChild('div', { className: 'title', text: getText('ui.common.guild') + ':' });
	this.guild = line.createChild('div', { className: 'value' });

	line = info.createChild('div', { className: 'line' });
	line.createChild('div', { className: 'title', text: getText('ui.common.state') + ':' });
	this.status = line.createChild('div', { className: 'value' });

	line = info.createChild('div', { className: 'line' });
	line.createChild('div', { className: 'title', text: getText('ui.common.localisation') + ':' });
	this.location = line.createChild('div', { className: 'value' });

	line = info.createChild('div', { className: 'line' });
	this.fightingIcon = line.createChild('div', { className: 'fightingIcon', hidden: true });

	var button = info.createChild('div', { className: 'buttons' });

	this.inviteButton = button.appendChild(new Button({
		text: getText('ui.party.addToParty'),
		className: 'button'
	}, function () {
		window.dofus.sendMessage('PartyInvitationRequestMessage', { name: self.name.getText() });
	}));

	this.followButton = button.appendChild(new Button({
		text: getText('ui.common.follow'),
		className: 'button'
	}, function () {
		window.dofus.sendMessage('FriendSpouseFollowWithCompassRequestMessage', { enable: true });
	}));

	this.stopFollowingButton = button.appendChild(new Button({
		text: getText('ui.common.stopFollow'),
		className: 'button',
		hidden: true
	}, function () {
		window.dofus.sendMessage('FriendSpouseFollowWithCompassRequestMessage', { enable: false });
	}));

	this.joinButton = button.appendChild(new Button({
		text: getText('ui.common.join'),
		className: 'button'
	}, function () {
		window.dofus.sendMessage('FriendSpouseJoinRequestMessage');
	}));

	var bird = col2.createChild('div', { className: ['image', 'bird'] });
	this.character = col2.appendChild(new CharacterDisplay({ scale: 3.5, verticalAlign: 'center' }));

	assetPreloading.preloadImage('gfx/illusUi/tofus_bague.png', function (imageUrl) {
		bird.setStyle('backgroundImage', imageUrl);
	});
};


SpouseWindow.prototype._setupEvents = function () {
	var self = this;

	window.gui.playerData.socialData.on('spouseUpdate', function (spouseData) {
		self._updateSocialWindowTitle(spouseData);
		self.updateDomData(spouseData);
	});

	window.gui.on('CompassUpdateMessage', function () {
		self.stopFollowingButton.show();
		self.followButton.hide();
	});

	window.gui.on('CompassResetMessage', function () {
		self.stopFollowingButton.hide();
		self.followButton.show();
	});
};


SpouseWindow.prototype.updateDomData = function (spouse) {
	var self = this;
	var guiDatabases = window.gui.databases;

	this.name.setText(spouse.spouseName);
	this.class.setText(guiDatabases.Breeds[spouse.breed].shortNameId);
	this.level.setText(spouse.spouseLevel);
	this.alignment.setText(guiDatabases.AlignmentSides[spouse.alignmentSide].nameId);

	var guildName = spouse.guildInfo ? spouse.guildInfo.guildName : '';
	this.guild.setText(guildName === '#NONAME#' ? getText('ui.guild.noName') : guildName);

	this.stopFollowingButton.toggleDisplay(!!spouse.followSpouse);
	this.followButton.toggleDisplay(!spouse.followSpouse);
	this.fightingIcon.toggleDisplay(!!spouse.inFight);

	self.character.setLook(spouse.spouseEntityLook, {
		direction: DirectionsEnum.DIRECTION_SOUTH_WEST,
		boneType: 'characters/',
		skinType: 'characters/',
		riderOnly: true
	});

	// if there is no subAreaId, spouse is offline
	if (!spouse.subAreaId) {
		this.status.setText(getText('ui.server.state.offline'));
		this.location.setText('-');

		this.inviteButton.disable();
		this.followButton.disable();
		this.stopFollowingButton.disable();
		this.joinButton.disable();
		return;
	}

	this.status.setText(getText('ui.server.state.online'));

	this.inviteButton.enable();
	this.followButton.enable();
	this.stopFollowingButton.enable();
	this.joinButton.enable();

	staticContent.getData('SubAreas', spouse.subAreaId, function (error, subAreaData) {
		if (error) {
			console.warn('Failed to retrieve subArea data', error);
		}

		self.location.setText(subAreaData.nameId);
	});
};

SpouseWindow.prototype._updateSocialWindowTitle = function (spouseData) {
	var socialWindow = windowsManager.getWindow('social');
	socialWindow.updateWindowTitle('spouse', getText('ui.common.spouse', spouseData.sex));
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/SpouseWindow/index.js
 ** module id = 882
 ** module chunks = 0
 **/