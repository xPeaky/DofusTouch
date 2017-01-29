require('./styles.less');
var inherits = require('util').inherits;
var ProgressBar = require('ProgressBar');
var Button = require('Button');
var WuiDom = require('wuidom');
var helper = require('helper');
var TooltipBox = require('TooltipBox');
var addTooltip = TooltipBox.addTooltip;
var enableTooltip = TooltipBox.enableTooltip;
var getText = require('getText').getText;
var itemManager = require('itemManager');
var CompassTypeEnum = require('CompassTypeEnum');
var hyperlink = require('hyperlink');
var staticContent = require('staticContent');
var assetPreloading = require('assetPreloading');
var windowsManager = require('windowsManager');
var userPref = require('UserPreferences');


//Various constants (also hardcoded in Flash code - not in protocol as of now)
var NUMBER_OF_DAYS = 365;
var DOLMANAX_QUEST_ID = 954;
var SANCTUARY_MAP_X = -4;
var SANCTUARY_MAP_Y = -24;
var ALMANAX_ITEM_ID = 13344;
var CALENDAR_SHEET_ITEM_ID = 13345;

/** @class */
function AlmanaxWindow() {
	WuiDom.call(this, 'div', {
		className: 'AlmanaxWindow',
		name:      'almanax'
	});

	this._calendarDate = -1;
	this.lastUpdate = 0;
	this.isRefreshPending = false;

	var connectionManager = window.dofus.connectionManager;
	var self = this;

	this.on('open', this._refreshIfNeeded);

	connectionManager.on('_AlmanaxDataErrorMessage', function () { self._handleError(); });

	connectionManager.on('_AlmanaxDataMessage', function (msg) {
		var calendar = window.gui.databases.AlmanaxCalendars[self._calendarDate];
		var npcId = calendar.npcId;
		staticContent.getData('Npcs', npcId, function (error, npcData) {
			if (error) {
				return console.warn('AlmanaxWindow getNpcData for npcId:', npcId, 'error:', error);
			}

			msg.meryde = npcData;

			self._setDefaultData(msg);

			self.lastUpdate = (new Date()).getUTCDate();
			self._createContent();
			self._updateQuestProgress();
			self._updateAlmanaxData(msg);
			self.delClassNames('spinner');
			self.isRefreshPending = false;
		});
	});

	connectionManager.on('AlmanachCalendarDateMessage', function (msg) {
		self._calendarDate = msg.date;
		self._showAlmanaxNotification(msg.date, msg._merydeName);
	});
}
inherits(AlmanaxWindow, WuiDom);
module.exports = AlmanaxWindow;


AlmanaxWindow.prototype._refreshIfNeeded = function () {
	// Update if different UTC day
	var today = (new Date()).getUTCDate();
	if (today === this.lastUpdate) {
		// NB: we update on refresh (open) instead of listening to all quest events because it is cheap and easy
		return this._updateQuestProgress();
	}

	if (this.isRefreshPending) { return; } // reply from server will come, no worry
	this.isRefreshPending = true;

	this.clearContent();
	this.addClassNames('spinner');
	window.dofus.send('almanaxDataRequest'); // we will receive _AlmanaxDataMessage or _AlmanaxDataErrorMessage
};

AlmanaxWindow.prototype._handleError = function () {
	this._createRetryButton();
	this.delClassNames('spinner');
	this.isRefreshPending = false;
};

AlmanaxWindow.prototype._createRetryButton = function () {
	var box = this.createChild('div', { className: 'failureBox' });
	box.createChild('div', { text: getText('ui.common.error') + '...' }); // no detail should be displayed here
	var retryBtn = box.appendChild(
		new Button({ className: 'greenButton', text: getText('tablet.common.retry') }));
	var self = this;
	retryBtn.on('tap', function () { self._refreshIfNeeded(); });
};

