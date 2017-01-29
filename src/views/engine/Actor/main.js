var inherits     = require('util').inherits;
var Tween        = require('TINAlight').Tween;
var FighterData  = require('fightManager/fighterData');
var Entity       = require('Entity');
var GameContext  = require('GameContextEnum');

var HOOK_POINT_CATEGORY_MOUNT_DRIVER = require('SubEntityBindingPointCategoryEnum').HOOK_POINT_CATEGORY_MOUNT_DRIVER;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class Actor
 * @desc  actor wrapper
 *
 * @author  Cedric Stoquer
 *
 * @param {Object} params   - parameters object
 *
 * @param {number} params.actorId   - id of actor
 * @param {number} params.position    - position (cellId) of actor on the map
 * @param {number} params.direction - direction actor is facing. Integer in the range [0..7]
 * @param {Object} params.data      - actor data as they came form server
 */
function Actor(params) {
	//TODO: add aggressivity flag for the pathfinding, i.e NPC and underlings are not aggressive while monster leaders
	// are
	params = params || {};
	params.data = params.data || {};

	Entity.call(this, params);

	this.actorId     = params.actorId !== undefined ? params.actorId : null;
	this.cellId      = null;  // actor real position (server side)
	this._step       = 0;     // current step in path
	this.path        = [];    // if actor is moving, his path on the map
	this.moving      = false; // is the actor is currently moving ?
	this.animated    = false; // is the actor is currently animated ?
	this.speedAdjust = 0;     // speed adjustment : [-10..10] (-10 = don't move, 0 = 100% speed, +10 = 200% speed)
	this.tints       = null;
	this.data        = {};
	this.groupBoss   = null; // Boss of the group, for underlings
	this.isInvisible = false;
	this.followers   = null;
	this.isFollower  = false;
	this.isLocked    = false;
	this.isRiding    = false;
	this.isDead      = false;

	this.canMoveDiagonally = true;

	// How much the actor hates being isolated from his boss (used by followers)
	this.isolationCoefficient = 0;

	this.pathTween = new Tween(this, ['step']);

	// carrying actor
	this.riderEntity   = null;
	this.carriedActor  = null;
	this.carriedEntity = null;
	this.parentActor   = null;

	// team circle in fight
	this.circleGraphic = null;

	this.icons = {};
	this.realLook = null;

	this.actorManager = params.actorManager;
	this.fighterIndicator = null;
	this._turnNumber = null;
	this.updateData(params.data);
}
inherits(Actor, Entity);
module.exports = Actor;

// Defining getters and setters for updating actor whenever step is tweened
Object.defineProperty(Actor.prototype, 'step', {
	get: function () { return this._step; },
	set: function (step) {
		this._step = step;
		this.forceRefresh();
	}
});

Actor.prototype.setLook = function (look, options, cb, useRealLook) {
	this.realLook = look;  // Real look stores the actors original look before going to creature mode.

	// Testing whether the actor is riding a mount
	var subentities = look.subentities;

	this.isRiding = false;
	if (subentities) {
		for (var s = 0; s < subentities.length; s += 1) {
			var subentity = subentities[s];
			if (subentity.bindingPointCategory === HOOK_POINT_CATEGORY_MOUNT_DRIVER) {
				this.isRiding = true;
				break;
			}
		}
	}

	if (this.actorManager.isCreatureModeOn && !useRealLook) {
		return this.setCreatureLook(options, cb);
	}

	Entity.prototype.setLook.call(this, look, options, cb);
};

Actor.prototype.applyLook = function (lookData) {
	if (this.actorManager.isCreatureModeOn) {
		this.realLook = lookData.look;
		return;
	}

	if (lookData.animationManager && lookData.animationManager !== this.animationManager) {
		this.animManager.clear();
		this.setAnimManager(lookData.animationManager);
	}
	this.staticAnim();

	this.look = lookData.look;
};

