// jscs:disable disallowQuotedKeysInObjects

var IsoEngine         = require('./main.js');
var constants         = require('constants');
var fightManager      = require('fightManager');
var FightTypeEnum     = require('FightTypeEnum');
var TeamEnum          = require('TeamEnum');
var TeamTypeEnum      = require('TeamTypeEnum');
var GameContextEnum   = require('GameContextEnum');
var textureLoading    = require('textureLoading');
var Graphic           = require('Graphic');

var FIGHT_OPTION_KEY_TO_ENUM = fightManager.FIGHT_OPTION_KEY_TO_ENUM;
var FIGHT_OPTION_ICON_ID = fightManager.FIGHT_OPTION_ICON_ID;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

function getTeamContextualId(fightId, teamId) {
	return 'fight:' + fightId + ':' + teamId;
}

var fights = {};

function Fight(fightId) {
	if (fights[fightId]) {
		console.warn('Fight with id ' + fightId + ' already exist.');
		fights[fightId].remove();
	}
	this.id = fightId;
	this.teams = {};
	fights[fightId] = this;
}

Fight.prototype.addTeam = function (teamId, cellId) {
	this.teams[teamId] = {
		id: teamId,
		contextualId: getTeamContextualId(this.id, teamId),
		icons: {},
		options: {},
		cellId: cellId
	};
};

Fight.prototype.remove = function () {
	for (var teamId in this.teams) {
		var team = this.teams[teamId];
		window.actorManager.removeActor(team.contextualId);
		for (var fightOption in team.icons) {
			team.icons[fightOption].remove();
		}
	}
	delete fights[this.id];
};

Fight.prototype._createIcon = function (teamId, fightOption, texturePath) {
	var self = this;
	var scene = window.isoEngine.mapScene;
	var team = this.teams[teamId];

	if (!team) {
		return console.error(new Error('No team with id ' + teamId + ' in fight ' + this.id));
	}

	if (FIGHT_OPTION_ICON_ID.indexOf(fightOption) === -1) {
		return console.error(new Error('Unknown fightOption:' + fightOption));
	}

	if (team.icons[fightOption]) {
		console.warn('Icon ' + fightOption + ' already exists for team ' + teamId + ' in fight ' + this.id);
		team.icons[fightOption].show();
		return;
	}

	function createIcon(iconTexture) {
		if (!fights[self.id]) { // fight has been removed since icon display has been requested
			return iconTexture.release();
		}
		if (team.icons[fightOption]) { // icon has already been created (should never happen)
			return iconTexture.release();
		}
		team.icons[fightOption] = new Graphic({
			layer: constants.MAP_LAYER_ICONS,
			w: iconTexture.element.width,
			h: iconTexture.element.height,
			scene: scene
		}, iconTexture);
		if (!team.options[fightOption]) {
			team.icons[fightOption].hide();
		}
		self._updateIconsPosition(teamId);
	}

	textureLoading.loadTexture(texturePath, createIcon, scene.renderer);
};

Fight.prototype._updateIconsPosition = function (teamId) {
	var team = this.teams[teamId];
	if (!team) {
		return console.error(new Error('No team with id ' + teamId + ' in fight ' + this.id));
	}
	var visibleIconsNb = 0;
	var iconMaxWidth = 0;
	for (var fightOption in team.icons) {
		if (team.icons[fightOption].isDisplayed) { visibleIconsNb++; }
		iconMaxWidth = Math.max(team.icons[fightOption].w, iconMaxWidth);
	}

	var iconMargin = iconMaxWidth * 0.1;
	var coordinate = window.isoEngine.mapRenderer.grid.getSceneCoordinateFromCellId(team.cellId);
	var startX = coordinate.x - (iconMaxWidth + iconMargin) / 2 * (visibleIconsNb - 1);

	var i = 0;
	for (fightOption in team.icons) {
		if (!team.icons[fightOption].isDisplayed) { continue; }
		team.icons[fightOption].x = startX + i * (iconMaxWidth + iconMargin) - team.icons[fightOption].w / 2;
		team.icons[fightOption].y = coordinate.y - constants.CELL_HEIGHT * 2.1;
		i++;
	}
};

Fight.prototype.setFightOption = function (teamId, fightOption, state) {
	var team = this.teams[teamId];
	if (!team) {
		return console.error(new Error('No team with id ' + teamId + ' in fight ' + this.id));
	}
	if (team.options[fightOption] === undefined) { // icon creation for this option has never been requested
		team.options[fightOption] = state;
		this._createIcon(teamId, fightOption, 'ui/spectator/fightOption' + fightOption + '.png');
		return;
	}
	team.options[fightOption] = state;
	if (team.icons[fightOption]) { // icon creation for this option is already finished
		var method = state ? 'show' : 'hide';
		team.icons[fightOption][method]();
		this._updateIconsPosition(teamId);
	}
};