AlmanaxWindow.prototype._createContent = function () {
	// Left column

	var col1 = this.createChild('div', { className: 'col1' });
	var dateBlock = col1.createChild('div', { className: 'dateBlock' });

	this.monthText = dateBlock.createChild('div', { className: 'monthText' });
	var dayBackground = dateBlock.createChild('div', { className: 'dayBg' });
	this.dayNumber = dayBackground.createChild('div', { className: 'dayNumber' });
	this.yearText = dateBlock.createChild('div', { className: 'yearText' });

	var illusWrapper = dateBlock.createChild('div', { className: 'illusWrapper' });

	// astro left illustration
	this.astro = illusWrapper.createChild('div', { className: 'smallIllus' });

	// month god right illustration
	this.monthGod = illusWrapper.createChild('div', { className: 'smallIllus' });

	var bottomIllusWrapper = dateBlock.createChild('div', { className: 'bottomIllusWrapper' });
	this.bottomIllus = bottomIllusWrapper.createChild('div', { className: 'bottomIllus' });

	this.linkToCalendar = col1.appendChild(hyperlink.newExternalLink(getText('ui.almanax.link'),
		getText('ui.almanax.calendar')));

	// Saint block
	var block;
	var col2 = this.createChild('div', { className: 'col2' });
	block = col2.createChild('div');
	var saintBlock = block.createChild('div', { className: ['block', 'saintBlock'] });
	var saintBg = saintBlock.createChild('div', { className: 'saintBg' });
	this.merydeIllus = saintBg.createChild('div', { className: 'saintIllus' });

	this.merydeTitle = saintBlock.createChild('div', { className: 'title' });
	this.merydeDesc = saintBlock.createChild('div', { className: 'description' });
	this.instructionText = saintBlock.createChild('div', { className: 'instructionText' });

	// Bonus block
	block = col2.createChild('div');
	var bonusBlock = block.createChild('div', { className: ['block', 'bonusBlock'] });
	bonusBlock.createChild('div', { className: ['smallIllus', 'bonusIllus'] });
	this.bonusTitle = bonusBlock.createChild('div', { className: 'title' });
	this.bonusDesc = bonusBlock.createChild('div', { className: 'description' });

	// Dolmanax Quest block
	block = col2.createChild('div');
	var questBlock = block.createChild('div', { className: ['block', 'questBlock'] });
	var questContent = questBlock.createChild('div', { className: 'questContent' });

	//dolmanax image is loaded from corresponding item
	var dolmanaxBg = questContent.createChild('div', { className: 'dolmanaxBg' });
	var dolmanaxIllus = dolmanaxBg.createChild('div', { className: 'dolmanaxIllus' });
	itemManager.getItems([ALMANAX_ITEM_ID], function (error) {
		if (error) {
			return console.error(error);
		}
		dolmanaxIllus.setStyle('backgroundImage', itemManager.items[ALMANAX_ITEM_ID].image);
	});

	questContent.createChild('div', {
		className: 'title',
		text:      getText('ui.almanax.dolmanaxQuest')
	});
	this.questDesc = questContent.createChild('div', { className: 'description' });

	var buttonContainer = questContent.createChild('div', { className: 'buttonContainer' });
	this.locateButton = buttonContainer.createChild('div', { className: 'locateButton' });

	var buttonLocate = buttonContainer.appendChild(
		new Button({ className: 'greenButton', text: getText('ui.almanax.localizeSanctuary') }));
	buttonLocate.on('tap', function () {
		//TODO: when new API is available, use it to set the flag
		// + Flash code uses custom color 0xEE9933, specifies the map #1=Amakna, and allows flag removal on 2nd click
		window.gui.emit('CompassUpdateMessage', {
			type:   CompassTypeEnum.COMPASS_TYPE_SIMPLE,
			worldX: SANCTUARY_MAP_X,
			worldY: SANCTUARY_MAP_Y
		});
	});

	var progression = questContent.createChild('div', { className: 'progression' });
	this.questProgressTitle = progression.createChild('div', { className: 'questProgressTitle' });
	this.questProgressBar = progression.appendChild(new ProgressBar({ className: 'questProgressBar' }));

	// tooltips

	this.astroTooltipTx = new WuiDom('div');
	addTooltip(this.astro, this.astroTooltipTx);

	this.monthGodTooltipTx = new WuiDom('div');
	addTooltip(this.monthGod, this.monthGodTooltipTx);

	this.merydeTootipTx = new WuiDom('div');
	addTooltip(this.merydeIllus, this.merydeTootipTx);

	this.questTooltipTx = new WuiDom('div');
	addTooltip(this.questProgressBar, this.questTooltipTx);

	addTooltip(this.linkToCalendar, getText('ui.almanax.goToWebsite'));
};

/**
 * From ankama code. For each three categories (event, zodiac and month), if the URL of not valid set the default values
 * @param {object} almanaxData - msg from _AlmanaxDataMessage
 */
