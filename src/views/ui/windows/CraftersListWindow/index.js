require('./styles.less');
var CrafterDirectoryParamBitEnum = require('CrafterDirectoryParamBitEnum');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var Selector = require('Selector');
var Table = require('Table');
var staticContent = require('staticContent');
var windowsManager = require('windowsManager');
var Button = require('Button');
var WuiDom = require('wuidom');
var assetPreloading = require('assetPreloading');

function CraftersListWindow() {
	Window.call(this, {
		className: 'CraftersListWindow',
		title: getText('ui.craft.craftersList'),
		positionInfo: { top: 'c', left: 'c', width: 600, height: 480 }
	});

	var self = this;

	// fields
	var gui = window.gui;
	var jobIds = [];
	var selectedJob = {};
	var rows = {}; // crafters list table
	var yesStr = getText('ui.common.yes');
	var noStr = getText('ui.common.no');

	// methods
	function crafterButtonTapped() {
		windowsManager.open('crafter', { crafter: this.crafter, job: selectedJob });
	}

	function userNameButtonTapped() {
		window.gui.openContextualMenu('player', {
			playerId: this.playerInfo.playerId,
			accountId: self.accountId,
			playerName: this.playerInfo.playerName
		});
	}

	function getAvatar(playerInfo) {
		var avatar = new WuiDom('div', { className: 'avatar' });
		var headImageId = 'gfx/heads/SmallHead_' + playerInfo.breed + (playerInfo.sex ? 0 : 1) + '.png';
		assetPreloading.preloadImage(headImageId, function (imageUrl) {
			if (avatar && avatar.rootElement) {
				avatar.setStyle('backgroundImage', imageUrl);
			}
		});

		return avatar;
	}

	function getUserNameButton(playerInfo) {
		var userNameButton = new Button({ className: 'userNameButton', text: playerInfo.playerName });
		userNameButton.playerInfo = playerInfo;
		userNameButton.on('tap', userNameButtonTapped);
		return userNameButton;
	}

	// TODO: sorters
	/*function sortByNameIdAscending(listEntryA, listEntryB) {
		return listEntryA.playerInfo.playerName - listEntryB.playerInfo.playerName;
	}*/

	function getRowContent(listEntry) {
		// NOTE: listEntry is the crafter object returned by dofus server
		// TODO: include icons in table headers?
		var crafter = listEntry || {};
		var button = new Button();
		button.crafter = crafter;
		button.on('tap', crafterButtonTapped);

		var mustPay = (crafter.jobInfo.userDefinedParams & CrafterDirectoryParamBitEnum.CRAFT_OPTION_NOT_FREE) !== 0;
		var coordStr = '( ' + crafter.playerInfo.worldX + ',' + crafter.playerInfo.worldY + ' )';
		var playerCoords = crafter.playerInfo.isInWorkshop ? coordStr : '-';

		var rowContent = {
			avatar: getAvatar(crafter.playerInfo),
			name: getUserNameButton(crafter.playerInfo),
			level: crafter.jobInfo.jobLevel,
			coord: playerCoords,
			cost: mustPay ? yesStr : noStr,
			nbSlots: crafter.jobInfo.minSlots,
			button: button
		};

		return rowContent;
	}

	function populateCraftersList(listEntries) {
		self.table.clearContent();

		if (!listEntries.length) {
			return;
		}

		// populate the table
		for (var i = 0; i < listEntries.length; i += 1) {
			addToCraftersList(listEntries[i]);
		}
	}

	function addToCraftersList(listEntry) {
		var row = self.table.addRow(getRowContent(listEntry));
		rows[listEntry.playerInfo.playerId] = row;
	}

	function removeFromCraftersList(msg) {
		var row = rows[msg.playerId];
		var index = self.table.getRows().indexOf(row);
		self.table.delRow(index);
		delete rows[msg.playerId];
	}

	function updateCraftersList(listEntry) {
		var row = rows[listEntry.playerInfo.playerId];
		var index = self.table.getRows().indexOf(row);
		self.table.updateRow(index, getRowContent(listEntry));
	}

	function clean() {
		self.selector.clearContent();
		self.table.clearContent();
	}

	// listeners
	gui.on('ExchangeStartOkJobIndexMessage', function (msg) {
		windowsManager.openDialog(self.id, { msg: msg });
	});

	gui.on('JobCrafterDirectoryListMessage', function (msg) {
		populateCraftersList(msg.listEntries);
	});

	gui.on('JobCrafterDirectoryAddMessage', function (msg) {
		// NOTE: any change or addition receives this message
		if (rows[msg.listEntry.playerInfo.playerId]) {
			return updateCraftersList(msg.listEntry);
		}

		addToCraftersList(msg.listEntry);
	});

	gui.on('JobCrafterDirectoryRemoveMessage', removeFromCraftersList);

	this.once('open', function () {
		self.selector = self.windowBody.appendChild(new Selector());

		self.table = self.windowBody.appendChild(new Table({
			colIds: ['avatar', 'name', 'level', 'coord', 'cost', 'nbSlots', 'button'],
			colCount: 7,
			highlightable: true,
			headerContent: [
				'',
				'Name',
				'Lvl.',
				'coord',
				'cost',
				'nb',
				''
			]
		}));

		// select from combo box, use that jobId to list crafters
		self.selector.on('change', function (job) {
			if (job < 0) {
				self.table.clearContent();
				return;
			}
			selectedJob = job;
			window.dofus.sendMessage('JobCrafterDirectoryListRequestMessage', { jobId: job.id });
		});
	});

	this.on('open', function (params) {
		params = params || {};
		jobIds = params.msg.jobs; // to populate combo box; jobId is profession

		// get profession objects list to display
		staticContent.getData('Jobs', jobIds, function (error, jobs) {
			if (error) {
				return console.error(error); // TODO: specific window or message?
			}

			self.selector.clearContent();
			self.selector.addOption(getText('ui.craft.chooseJob'), -1);
			for (var i = 0; i < jobs.length; i += 1) {
				var job = jobs[i];
				self.selector.addOption(job.nameId, job); // 'label', value
			}

			if (jobs.length === 1) {
				self.selector.select(jobs[0]); // auto select for convenience
			}
		});
	});

	this.on('close', clean);
}

inherits(CraftersListWindow, Window);
module.exports = CraftersListWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftersListWindow/index.js
 ** module id = 917
 ** module chunks = 0
 **/