require('./styles.less');
var AggressableStatusEnum = require('AggressableStatusEnum');
var addTooltip = require('TooltipBox').addTooltip;
var allianceManager = require('allianceManager');
var dimensions  = require('dimensionsHelper').dimensions;
var EmblemLogo = require('EmblemLogo');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var tapBehavior = require('tapBehavior');
var serverConstants = require('ServersData').serverConstants;
var entityManager = require('socialEntityManager');
var Table = require('Table');
var WuiDom = require('wuidom');

var Gauge = require('./Gauge.js');

var WINNING_SCORE, KOH_DURATION;


function KohBox() {
	WuiDom.call(this, 'div', { className: 'KohBox', hidden: true });

	tapBehavior(this);
	this.on('tap', function () {
		window.gui.windowsContainer.appendChild(this);
	});

	this.once('show', function () {
		this._createDom();
	});

	var self = this;
	window.gui.on('KohUpdateMessage', function (msg) {
		self.show();
		self._setCurrentState(msg);
	});

	this.isInProbation = false;
	window.gui.on('UpdateSelfAgressableStatusMessage', function (msg) {
		//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
		switch (msg.status) {
		case AggressableStatusEnum.AvA_ENABLED_AGGRESSABLE:
			self.isInProbation = false;
			break;
		case AggressableStatusEnum.AvA_PREQUALIFIED_AGGRESSABLE:
			self.isInProbation = true;
			break;
		}
	});
}
inherits(KohBox, WuiDom);

KohBox.prototype._createDom = function () {
	var serversData = window.gui.serversData;

	WINNING_SCORE = serversData.sessionConstants[serverConstants.SERVER_CONST_KOH_WINNING_SCORE];
	KOH_DURATION = Math.floor(serversData.sessionConstants[serverConstants.SERVER_CONST_KOH_DURATION]);
	this.setStyle('left', dimensions.mapLeft + Math.floor(dimensions.mapWidth / 2) + 'px');

	var displaySwitch = this.createChild('div', { className: 'displaySwitch' });
	displaySwitch.createChild('div', { className: 'arrow' });

	var mainBox = this.createChild('div', { className: 'mainBox' });
	var topBox = mainBox.createChild('div', { className: 'topBox' });
	var secondaryBox = mainBox.createChild('div', { className: 'secondaryBox' });

	this.gauge = topBox.appendChild(new Gauge(['green', 'blue', 'red'], 380));

	var durationMinutes = Math.floor(KOH_DURATION / 1000 / 60);
	var kohDuration = Math.floor(durationMinutes / 60) + ':' + durationMinutes % 60;

	var kohInfo = topBox.createChild('div', { className: 'kohInfo' });
	addTooltip(kohInfo, getText('ui.koh.tooltip.rules', WINNING_SCORE, kohDuration), { openOnTap: true });

	var allianceBox = secondaryBox.createChild('div', { className: 'allianceBox' });
	this.table = allianceBox.appendChild(new Table({
		colIds: ['side', 'emblem', 'tag', 'characters', 'maps', 'time'],
		headerContent: [
			'',
			'',
			getText('ui.common.alliance'),
			getText('ui.short.characters'),
			getText('ui.common.maps'),
			getText('ui.common.time')
		]
	}));

	addTooltip(this.table.getHeaderCol('characters'), getText('ui.koh.tooltip.members'));
	addTooltip(this.table.getHeaderCol('maps'), getText('ui.koh.tooltip.maps'));
	addTooltip(this.table.getHeaderCol('time'), getText('ui.koh.tooltip.time'));

	this.winnerInfo = allianceBox.createChild('div', { className: 'info' });

	var statsBox = secondaryBox.createChild('div', { className: 'statsBox' });
	this.winnerStats = statsBox.createChild('div', { className: 'winnerStats' });
	addTooltip(this.winnerStats, getText('ui.koh.tooltip.mapConquest'));
	this.myStats = statsBox.createChild('div', { className: 'myStats' });
	addTooltip(this.myStats, getText('ui.koh.tooltip.mapConquestForMyAlliance'));

	var position;
	tapBehavior(displaySwitch);
	var self = this;

	function open() {
		self.replaceClassNames(['full'], ['open']);
		position = 'open';
	}

	displaySwitch.on('tap', function () {
		switch (position) {
		case 'open':
			self.replaceClassNames(['open'], ['full']);
			position = 'full';
			break;
		case 'full':
			self.delClassNames('open', 'full');
			position = 'close';
			break;
		case 'close':
			open();
			break;
		}
	});

	this.on('hide', open);
	open();
};


function createRow(alliance, side, tooltipContent, score, maps, characterCount) {
	var sideLogo = new WuiDom('div', { className: ['side', side] });
	addTooltip(sideLogo, tooltipContent);

	var emblem = new EmblemLogo({ width: 25, height: 25 });
	emblem.setValue(alliance.allianceEmblem, true);
	addTooltip(emblem, alliance.allianceName + ' [' + alliance.allianceTag + ']');

	var tag = new WuiDom('div', { text: alliance.allianceTag });
	tapBehavior(tag);
	tag.on('tap', function () {
		allianceManager.openAllianceCard(alliance.allianceId);
	});

	return {
		side: sideLogo,
		emblem: emblem,
		tag: tag,
		characters: characterCount,
		maps: maps,
		time: score
	};
}