AlmanaxWindow.prototype._setDefaultData = function (almanaxData) {
	var eventData = almanaxData.event;
	var zodiacData = almanaxData.zodiac;
	var monthData = almanaxData.month;

	function isValidImageUrl(url) {
		return url && url !== 'false';
	}

	var defaultImages = [
		'gfx/almanax/jour.jpg',
		'gfx/almanax/protecteur.jpg',
		'gfx/almanax/constellation.jpg'
	];

	assetPreloading.preloadImageUrls(defaultImages, function (urls) {
		if (!isValidImageUrl(eventData.imageurl)) {
			eventData.bossText = eventData.bossText || getText('ui.almanax.default.boss');
			eventData.ephemeris = eventData.ephemeris || getText('ui.almanax.default.ephemeris');
			eventData.imageurl = eventData.imageurl || urls[0];
		}

		if (!isValidImageUrl(monthData.protectorimageurl)) {
			monthData.protectorDescription = monthData.protectorDescription || getText('ui.almanax.default.protector');
			monthData.protectorimageurl = monthData.protectorimageurl || urls[1];
		}

		if (!isValidImageUrl(zodiacData.imageurl)) {
			zodiacData.description = zodiacData.description || getText('ui.almanax.default.zodiac');
			zodiacData.imageurl = zodiacData.imageurl || urls[2];
		}
	});
};

AlmanaxWindow.prototype._updateAlmanaxData = function (almanaxData) {
	var calendar = window.gui.databases.AlmanaxCalendars[this._calendarDate];

	var currentDate = helper.getAlmanaxDate();
	this.dayNumber.setText(currentDate.day);
	this.monthText.setText(currentDate.monthName);
	this.yearText.setText(getText('ui.common.year', currentDate.year));

	var eventData = almanaxData.event;
	var zodiacData = almanaxData.zodiac;
	var monthData = almanaxData.month;
	var merydeData = almanaxData.meryde;

	// astro left illustration
	this.astro.setStyle('backgroundImage', 'url(' + zodiacData.imageurl + ')');

	// month god right illustration
	this.monthGod.setStyle('backgroundImage', 'url(' + monthData.protectorimageurl + ')');

	// event of the day and illus
	//TODO: eventData.name? I scanned all the date (using almanach set <dateNumber>) cannot find eventData.name
	// lbl_nameday.text = _eventInfo.name;
	this.bottomIllus.setStyle('backgroundImage', 'url(' + eventData.imageurl + ')');

	// Meryde
	this.merydeTitle.setText(getText('ui.almanax.dayMeryde', merydeData.nameId));
	this.merydeDesc.setText(eventData.ephemeris);
	this.instructionText.setText(getText('ui.almanax.offeringTo', merydeData.nameId));

	// Bonus of the day
	this.bonusTitle.setText(getText('ui.almanax.dayBonus') + getText('ui.common.colon') + calendar.nameId);
	this.bonusDesc.setHtml(calendar.descId);

	this.merydeIllus.setStyle('backgroundImage', 'url(' + eventData.bossimageurl + ')');

	// tooltips
	this.astroTooltipTx.setText(zodiacData.description);
	enableTooltip(this.astro, !!zodiacData.description);

	this.monthGodTooltipTx.setText(monthData.protectordesc);
	enableTooltip(this.monthGod, !!monthData.protectordesc);

	this.merydeTootipTx.setText(eventData.bosstext);
	enableTooltip(this.merydeIllus, !!eventData.bosstext);
};

AlmanaxWindow.prototype._updateQuestProgress = function () {
	if (window.gui.playerData.quests.finished[DOLMANAX_QUEST_ID]) {
		this.questDesc.setText(getText('ui.almanax.dolmanaxQuestDone'));
		this.questProgressTitle.setText(getText('ui.almanax.questDone'));
		this.questProgressBar.setValue(1);
		return;
	}

	this.questDesc.setText(getText('ui.almanax.dolmanaxQuestDesc'));
	this.questProgressTitle.setText(getText('ui.almanax.questProgress'));
	var sheetsQuantity = window.gui.playerData.inventory.quantityList[CALENDAR_SHEET_ITEM_ID] || 0;
	var qty = Math.min(sheetsQuantity, NUMBER_OF_DAYS);
	this.questProgressBar.setValue(qty / NUMBER_OF_DAYS);

	// tooltips
	this.questTooltipTx.setText(getText('ui.almanax.calendarSheetsCollected', qty, NUMBER_OF_DAYS));
};

/** Daily notification reminds you to make an offering to today's meryde */
AlmanaxWindow.prototype._showAlmanaxNotification = function (dateId, merydeName) {
	if (userPref.getValue('almanaxLastNotif') === dateId) { return; }
	userPref.setValue('almanaxLastNotif', dateId);

	var date = helper.getAlmanaxDate();
	var notificationBar = window.gui.notificationBar;

	notificationBar.newNotification('almanax', {
		type: notificationBar.notificationType.INVITATION,
		title: date.day + ' ' + date.monthName + ' ' + date.year,
		text: getText('ui.almanax.offeringTo', merydeName),
		buttons: [{
			label: getText('ui.almanax.almanax'),
			action: function () { windowsManager.open('grimoire', { tabId: 'almanax' }); }
		}]
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/AlmanaxWindow/index.js
 ** module id = 737
 ** module chunks = 0
 **/