Actor.prototype.useRealLook = function () {
	this.actorManager.setActorLook(this.actorId, this.realLook, null, true);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update actor data
 *
 * @param {Object} data - raw data comming from server message
 */
Actor.prototype.updateData = function (data) {
	var isoEngine = window.isoEngine;

	// by default, we want to be sure the actor is at the position sent by the server
	var disposition = data.disposition;
	if (disposition) {
		var updatePosition = true;

		if (window.actorManager.paused && window.actorManager.userActor !== this) {
			this.position = disposition.cellId;  // Hack: These values can be wrong if the update is called after
			this.cellId = disposition.cellId;   // actor movement, but need to be set to something, or it will explode.
			updatePosition = false;
		}

		// but if the actor is the user and he is already moving in roleplay mode
		if (this.moving && window.actorManager.userActor === this && isoEngine.gameContext === GameContext.ROLE_PLAY) {
			// and we already sent a movement request to the server (GameMapMovementRequestMessage) then
			// we are going to receive one of the following responses in all cases (with user's final position):
			//   - GameMapMovementMessage
			//   - GameMapNoMovementMessage
			// so no need to teleport him anywhere now: let's wait for server's movement request answer
			updatePosition = !isoEngine.isMovementWaitingForConfirmation;
		}

		if (updatePosition) {
			this.setDisposition(disposition.cellId, disposition.direction);
		}
	}

	// Following data types might have `alive` property: GameFightCharacterInformations, GameFightMutantInformations,
	// GameFightMonsterInformations, GameFightMonsterWithAlignmentInformations, GameFightTaxCollectorInformations
	if (data.alive !== undefined) {
		this.isDead = !data.alive;
	}

	if (data.npcId) {
		this.data.npcId   = data.npcId;
		this.data.npcData = data._npcData;
	}

	if (data.name) {
		this.data.name = data.name;
	}

	if (data.contextualId) {
		this.data.actorId = data.contextualId;
	}

	switch (data._type) {
	case 'GameRolePlayCharacterInformations':

		this.data.accountId      = data.accountId;
		this.data.playerId       = data.contextualId;
		this.data.humanoidInfo   = data.humanoidInfo;
		this.data.alignmentInfos = data.alignmentInfos;
		// TODO: remove this hack when we find correct data for speedAdjust
		this.speedAdjust = 5;
		this.processHumanoidOptions();
		break;

	case 'GameRolePlayMutantInformations':
		this.data.accountId    = data.accountId;
		this.data.playerId     = data.contextualId;
		this.data.humanoidInfo = data.humanoidInfo;
		this.data.monsterId    = data.monsterId;
		this.data.powerLevel   = data.powerLevel;
		this.processHumanoidOptions();
		break;

	// TODO: Following data are largely not shared between the messages GameFightMonsterInformations and
	//       GameRolePlayGroupMonsterInformations, so most of them are undefined. Shouldn't we split them?
	case 'GameFightMonsterInformations':
	case 'GameFightMonsterWithAlignmentInformations':
		this.data.isBoss            = data._isBoss;
	case 'GameRolePlayGroupMonsterInformations':
		this.data.ageBonus          = data.ageBonus;
		this.data.contextualId      = data.contextualId;
		this.data.alignmentSide     = data.alignmentSide;
		this.data.hasHardcoreDrop   = data.hasHardcoreDrop;
		this.data.keyRingBonus      = data.keyRingBonus;
		this.data.lootShare         = data.lootShare;
		this.data.staticInfos       = data.staticInfos;
		this.data.isSummon          = data.stats && data.stats.summoned;
		this.data.creatureGenericId = data.creatureGenericId;
		break;

	case 'GameRolePlayPrismInformations':
		this.data.prism         = data.prism;
		this.data.contextualId  = data.contextualId;
		break;

	case 'GameRolePlayTaxCollectorInformations':
		this.data.contextualId       = data.contextualId;
		this.data.taxCollectorAttack = data.taxCollectorAttack;
		var guildIdentity = data.identification.guildIdentity;
		this.data.guild = {
			guildLevel:  data.guildLevel,
			guildEmblem: guildIdentity.guildEmblem,
			guildId:     guildIdentity.guildId,
			guildName:   guildIdentity.guildName
		};
		this.data.taxCollector = {
			lastNameId:  data.identification.lastNameId,
			firstNameId: data.identification.firstNameId
		};
		break;

	case 'FightTeamInformations':
	case 'FightAllianceTeamInformations':
	case 'FightTeamLightInformations':
		this.data.fightId     = data.fightId;
		this.data.teamId      = data.teamId;
		this.data.leaderId    = data.leaderId;
		this.data.teamSide    = data.teamSide;
		this.data.teamTypeId  = data.teamTypeId;
		this.data.teamMembers = data.teamMembers;
		break;

	case 'GameFightCharacterInformations':
		this.data.playerId = data.contextualId;
		break;

	case 'PaddockObject':
		this.data.durability = data.durability;
		break;
	case 'GameRolePlayMountInformations':
		this.data.level = data.level;
		this.data.ownerName = data.ownerName;
		break;
	}
	this.data.type = data._type;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.updateRestrictions = function (restrictions) {
	// At login, userActor humanoidInfo is not set yet
	if (this.data.humanoidInfo) {
		this.data.humanoidInfo.restrictions = restrictions;
	}

	this.canMoveDiagonally = !restrictions.cantWalk8Directions;
	if (this.canMoveDiagonally === false && (this.direction & 1) === 0) {
		var newDirection = this.direction + 1;
		if (newDirection > 7) {
			newDirection = 1;
		}
		this.setDisposition(this.position, newDirection);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.processHumanoidOptions = function () {
	if (this.data.humanoidInfo && this.data.humanoidInfo.options) {
		var options = this.data.humanoidInfo.options;
		for (var i = 0; i < options.length; i++) {
			var option = options[i];
			if (option._type === 'HumanOptionAlliance') {
				this.addConquestIcon(option);
			} else if (option._type === 'HumanOptionFollowers') {
				this.actorManager.addActorFollowers(this, option.followingCharactersLook, true);
			}
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.remove = function () {
	this.removeIcons();
	if (this.pathTween.playing || this.pathTween.starting) {
		this.pathTween.stop();
	}

	this.actorManager._removeActor(this);
	Entity.prototype.remove.call(this);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get fighter corresponding to this actor */
Actor.prototype.getFighter = function () {
	return window.gui.fightManager.getFighter(this.actorId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get data of a fighter */
Actor.prototype.getFighterData = function () {
	var fighter = this.getFighter();
	if (!fighter) {
		//TODO: fix me that should be an error
		console.warn('Fighter ' + this.actorId + ' could not be found.');
		return new FighterData();
	}
	return fighter.data;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/main.js
 ** module id = 610
 ** module chunks = 0
 **/