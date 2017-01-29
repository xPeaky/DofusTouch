require('./styles.less');
var inherits = require('util').inherits;
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var Window = require('Window');
var windowsManager = require('windowsManager');
var assetPreloading = require('assetPreloading');


function EstateInformationWindow() {
	Window.call(this, {
		className: 'EstateInformationWindow',
		title: getText('ui.popup.information'),
		positionInfo: { top: 'c', left: 'c', width: 580, height: 355 }
	});

	var self = this;

	this.worldX = 0;
	this.worldY = 0;

	this.once('open', function () {
		self.setupDom();
	});

	this.on('open', function (moreInfoData) {
		// don't display anything if open the dialog manually
		if (!moreInfoData) {
			self.windowBody.hide();
			return;
		}

		self.windowBody.show();
		self.updateData(moreInfoData);
	});
}

inherits(EstateInformationWindow, Window);
module.exports = EstateInformationWindow;


EstateInformationWindow.prototype.setupDom = function () {
	var self = this;

	var container1 = this.windowBody.createChild('div', { className: ['container', 'container1'] });
	var imageContainer = container1.createChild('div', { className: 'imageContainer' });
	this.image = imageContainer.createChild('div', { className: 'image' });
	var houseDetails = container1.createChild('div', { className: 'houseDetails' });
	this.name = houseDetails.createChild('div', { className: 'name' });

	var priceContainer = houseDetails.createChild('div', { className: ['textContainer', 'price'] });
	priceContainer.createChild('div', { className: 'left', text: getText('ui.common.price') });
	this.price = priceContainer.createChild('div', { className: 'right' });

	houseDetails.createChild('div', { className: 'message', text: getText('ui.estate.visit') });

	this.roomsContainer = houseDetails.createChild('div', { className: ['textContainer', 'clear'] });
	this.roomsContainer.createChild('div', { className: 'left', text: getText('ui.estate.nbRoom') });
	this.roomCount = this.roomsContainer.createChild('div', { className: 'right' });

	this.chestContainer = houseDetails.createChild('div', { className: 'textContainer' });
	this.chestContainer.createChild('div', { className: 'left', text: getText('ui.estate.nbChest') });
	this.chestCount = this.chestContainer.createChild('div', { className: 'right' });

	this.mountsContainer = houseDetails.createChild('div', { className: ['textContainer', 'clear'] });
	this.mountsContainer.createChild('div', { className: 'left', text: getText('ui.estate.nbMount') });
	this.mountCount = this.mountsContainer.createChild('div', { className: 'right' });

	this.breedingContainer = houseDetails.createChild('div', { className: 'textContainer' });
	this.breedingContainer.createChild('div', { className: 'left', text: getText('ui.estate.nbMachine') });
	this.breedingCount = this.breedingContainer.createChild('div', { className: 'right' });

	this.skills = houseDetails.createChild('div', { className: 'message' });

	var container2 = this.windowBody.createChild('div', { className: ['container', 'container2'] });
	var locationContainer = container2.createChild('div', { className: 'textContainer' });
	locationContainer.createChild('div', { className: ['titleText', 'text'], text: getText('ui.common.localisation') });
	this.coordinate = locationContainer.createChild('div', { className: 'text' });
	var positionButton = locationContainer.appendChild(new Button('', { className: 'positionBtn' }));

	this.locationName = container2.createChild('div', { className: 'locationName' });

	var container3 = this.windowBody.createChild('div', { className: ['container', 'container3'] });
	var ownerContainer = container3.createChild('div', { className: 'textContainer' });
	ownerContainer.createChild('div', { className: ['titleText', 'text'], text: getText('ui.common.ownerWord') });
	this.ownerName = ownerContainer.createChild('div', { className: 'text' });
	this.ownerStatus = ownerContainer.createChild('div', { className: 'text' });
	this.chatButton = ownerContainer.appendChild(new Button('', { className: 'chatBtn' }));

	positionButton.on('tap', function () {
		if (isNaN(self.worldX) || isNaN(self.worldY)) {
			return;
		}
		window.gui.emit('CompassUpdateMessage', {
			type: -1,
			worldX: self.worldX,
			worldY: self.worldY
		});
		windowsManager.open('worldMap', { x: self.worldX, y: self.worldY });
	});

	this.chatButton.on('tap', function () {
		window.gui.chat.startPrivateMessage(self.ownerName.getText(), /*isAccountName=*/true);
	});
};


EstateInformationWindow.prototype.updateData = function (data) {
	var self = this;

	this.worldX = data.worldX;
	this.worldY = data.worldY;

	this.price.setText(data.price);
	this.coordinate.setText(data.worldX + ',' + data.worldY);
	this.ownerName.setText(data.ownerName === '?' ? getText('ui.common.none') : data.ownerName);

	if (data.ownerName !== '?' && data.hasOwnProperty('ownerConnected')) {
		var connectStatus = data.ownerConnected ? getText('ui.server.state.online') : getText('ui.server.state.offline');
		this.ownerStatus.setText(' (' + connectStatus + ')');
	} else {
		this.ownerStatus.setText('');
	}

	this.locationName.setText(data.areaName + ' ( ' + data.subAreaName + ' )');
	this.chatButton.toggleDisplay(data.ownerName !== '?' && data.ownerConnected);

	// the game currently uses one paddock image for all
	var paddockImage = 'gfx/illusUi/enclos_tx_illuEnclos.png';
	var image = data.type === 'house' ? 'gfx/houses/' + data.gfxId + '.png' : paddockImage;

	// reset the previous image
	this.image.setStyle('backgroundImage', 'none');

	assetPreloading.preloadImage(image, function (url) {
		self.image.setStyle('backgroundImage', url);
	});

	if (data.type === 'house') {
		this.mountsContainer.hide();
		this.breedingContainer.hide();
		this.roomsContainer.show();
		this.chestContainer.show();

		this.name.setText(data.name);
		this.roomCount.setText(data.rooms);
		this.chestCount.setText(data.chests);

		var skillText;
		if (data.skillsCount > 0) {
			skillText = getText('ui.estate.houseSkills', data.skillsCount);
		} else {
			skillText = getText('ui.estate.noSkill');
		}

		this.skills.setText(skillText);
		this.skills.show();

		return;
	}

	this.name.setText(getText('ui.common.mountPark'));

	this.skills.hide();
	this.roomsContainer.hide();
	this.chestContainer.hide();
	this.mountsContainer.show();
	this.breedingContainer.show();

	this.mountCount.setText(data.mounts);
	this.breedingCount.setText(data.objects);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/EstateInformationWindow/index.js
 ** module id = 722
 ** module chunks = 0
 **/