Fight.prototype.challengeOptionChange = function (teamId, fightOption, state) {
	var team = this.teams[teamId];
	if (!team) {
		return console.error(new Error('No team with id ' + teamId + ' in fight ' + this.id));
	}
	if (FIGHT_OPTION_ICON_ID.indexOf(fightOption) !== -1) {
		this.setFightOption(teamId, fightOption, state);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

var TEAM_CHALLENGER_LOOK          = 19;
var TEAM_DEFENDER_LOOK            = 20;
var TEAM_TAX_COLLECTOR_LOOK       = 21;
var TEAM_ANGEL_LOOK               = 32;
var TEAM_DEMON_LOOK               = 33;
var TEAM_NEUTRAL_LOOK             = 1237;
var TEAM_BAD_ANGEL_LOOK           = 1235;
var TEAM_BAD_DEMON_LOOK           = 1236;
var TEAM_CHALLENGER_AVA_ALLY      = 2248;
var TEAM_CHALLENGER_AVA_ATTACKERS = 2249;
var TEAM_CHALLENGER_AVA_DEFENDERS = 2251;
var TEAM_DEFENDER_AVA_ALLY        = 2252;
var TEAM_DEFENDER_AVA_ATTACKERS   = 2253;
var TEAM_DEFENDER_AVA_DEFENDERS   = 2255;

var AGRESSION_LOOKS = {
	'-1': [TEAM_CHALLENGER_LOOK, TEAM_CHALLENGER_LOOK],
	'0':  [TEAM_NEUTRAL_LOOK,    TEAM_NEUTRAL_LOOK],
	'1':  [TEAM_BAD_ANGEL_LOOK,  TEAM_ANGEL_LOOK],
	'2':  [TEAM_BAD_DEMON_LOOK,  TEAM_DEMON_LOOK],
	'3':  [TEAM_NEUTRAL_LOOK,    TEAM_NEUTRAL_LOOK]
};

var KOH_LOOKS = {
	'0': [TEAM_CHALLENGER_AVA_ALLY, TEAM_CHALLENGER_AVA_DEFENDERS, TEAM_CHALLENGER_AVA_ATTACKERS],
	'1': [TEAM_DEFENDER_AVA_ALLY,   TEAM_DEFENDER_AVA_DEFENDERS,   TEAM_DEFENDER_AVA_ATTACKERS]
};

function getTeamLook(fightInfos, teamInfos) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	switch (fightInfos.fightType) {
		//-----------------------------------------------------------------------------------
		case FightTypeEnum.FIGHT_TYPE_AGRESSION:
			return AGRESSION_LOOKS[teamInfos.teamSide][~~(teamInfos.teamTypeId === TeamTypeEnum.TEAM_TYPE_BAD_PLAYER)];

		//-----------------------------------------------------------------------------------
		case FightTypeEnum.FIGHT_TYPE_Koh:
			/*
			// player alliance
			var playerAllianceId = allianceFrame.hasAlliance ? allianceFrame.alliance.allianceId : -1;

			// prism alliance
			var currentSubAreaId = PlayedCharacterManager.getInstance().currentSubArea.id;
			var prismSubAreaInfo = allianceFrame.getPrismSubAreaById(currentSubAreaId);
			var prismAllianceId  = prismSubAreaInfo ?
				(prismSubAreaInfo.alliance ? prismSubAreaInfo.alliance.allianceId : playerAllianceId) :
				-1;
			*/

			var teamAllianceId   = null;
			var playerAllianceId = null; // TODO
			var prismAllianceId  = null; // TODO
			var teamSide;

			if (teamInfos.teamMembers[0]._type === 'FightTeamMemberWithAllianceCharacterInformations') {
				teamAllianceId = teamInfos.teamMembers[0].allianceInfos.allianceId;
			}

			switch (true) {
				case (playerAllianceId !== null && playerAllianceId === teamAllianceId)  : teamSide = 0; break;
				case (prismAllianceId  !== null && teamAllianceId   === prismAllianceId) : teamSide = 1; break;
				default                                                                  : teamSide = 2;
			}

			return KOH_LOOKS[teamInfos.teamId][teamSide];

		//-----------------------------------------------------------------------------------
		case FightTypeEnum.FIGHT_TYPE_CHALLENGE:
			return TEAM_CHALLENGER_LOOK;

		//-----------------------------------------------------------------------------------
		case FightTypeEnum.FIGHT_TYPE_PvT:
			return teamInfos.teamId === TeamEnum.TEAM_CHALLENGER ? TEAM_CHALLENGER_LOOK : TEAM_TAX_COLLECTOR_LOOK;

		//-----------------------------------------------------------------------------------
		default:
			return teamInfos.teamId === TeamEnum.TEAM_CHALLENGER ? TEAM_CHALLENGER_LOOK : TEAM_DEFENDER_LOOK;
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Show challenge
 *
 * @param {Object}   challenge - challenge informations
 *
 * @param {number}   challenge.fightId             - fight id
 * @param {number}   challenge.fightType           - fight type (see FightTypeEnum)
 * @param {Object[]} challenge.fightTeams          - teams informations
 * @param {Object[]} challenge.fightTeamsOptions   - teams options informations
 * @param {number[]} challenge.fightTeamsPositions - cell id where challenge models are displayed
 *
 * @param {number}   challenge.fightTeams[*].teamId      - team id
 * @param {number}   challenge.fightTeams[*].leaderId    - team leader id
 * @param {number}   challenge.fightTeams[*].teamSide    - team alignement
 * @param {number}   challenge.fightTeams[*].teamTypeId  - team type
 * @param {Object[]} challenge.fightTeams[*].teamMembers - team members
 *
 * @param {boolean}  challenge.fightTeamsOptions[*].isSecret
 * @param {boolean}  challenge.fightTeamsOptions[*].isRestrictedToPartyOnly
 * @param {boolean}  challenge.fightTeamsOptions[*].isClosed
 * @param {boolean}  challenge.fightTeamsOptions[*].isAskingForHelp
 */
IsoEngine.prototype.showChallenge = function (challenge) {
	var actorManager = this.actorManager;
	var fightId   = challenge.fightId;
	var teams     = challenge.fightTeams;
	var positions = challenge.fightTeamsPositions;
	var options   = challenge.fightTeamsOptions;

	var fight = new Fight(fightId);

	for (var i = 0; i < teams.length; i++) {
		var team = teams[i];
		var bonesId = getTeamLook(challenge, team);
		team.fightId = fightId;
		team.look = { bonesId: bonesId, scales: [100], skins: [], indexedColors: [] };
		team.disposition = { cellId: positions[i], direction: 0 };
		team.contextualId = getTeamContextualId(fightId, team.teamId);
		actorManager.addEmptyActor(team);
		fight.addTeam(team.teamId, positions[i]);
		actorManager.setActorLook(team.contextualId, team.look);
		for (var optionKey in options[i]) {
			if (FIGHT_OPTION_KEY_TO_ENUM[optionKey] === undefined) { continue; }
			if (!options[i][optionKey]) { continue; } // the option is off
			fight.setFightOption(team.teamId, FIGHT_OPTION_KEY_TO_ENUM[optionKey], true);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add several challenges (used when entering in a new map) */
IsoEngine.prototype.addChallenges = function (challenges) {
	// TODO: improve performances by loading all fights models at once
	for (var i = 0; i < challenges.length; i++) {
		this.showChallenge(challenges[i]);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove challenge */
IsoEngine.prototype.removeChallenge = function (fightId) {
	var fight = fights[fightId];
	if (!fight) {
		return console.warn('No challenge with id ' + fightId);
	}
	fight.remove();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove all chalenges in memory */
IsoEngine.prototype.cleanupChallenges = function () {
	for (var fightId in fights) {
		fights[fightId].remove();
	}
};

IsoEngine.prototype.challengeOptionChange = function (fightId, teamId, option, state) {
	var fight = fights[fightId];
	if (!fight) {
		return console.warn('No challenge with id ' + fightId);
	}
	fight.challengeOptionChange(teamId, option, state);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update a team in a fight on the map
 *
 * @param {number}   msg.fightId - fight id on the map
 * @param {Object}   msg.team    - FightTeamInformations object
 *
 * @param {number}   msg.team.teamId      - team id
 * @param {number}   msg.team.leaderId    - team leader contextual id
 * @param {number}   msg.team.teamSide    - team alignment side
 * @param {number}   msg.team.teamTypeId  - team type
 * @param {Object[]} msg.team.teamMembers - team members
 */
IsoEngine.prototype.updateFightTeam = function (msg) {
	if (this.gameContext === GameContextEnum.FIGHT) { return; }
	var fightId = msg.fightId;
	var team = msg.team;
	team.fightId = fightId;
	var teamId = team.teamId;
	var id = getTeamContextualId(fightId, teamId);
	var actor = this.actorManager.getActor(id);
	if (!actor) {
		return console.warn('No fight id ' + id);
	}
	actor.updateData(team);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/challenge.js
 ** module id = 1056
 ** module chunks = 0
 **/