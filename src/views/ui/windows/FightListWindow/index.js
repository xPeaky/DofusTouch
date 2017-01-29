require('./styles.less');
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var inherits = require('util').inherits;
var WuiDom = require('wuidom');

var addTooltip = require('TooltipBox').addTooltip;
var AlignmentSideEnum = require('AlignmentSideEnum');
var Button = require('Button').DofusButton;
var FightOptionsEnum = require('FightOptionsEnum');
var FightTypeEnum = require('FightTypeEnum');
var fightManager = require('fightManager');
var getText = require('getText').getText;
var helper = require('helper');
var Table = require('Table');
var TeamTypeEnum = require('TeamTypeEnum');
var Window = require('Window');
var windowsManager = require('windowsManager');
var assetPreloading = require('assetPreloading');


function FightListWindow() {
	var self = this;
	Window.call(this, {
		className: 'FightListWindow',
		title: getText('ui.spectator.fightList'),
		positionInfo: { left: 'c', top: 'c', width: '680px', height: '96%', maxHeight: 630 }
	});

	var selectedFight;

	var FIGHT_OPTION_KEY_TO_ENUM = fightManager.FIGHT_OPTION_KEY_TO_ENUM;
	var FIGHT_OPTION_ICON_ID = fightManager.FIGHT_OPTION_ICON_ID;

	//------------------------------------
	// load image functions

	function loadHeadImage(player, headIcon) {
		var headImageId = 'gfx/heads/SmallHead_' + player.breed + (player.sex ? 1 : 0) + '.png';
		headIcon.setStyle('backgroundImage', 'none');

		assetPreloading.preloadImage(headImageId, function (imageUrl) {
			// if the element still exist, set the image
			if (headIcon.rootElement) {
				headIcon.setStyle('backgroundImage', imageUrl);
			}
		});
	}

	function loadFighterTypeImage(fighterTypeIcon, team) {
		var imageId = '';

		if (team.teamSide >= 0) {
			switch (team.teamSide) {
				case AlignmentSideEnum.ALIGNMENT_NEUTRAL :
					imageId += 'Neutre';
					break;
				case AlignmentSideEnum.ALIGNMENT_ANGEL :
					imageId += 'Bonta';
					break;
				case AlignmentSideEnum.ALIGNMENT_EVIL :
					imageId += 'Brakmar';
					break;
				case AlignmentSideEnum.ALIGNMENT_MERCENARY :
					imageId += 'Seriane';
					break;
			}
		} else {
			switch (team.teamTypeId) {
				case TeamTypeEnum.TEAM_TYPE_MONSTER :
					imageId += 'Monstre';
					break;
				case TeamTypeEnum.TEAM_TYPE_TAXCOLLECTOR :
					imageId += 'Perco';
					break;
				default :
					imageId += 'Neutre';
			}
		}

		imageId += team.teamId === 0 ? 'G' : 'D';
		imageId = 'gfx/illusUi/fightersType/spectator_tx_Picto' + imageId + '.png';

		assetPreloading.preloadImage(imageId, function (imageUrl) {
			// if the element still exist, set the image
			if (fighterTypeIcon.rootElement) {
				fighterTypeIcon.setStyle('backgroundImage', imageUrl);
			}
		});
	}

	//------------------------------------
	// helper functions

	function clearFightListDurationTimer() {
		var fightList = self.fightListTable.getRows();

		for (var i = 0; i < fightList.length; i += 1) {
			if (fightList[i].durationTimeoutId) {
				clearTimeout(fightList[i].durationTimeoutId);
			}
		}
	}

	function registerFightListDurationTimer(fightListRow, startTime) {
		var durationElm = fightListRow.getChild('duration');

		if (!startTime) {
			return durationElm.setText('-');
		}

		var duration = ~~(Date.now() / 1000) - startTime;

		var durationString = helper.durationToString(duration);
		var timeStringSplit = durationString.split(':');
		var hourMinute = timeStringSplit[0] + ':' + timeStringSplit[1];
		durationElm.setText(hourMinute);

		// make sure that we update at the exact minute
		var seconds = ~~duration % 60;
		var updateTime = 60 - seconds;

		fightListRow.durationTimeoutId = setTimeout(function () {
			registerFightListDurationTimer(fightListRow, startTime);
		}, (updateTime + 1) * 1000); // +1s buffer
	}

	function getFightListRowIndexByFightId(fightId) {
		var fightList = self.fightListTable.getRows();

		for (var i = 0; i < fightList.length; i += 1) {
			var fight = fightList[i].fight || {};

			if (fightId === fight.fightId) {
				return i;
			}
		}
	}

	function getFightListRowByFightId(fightId) {
		var index = getFightListRowIndexByFightId(fightId);
		return self.fightListTable.getRow(index);
	}

	//------------------------------------
	// element creation functions

	function createPlayerNum(elm, team) {
		var nbPlayers = elm.createChild('div', { className: 'nbPlayers' });
		nbPlayers.createChild('div', { className: 'num', text: team.teamMembersCount });

		var fighterTypeIcon = new WuiDom('div', { className: 'fighterTypeIcon' });

		if (team.teamId === 0) {
			nbPlayers.insertAsFirstChild(fighterTypeIcon);
		} else {
			nbPlayers.appendChild(fighterTypeIcon);
		}

		loadFighterTypeImage(fighterTypeIcon, team);
	}

	function createRelationIcon(className, toolTipText) {
		var relationElm = new WuiDom('div', { className: 'relation' });
		relationElm.addClassNames(className);
		addTooltip(relationElm, toolTipText);
		return relationElm;
	}

	function createFightListRow(fight) {
		var firstTeam = fight.fightTeams[0];
		var secondTeam = fight.fightTeams[1];

		// get the fight type style and tooltip text
		var fightTypeStyle = '';
		var fightType = fight.fightType;
		var fightTypeToolTipText = '';

		if (fightType === FightTypeEnum.FIGHT_TYPE_PVP_ARENA) {
			fightTypeStyle += ' fightType1';
			fightTypeToolTipText += getText('ui.common.koliseum');
		} else if (fightType === FightTypeEnum.FIGHT_TYPE_CHALLENGE) {
			fightTypeStyle += ' fightType2';
			fightTypeToolTipText += getText('ui.fight.challenge');
		} else if (fightType === FightTypeEnum.FIGHT_TYPE_AGRESSION) {
			fightTypeStyle += ' fightType3';
			fightTypeToolTipText += getText('ui.alert.event.11');
		} else if (fightType === FightTypeEnum.FIGHT_TYPE_PvT) {
			fightTypeStyle += ' fightType3';
			fightTypeToolTipText += getText('ui.spectator.taxcollectorAttack');
		}

		// create the double arrows and players number element
		var classes = ('nbPlayersLine' + fightTypeStyle).split(' ');
		var nbPlayersLine = new WuiDom('div', { className: classes });
		createPlayerNum(nbPlayersLine, firstTeam);
		createPlayerNum(nbPlayersLine, secondTeam);

		if (fightTypeToolTipText) {
			addTooltip(nbPlayersLine, fightTypeToolTipText);
		}

		// calculating overallAverageLevel
		var totalLevel = firstTeam.meanLevel * firstTeam.teamMembersCount +
			secondTeam.meanLevel * secondTeam.teamMembersCount;

		var overallAverageLevel = Math.round(totalLevel / (firstTeam.teamMembersCount + secondTeam.teamMembersCount));

		// set the relationship icon
		var relationElm;

		if (firstTeam.hasGroupMember || secondTeam.hasGroupMember) {
			relationElm = createRelationIcon('relation1', getText('ui.spectator.isGroup'));
		} else if (firstTeam.hasFriend || secondTeam.hasFriend) {
			relationElm = createRelationIcon('relation2', getText('ui.spectator.isFriend'));
		} else if (firstTeam.hasGuildMember || secondTeam.hasGuildMember) {
			relationElm = createRelationIcon('relation3', getText('ui.spectator.isGuild'));
		}

		var spectatorLocked = new WuiDom('div', { className: 'spectatorLocked', name: 'spectatorLocked' });
		spectatorLocked.toggleDisplay(fight.fightSpectatorLocked);

		return {
			spectatorLocked: spectatorLocked,
			nbPlayers: nbPlayersLine,
			level: overallAverageLevel,
			duration: new WuiDom('div', { name: 'duration' }),
			friend: relationElm || ''
		};
	}

	function addFightDetailsRow(fightDetailsCol, actor) {
		var classIcon;

		if (actor.breed > 0) {
			classIcon = new WuiDom('div', { className: 'classIcon' });
			loadHeadImage(actor, classIcon);
		}

		fightDetailsCol.table.addRow({
			name: actor.enrichData.name,
			class: classIcon || '',
			level: actor.level
		});
	}

	function createGameFightOptionIcon(id) {
		var icon = new WuiDom('div', { className: ['option', 'option' + id], hidden: true });

		var toolTipText = '';

		if (id === FightOptionsEnum.FIGHT_OPTION_SET_TO_PARTY_ONLY) {
			toolTipText = getText('ui.fight.option.blockJoinerExceptParty');
		} else if (id === FightOptionsEnum.FIGHT_OPTION_SET_CLOSED) {
			toolTipText = getText('ui.fight.option.blockJoiner');
		} else if (id === FightOptionsEnum.FIGHT_OPTION_ASK_FOR_HELP) {
			toolTipText = getText('ui.fight.option.help');
		}

		if (toolTipText) {
			addTooltip(icon, toolTipText);
		}

		return icon;
	}

	function createFightDetailsCol(teamId, className, title) {
		var col = new WuiDom('div', { className: className });
		var colTop = col.createChild('div', { className: 'colTop' });

		var titleContainer = colTop.createChild('div', { className: 'titleContainer' });
		titleContainer.createChild('div', { className: 'title', text: title });

		var gameFightOptions = titleContainer.createChild('div', { className: 'gameFightOptions' });
		col.gameFightOptions = {};

		for (var i = 0; i < FIGHT_OPTION_ICON_ID.length; i += 1) {
			var id = FIGHT_OPTION_ICON_ID[i];
			var gameFightOptionIcon = createGameFightOptionIcon(id);
			gameFightOptions.appendChild(gameFightOptionIcon);
			col.gameFightOptions[id] = gameFightOptionIcon;
		}

		col.averageLevelContainer = colTop.createChild('div', { className: 'averageLevelContainer' });
		var averageLevelText = getText('ui.common.averageLevel') + getText('ui.common.colon');
		col.averageLevelContainer.createChild('span', { text: averageLevelText });
		col.averageLevel = col.averageLevelContainer.createChild('span', { className: 'averageLevel' });

		col.table = col.appendChild(new Table({
			colIds: ['name', 'class', 'level'],
			colCount: 3,
			highlightable: false,
			headerContent: [
				getText('ui.common.name'),
				getText('ui.charcrea.breed'),
				getText('ui.common.short.level')
			]
		}));

		col.joinBtn = col.appendChild(new Button(getText('ui.common.join')));
		col.joinBtn.on('tap', function () {
			/* TODO:
			*  if is defending player's perceptor, open the social window so that the player can
			*  choose to defend the perceptor
			*/

			if (selectedFight && selectedFight.fightId) {
				var leaderId = selectedFight.fightTeams[col.teamId].leaderId;
				window.dofus.sendMessage('GameFightJoinRequestMessage', {
					fightId: selectedFight.fightId,
					fighterId: leaderId
				});
				windowsManager.close(self.id);
			}
		});

		col.teamId = teamId;

		return col;
	}

	//------------------------------------
	// Reset functions

	function resetFightOptionsByCol(col) {
		var gameFightOptions = col.gameFightOptions;

		for (var id in gameFightOptions) {
			updateFightOptionsIcon(col.teamId, id, false);
		}
	}

	function resetFightList() {
		clearFightListDurationTimer();
		self.fightListTable.clearContent();
	}

	function resetFightDetails() {
		self.col1.table.clearContent();
		self.col1.averageLevelContainer.hide();

		self.col2.table.clearContent();
		self.col2.averageLevelContainer.hide();

		resetFightOptionsByCol(self.col1);
		resetFightOptionsByCol(self.col2);
	}

	function disabledAllButtons() {
		self.col1.joinBtn.disable();
		self.col2.joinBtn.disable();
		self.buttonSpectate.disable();
	}

	function resetAll() {
		selectedFight = null;
		resetFightList();
		resetFightDetails();
		disabledAllButtons();
	}

	//------------------------------------
	// Update functions

	function updateJoinButton(col) {
		var joinBtn = col.joinBtn;

		if (!selectedFight) {
			joinBtn.disable();
			return;
		}

		var teamId = col.teamId;
		var teamOptions = selectedFight.fightTeamsOptions[teamId] || {};
		var isClosed = teamOptions.isClosed;
		var otherTeamId = (teamId + 1) % 2; // is either 0 or 1

		var team = selectedFight.fightTeams[teamId] || {};
		var otherTeam = selectedFight.fightTeams[otherTeamId] || {};

		var disabled = isClosed ||
			selectedFight.fightStart ||
			team.teamTypeId === TeamTypeEnum.TEAM_TYPE_MONSTER ||
			(team.teamTypeId === TeamTypeEnum.TEAM_TYPE_TAXCOLLECTOR && !team.hasMyTaxCollector) ||
			(otherTeam.teamTypeId === TeamTypeEnum.TEAM_TYPE_TAXCOLLECTOR && otherTeam.hasMyTaxCollector);

		if (disabled) {
			joinBtn.disable();
		} else {
			joinBtn.enable();
		}
	}

	function updateSpectateButton() {
		var hasRights = window.gui.playerData.identification.hasRights;
		if (!hasRights && selectedFight && selectedFight.fightSpectatorLocked) {
			self.buttonSpectate.disable();
		} else {
			self.buttonSpectate.enable();
		}
	}

	function updateButtons() {
		updateJoinButton(self.col1);
		updateJoinButton(self.col2);
		updateSpectateButton();
	}

	function updateFightOptionsIcon(teamId, option, state) {
		if (!option) {
			return;
		}

		var col = self['col' + (teamId + 1)];
		var gameFightOption = col.gameFightOptions[option];

		if (!gameFightOption || !col) {
			return;
		}

		gameFightOption.toggleDisplay(state);
	}

	function updateFightOptionsData(teamId, option, state) {
		if (!selectedFight) {
			return;
		}

		for (var id in FIGHT_OPTION_KEY_TO_ENUM) {
			if (FIGHT_OPTION_KEY_TO_ENUM[id] === option) {
				var fightTeamOptions = selectedFight.fightTeamsOptions[teamId];
				fightTeamOptions[id] = state;
				break;
			}
		}
	}

	function updateSpectateLockedIcon(msg) {
		var rowIndex = getFightListRowIndexByFightId(msg.fightId);

		if (rowIndex >= 0) {
			var row = self.fightListTable.getRow(rowIndex);
			row.fight.fightSpectatorLocked = msg.state;

			var spectateCol = self.fightListTable.getCol(rowIndex, 'spectatorLocked');
			var spectatorLocked = spectateCol.getChild('spectatorLocked');
			spectatorLocked.toggleDisplay(msg.state);
		}
	}

	function updateGameFightOptions(msg) {
		if (msg.option === 0) {
			updateSpectateLockedIcon(msg);
		}

		if (selectedFight && selectedFight.fightId === msg.fightId) {
			updateFightOptionsData(msg.teamId, msg.option, msg.state);
			updateFightOptionsIcon(msg.teamId, msg.option, msg.state);
			updateButtons();
		}
	}

	function updateFightDetailsCol(col, data) {
		data = data || [];

		col.table.clearContent();
		col.averageLevelContainer.toggleDisplay(!!data.length);
		resetFightOptionsByCol(col);

		if (!data.length) {
			return;
		}

		// updating all the fight options icons
		var teamId = col.teamId;
		var fightTeamOptions = selectedFight.fightTeamsOptions[teamId];

		for (var id in fightTeamOptions) {
			if (FIGHT_OPTION_KEY_TO_ENUM.hasOwnProperty(id)) {
				var option = FIGHT_OPTION_KEY_TO_ENUM[id];
				var state = fightTeamOptions[id];
				updateFightOptionsIcon(teamId, option, state);
			}
		}

		// fill the fight details table
		var totalLevel = 0, totalActor = data.length;

		for (var i = 0; i < totalActor; i++) {
			var actor = data[i];
			addFightDetailsRow(col, actor);
			totalLevel += actor.level;
		}

		col.averageLevel.setText(Math.round(totalLevel / totalActor));
	}

	function updateFightDetails(msg) {
		msg = msg || {};

		updateFightDetailsCol(self.col1, msg.attackers);
		updateFightDetailsCol(self.col2, msg.defenders);
	}

	function updateFightList(msg) {
		msg = msg || {};
		var newFightList = msg.fights || [];

		if (newFightList.length < 1) {
			resetAll();
			return;
		}

		// clear all duration timer, will create timer again when we update the fight list later
		clearFightListDurationTimer();

		var i, row, rowIndex, fightList = self.fightListTable.getRows();

		// get a list of current fightList ids
		var fightListIds = [];
		fightList.forEach(function (row) {
			fightListIds.push(row.fight.fightId);
		});

		// get a list of new fightList ids
		var newFightIds = [];
		newFightList.forEach(function (fight) {
			newFightIds.push(fight.fightId);
		});

		for (i = 0; i < fightListIds.length; i += 1) {
			var fightId = fightListIds[i];

			// delete rows that is not in the new fight list
			if (newFightIds.indexOf(fightId) < 0) {
				rowIndex = getFightListRowIndexByFightId(fightId);
				self.fightListTable.delRow(rowIndex);
			}
		}

		// add new rows or update rows if already exist
		for (i = 0; i < newFightList.length; i++) {
			var newFight = newFightList[i];
			var fightListContent = createFightListRow(newFight);
			rowIndex = getFightListRowIndexByFightId(newFight.fightId);

			if (rowIndex >= 0) {
				row = self.fightListTable.updateRow(rowIndex, fightListContent, { fight: newFight });
			} else {
				row = self.fightListTable.addRow(fightListContent, { fight: newFight });
			}

			registerFightListDurationTimer(row, newFight.fightStart);
		}

		// handle selection
		if (selectedFight && selectedFight.fightId) {
			var selectedRow = getFightListRowByFightId(selectedFight.fightId);

			if (selectedRow) {
				selectedRow.tap();
				return;
			}
		}

		var firstRow = self.fightListTable.getRows()[0];
		firstRow.tap();
	}

	//------------------------------------
	// Server request

	function fightDetailsServerRequest() {
		// after sending this message, server will return the 'MapRunningFightDetailsMessage', when we received
		// that message, we will update the fight details and the buttons with the selected fight
		window.dofus.sendMessage('MapRunningFightDetailsRequestMessage', { fightId: selectedFight.fightId });
	}

	function fightListServerRequest() {
		// after sending this message, server will return the 'MapRunningFightListMessage', when we received
		// that message, we will update the fight list, select a fight list and call fightDetailsServerRequest
		window.dofus.sendMessage('MapRunningFightListRequestMessage');
	}

	//------------------------------------
	// Open and close events

	this.once('open', function () {
		this.fightListTable = this.windowBody.appendChild(new Table({
			colIds: ['spectatorLocked', 'nbPlayers', 'level', 'duration', 'friend'],
			colCount: 4,
			highlightable: true,
			disableAutoSelect: true,
			headerContent: [
				'',
				getText('ui.common.numberOfPlayers'),
				getText('ui.common.level'),
				getText('ui.fightend.duration'),
				getText('ui.common.friends')
			],
			onRowTap: function (row) {
				selectedFight = row.fight;
				fightDetailsServerRequest();
			}
		}));
		this.fightListTable.addClassNames('fightListTable');

		var colsWrapper = this.windowBody.createChild('div', { className: 'colsWrapper' });

		this.col1 = createFightDetailsCol(0, ['colTeam', 'col1'], getText('ui.common.attackers'));
		this.col2 = createFightDetailsCol(1, ['colTeam', 'col2'], getText('ui.common.defenders'));

		colsWrapper.appendChild(this.col1);
		colsWrapper.appendChild(this.col2);

		this.buttonSpectate = new Button(getText('ui.common.tospectate'), { className: 'buttonSpectate' });
		this.buttonSpectate.on('tap', function () {
			if (selectedFight && selectedFight.fightId) {
				window.dofus.sendMessage('GameFightJoinRequestMessage', { fightId: selectedFight.fightId, fighterId: 0 });
				windowsManager.close(self.id);
			}
		});
		this.windowBody.appendChild(this.buttonSpectate);
	});

	this.on('open', function () {
		resetAll();
		fightListServerRequest();
	});

	this.on('close', function () {
		window.dofus.sendMessage('StopToListenRunningFightRequestMessage');
	});

	//------------------------------------
	// Server message events

	var gui = window.gui;

	gui.on('MapFightCountMessage', function () {
		if (self.isVisible()) {
			fightListServerRequest();
		}
	});

	gui.on('MapRunningFightListMessage', updateFightList);

	gui.on('MapRunningFightDetailsMessage', function (msg) {
		updateFightDetails(msg);
		updateButtons();
	});

	gui.on('GameRolePlayRemoveChallengeMessage', function () {
		if (self.isVisible()) {
			fightListServerRequest();
		}
	});

	gui.on('GameFightOptionStateUpdateMessage', function (msg) {
		if (self.isVisible()) {
			updateGameFightOptions(msg);
		}
	});

	gui.playerData.position.on('mapChanged', function () {
		windowsManager.close(self.id);
	});
}

inherits(FightListWindow, Window);
module.exports = FightListWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/FightListWindow/index.js
 ** module id = 726
 ** module chunks = 0
 **/