KohBox.prototype._setCurrentState = function (msg) {
	var self = this;

	this.table.clearContent();

	var playerData = window.gui.playerData;
	var myAlliance = playerData.alliance.current;
	var position = playerData.position;
	var prism = entityManager.entities.prism[position.subAreaId];
	var defendingAlliance = prism && prism.prism && prism.prism.alliance || myAlliance;

	var total = 0;
	var winnerIndex = 0;

	var tooltipsData = {
		mine: { weight: 0, type: getText('ui.alliance.myAlliance'), tooltip: '' },
		defense: { weight: 0, type: getText('ui.alliance.allianceInDefense'), tooltip: '' },
		attack: { weight: 0, type: getText('ui.alliance.allianceInAttack'), tooltip: '' }
	};

	for (var i = 0, len = msg.alliances.length; i < len; i += 1) {
		var alliance = msg.alliances[i];
		var characterCount = msg.allianceNbMembers[i];
		var score = msg.allianceMatchScore[i];
		var maps = msg.allianceRoundWeigth[i];

		total += maps;

		var side;
		if (alliance.allianceId === myAlliance.allianceId) {
			side = 'mine';
		} else if (alliance.allianceId === defendingAlliance.allianceId) {
			side = 'defense';
		} else {
			side = 'attack';
		}

		var scoreDisplay = score + '/' + WINNING_SCORE;
		var tooltip = tooltipsData[side];
		tooltip.weight += maps;
		tooltip.tooltip +=
			alliance.allianceName  + ' [' + alliance.allianceTag + '] ' + '(' + maps + ') : ' + scoreDisplay  + '\n';

		this.table.addRow(
			createRow(alliance, side, tooltip.type, scoreDisplay, maps, characterCount),
			{ weight: maps }
		);

		if (msg.allianceMatchScore[winnerIndex] < score) {
			winnerIndex = i;
		}
	}

	this.table.sort(function (row1, row2) {
		return row2.weight - row1.weight;
	});

	total = total || 1;
	tooltipsData.mine.weight /= total;
	tooltipsData.mine.tooltip += tooltipsData.mine.type;
	tooltipsData.defense.weight /= total;
	tooltipsData.defense.tooltip += tooltipsData.defense.type;
	tooltipsData.attack.weight /= total;
	tooltipsData.attack.tooltip += tooltipsData.attack.type;

	this.gauge.setValues([tooltipsData.mine, tooltipsData.defense, tooltipsData.attack]);

	var currentWinner = msg.alliances[winnerIndex];
	var currentWinnerScore = msg.allianceMatchScore[winnerIndex];
	if (currentWinner && currentWinnerScore >= WINNING_SCORE) { // end of KoH
		this.winnerInfo.setText(getText('ui.koh.win', currentWinner.allianceName));
		this.winnerInfo.show();

		setTimeout(function () {
			self.winnerInfo.setText('');
			self.hide();
		}, 60 * 1000); // close after 1 minute

		return;
	}


	var mapWinnerAlliance = msg.allianceMapWinner;
	var mapWinnerScore = msg.allianceMapWinnerScore;

	// 'Map [12,-17] : Hexen 300 pts'
	this.winnerStats.clearContent();
	var coordinates = position.coordinates;
	this.winnerStats.createChild('span', { text: getText('ui.option.worldOption') +
	' [' + coordinates.posX + ', ' + coordinates.posY + ']' +
	getText('ui.common.colon') });

	if (mapWinnerScore === 0 || this.isInProbation) { // no winner
		this.winnerStats.createChild('span', { text: getText('ui.common.neutral') });
	} else if (mapWinnerAlliance.allianceTag === '') { // tie between alliances
		this.winnerStats.createChild('span', { text: getText('ui.koh.draw', mapWinnerScore) });
	} else {
		var winnerTag = this.winnerStats.createChild('span', { text: mapWinnerAlliance.allianceTag, className: 'link' });
		tapBehavior(winnerTag);
		winnerTag.on('tap', function () { allianceManager.openAllianceCard(mapWinnerAlliance.allianceId); });

		this.winnerStats.appendChild(new WuiDom('span', { text: ' ' + mapWinnerScore + ' '  + getText('ui.short.points') }));
	}

	// if our alliance isn't first or no winner, we display our information: (Cow 200 pts)
	if (mapWinnerAlliance.allianceId !==  myAlliance.allianceId && mapWinnerScore > 0 && !this.isInProbation) {
		this.myStats.clearContent();
		this.myStats.createChild('span', { text: '(' });

		var myTag = this.myStats.createChild('span', { text: myAlliance.allianceTag, className: 'link' });
		tapBehavior(myTag);
		myTag.on('tap', function () { allianceManager.openAllianceCard(myAlliance.allianceId); });

		this.myStats.appendChild(new WuiDom('span', {
			text: ' ' + msg.allianceMapMyAllianceScore + ' ' + getText('ui.short.points') + ')'
		}));

		this.myStats.show();
	} else {
		this.myStats.hide();
	}
};

module.exports = KohBox;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/KohBox/index.js
 ** module id = 477
 ** module chunks = 0
 **/