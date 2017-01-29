var Actor                                = require('Actor');
var gameOptions                          = require('gameOptions');
var mapPoint                             = require('mapPoint');
var pathFinder                           = require('pathFinder');
var GameContextEnum                      = require('GameContextEnum');
var constants                            = require('constants');
var CustomAnimationWhiteListEnum         = require('./CustomAnimationWhiteListEnum.js');
var GameActionFightInvisibilityStateEnum = require('GameActionFightInvisibilityStateEnum');
var atouin                               = require('atouin');
var tapFeedback                          = require('tapFeedback');
var FighterIndicator                     = require('FighterIndicator');


// Followers movement constants
var OCCUPATION_APPEAL              = 1 / 1000;
var FOLLOWER_BOSS_APPEAL           = 1.5;
var FOLLOWER_MOVING_FREQUENCY      = 0.38;
var UNDERLING_ISOLATION_COEFF      = 0.002; // The smaller the number the more isolated
var HUMAN_FOLLOWER_ISOLATION_COEFF = 0.5; // A follower following a human is much more likely to hate being isolated
var UNDERLING_AUDIO_VOLUME         = 0.2;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class ActorManager
 *
 * @author  Cedric Stoquer
 */
function ActorManager(params) {
	var self = this;
	Actor.prototype.actorManager = this;
	this.isoEngine = params.isoEngine;
	this.scene = params.scene;

	// In transparent mode the actors are initialized
	// with different layer and alpha values
	this.isTransparentModeOn = false;
	this.isCreatureModeOn    = false;

	this.paused = true;

	// References to actors in the map.
	// The followings 3 properties stores the same objects, with different lookup methods.
	this.actors        = {}; // list of actors (without userActor), key is actorId.
	this.occupiedCells = {}; // cell occupied by actors
	this.followers     = []; // Can be either underlings or human followers

	this.customAnimMethods = {}; // Custom animation methods with actorId as key

	// User character
	this.userId = 0;
	this.userActor = new Actor({
		data: { _type: 'GameRolePlayCharacterInformations' },
		scene: this.scene,
		actorManager: this
	});

	this.userActor.setWhiteListedness(true);

	this.isoEngine.on('GameFightSynchronizeMessage', function (msg) {
		var fighters = msg.fighters;
		for (var i = 0, len = fighters.length; i < len; i++) {
			var fighter = fighters[i];
			if (!fighter.alive) { continue;	}
			var id = fighter.contextualId;
			var actor = self.getActor(id);
			if (!actor) {
				self.addEmptyActor(fighter);
				continue;
			}

			// update position
			var cellId = fighter.disposition.cellId;
			if (cellId !== -1 && actor.cellId !== cellId && !actor.moving) {
				actor.setDisposition(cellId, null);
			}
			// TODO: disposition.direction values seems incorrect, investigate.
			// TODO: also update look
		}
	});

	this.isoEngine.on('GameContextCreateMessage', function (msg) {
		// when switching from fight mode to roleplay, all actors animation must be cleared
		if (msg.context === GameContextEnum.ROLE_PLAY) {
			self.cleanupActorAnimations();
		}
	});
	this.fighterIndicator = null;
	this._onIdAdded = {};
}

module.exports = ActorManager;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove invisibility of all actors */
ActorManager.prototype.removeInvisibilityOfAllActors = function () {
	var visibleCode = GameActionFightInvisibilityStateEnum.VISIBLE;
	this.userActor.setInvisibility(visibleCode);
	for (var id in this.actors) {
		this.actors[id].setInvisibility(visibleCode);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove all additionnal animations from all actors */
ActorManager.prototype.cleanupActorAnimations = function () {
	this.userActor.cleanupAnimations();
	for (var id in this.actors) {
		this.actors[id].cleanupAnimations();
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get actor with provided contextual id
 *
 * @param {number} actorId - actor's contextual id
 */
ActorManager.prototype.getActor = function (actorId) {
	var actor = (actorId === this.userId) ? this.userActor : this.actors[actorId];
	return actor;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get actor with provided NPC id
 *
 *  @param {number} npcId - e.g. 889 for Fattumy's Waitress. -1 means "any NPC on the map"
 *  @return {object|null} the actor data or null if NPC not found
 */
ActorManager.prototype.getActorFromNpcId = function (npcId) {
	var actors = this.actors;

	for (var actorId in actors) {
		var actor = actors[actorId];
		var actorData = actor.data || {};
		// skip if not a NPC:
		if (!actorData.npcId) { continue; }
		// we found it if npcId is a match OR if any NPC is fine
		if (actorData.npcId === npcId || npcId === -1) {
			return actor;
		}
	}
	return null; // not found
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get actor with provided monster id; if more than 1 monster with this ID, any of them is returned.
 *
 *  @param {number} monsterId - e.g. 124 for Vampyre Master. -1 means "any monster on the map"
 *  @return {object|null} the actor data or null if monster not found
 */
ActorManager.prototype.getActorFromMonsterId = function (monsterId) {
	var actors = this.actors;

	for (var actorId in actors) {
		var actor = actors[actorId];
		var actorData = actor.data || {};
		var staticInfos = actorData.staticInfos;
		// skip if not a main monster:
		if (!staticInfos || !staticInfos.mainCreatureLightInfos) { continue; }
		// we found it if creatureGenericId is a match OR if any monster is fine
		if (staticInfos.mainCreatureLightInfos.creatureGenericId === monsterId || monsterId === -1) {
			return actor;
		}
	}
	return null; // not found
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get actor data
 *
 * @param {number}   id - actor's contextual id
 * @param {Function} cb - callback function to return data thru webviews using wizMessenger.
 */
ActorManager.prototype.getActorData = function (id, cb) {
	var actor = this.getActor(id);
	if (!actor) { return cb(new Error('actorNotFound')); }
	return cb(null, actor.data);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ActorManager.prototype.pause = function () {
	this.paused = true;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ActorManager.prototype.unpause = function () {
	this.paused = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get user's character data from server on login and store it
 *
 * @param {Object}   infos - informations data on player's character
 * @param {Object}   models - preloaded models
 *
 * @param {number}   infos.id    - player id
 * @param {number}   infos.level - player level
 * @param {string}   infos.name  - player name
 * @param {number}   infos.breed - ?
 * @param {boolean}  infos.sex   - female if true, male if false
 * @param {Object}   infos.entityLook - character display information object
 *
 * @param {number}   infos.entityLook.bonesId       - bones id
 * @param {number[]} infos.entityLook.skins         - skins ids
 * @param {number[]} infos.entityLook.indexedColors - color used to tint character
 * @param {number[]} infos.entityLook.scales        - scales
 * @param {object[]} infos.entityLook.subentities   - actor subentities
 */
ActorManager.prototype.setUserCharacterData = function (infos) {
	var id   = infos.id;
	var look = infos.entityLook;

	this.userId = id;
	this.userActor.actorId = id;
	this.userActor.actorManager = this;
	this.userActor.data.name = infos.name;
	this.userActor.data.playerId = id;

	this.setActorLook(id, look);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Change which actor is controled by user. Actor should exist.
 *
 * @param {number} id - actor id
 */
ActorManager.prototype.switchUserActor = function (id) {
	if (this.userId === id) { return; }
	var actor = this.getActor(id);
	if (!actor) { return console.error('switchUserActor: No actor with id', id); }
	// add current user actor in actors pool
	var wasDead = false;
	if (!this.userActor.isDead) {
		this.actors[this.userId] = this.userActor;
	} else {
		wasDead = true;
	}
	// switch user actor
	this.userId = id;
	this.userActor = actor;
	delete this.actors[id];
	if (!wasDead) {
		window.isoEngine.tryDisplayUserMovementZone();
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Create and assign animation manager to an actor
 *
 * @param {number}    actorId       - actor id
 *
 * @param {Object}    look          - actor look description
 * @param {number}    look.bonesId  - bones id
 * @param {number[]}  look.skins    - array of skin ids
 * @param {number[]}  look.scales   - scale on x (and y)
 * @param {number[]}  look.indexedColors - an array of indexed colors
 * @param {Object[]}  look.subentities   - character subentities
 * @param {Function}  cb - optional asynchronous callback function
 */
ActorManager.prototype.setActorLook = function (actorId, look, cb, useRealLook) {
	var actor = this.getActor(actorId);
	if (!actor) {
		//FIXME: the map is not ready and we received a GameContextRefreshEntityLookMessage
		console.warn('setActorLook: No actor with id', actorId);
		return cb && cb();
	}

	if (actor.animated) {
		// TODO: wait for the end of current animation to set the look
		return;
	}

	actor.riderEntity = null; // reset rider entity
	actor.setLook(look, {}, function () {
		var animManager = actor.animManager;
		if (actor.isFollower) {
			animManager.audioVol = UNDERLING_AUDIO_VOLUME;
		}

		// Actual look can differ from given look
		// if creature mode is on
		var actualActorLook = actor.look;

		// Setting static animation
		// If character bones id is 1 then use static animation corresponding to actor's skin
		// Otherwise use default static animation
		if (actualActorLook.bonesId === 1 && actualActorLook.skins && actualActorLook.skins[0] &&
			CustomAnimationWhiteListEnum[actualActorLook.skins[0]]
		) {
			// adding a modifier to translate symbol 'AnimStatique' to static animation id with respect to actor body skin
			animManager.addAnimationModifier('AnimStatique', 'AnimStatique' + actualActorLook.skins[0]);
		}

		// check if actor is a subentity of another actor (carried entity)
		var parentActor = actor.parentActor;
		if (parentActor) {
			parentActor.carriedEntity.setAnimManager(animManager);
			parentActor.staticAnim();
		} else {
			actor.staticAnim();
		}

		if (!look._icons) { return cb && cb(); }
		for (var i = 0; i < look._icons.length; i++) {
			actor.addIcon(look._icons[i]);
		}

		return cb && cb();
	}, useRealLook);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Generate list of indexed actors
 */
ActorManager.prototype.getIndexedVisibleActors = function () {
	var indexedActors = {};
	for (var id in this.actors) {
		if (!this.actors[id].isInvisible) {
			indexedActors[this.actors[id].cellId] = this.actors[id];
		}
	}
	indexedActors[this.userActor.cellId] = this.userActor;
	return indexedActors;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ActorManager.prototype.removeAllActors = function () {
	this.cleanupActorAnimations();
	for (var id in this.actors) {
		this.actors[id].removeTeamCircle();
		this.actors[id].remove();
	}

	this.actors        = {};
	this.occupiedCells = {};
	this.followers     = [];

	this.customAnimMethods = {};
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get map information data from server
 *
 * @param {Object} data - map information data
 *
 * @param {number} data.mapId     - map id
 * @param {number} data.subAreaId - ?
 * @param {Array}  data.fights    - ?
 * @param {Array}  data.houses    - ?
 * @param {Array}  data.obstacles - ?
 * @param {Array}  data.interactiveElements - list of interactive elements in the map (e.g. NPC, objects, doors)
 * @param {Array}  data.statedElements      - information of interactive elements (state, cellId)
 *
 * @param {Array}  data.actors          - all actors in the map (i.e. players, monsters, npc)
 * @param {Object} data.actors[*]       - actor definition object
 * @param {number} data.actors[*].contextualId - Actor id. If > 0 then it's a player id. If < 0 then it's a monster
 * @param {Object} data.actors[*].disposition  - Disposition of the actor in the map
 * @param {number} data.actors[*].disposition.cellId    - cell id where actor is positioned
 * @param {number} data.actors[*].disposition.direction - direction the actor is facing, integer in the range [1..8]
 * @param {number} data.actors[*].look - entity look
 */
ActorManager.prototype.updateMapInfoData = function (data) {
	var userActor = this.userActor;
	userActor.show();

	// if we are in fight mode (reconnect in fight) then skip updateMap messages
	if (this.isoEngine.gameContext === GameContextEnum.FIGHT) {
		// Making sure we are showing the actor
		return;
	}

	var actors = data.actors;
	var nbActors = actors.length;
	var nbNewActors = 0;

	var a, actor, actorData;
	for (a = 0; a < nbActors; a++) {
		actorData = actors[a];
		actor = this.getActor(actorData.contextualId);
		if (!actor) {
			nbNewActors += 1;
		}

		var underlings = actorData.staticInfos && actorData.staticInfos.underlings;
		nbNewActors += underlings ? underlings.length : 0;
	}

	this.checkCreatureMode(nbNewActors);

	// create all actors
	for (a = 0; a < nbActors; a++) {
		actorData = actors[a];
		var actorId   = actorData.contextualId;

		if (actorId === this.userId) {
			userActor.removeIcons();
			this.isoEngine.userPreviousPosition = actorData.disposition.cellId;
		}

		actor = this.getActor(actorId);
		if (!actor) {
			actor = this.addEmptyActor(actorData);
		} else {
			actor.updateData(actorData);
		}

		this.setActorLook(actorId, actorData.look);

		// actor underlings
		if (actorData.staticInfos && actorData.staticInfos.underlings) {
			this.addActorFollowers(actor, actorData.staticInfos.underlings);
		}

		if (actorData._type === 'GameRolePlayNpcWithQuestInformations') {
			actor.addQuestIcon(actorData.questFlag);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Handles the MapNpcsQuestStatusUpdateMessage: tells us which NPC has an icon and which doesn't.
 *  @param {MapNpcsQuestStatusUpdateMessage} msg - contains: mapId, npcsIdsWithQuest, questFlags, npcsIdsWithoutQuest
 */
ActorManager.prototype.updateQuestIcons = function (msg) {
	if (msg.mapId !== this.isoEngine.mapRenderer.mapId) { return; }

	var noIconNpcs = msg.npcsIdsWithoutQuest;
	var actor;
	for (var i = 0; i < noIconNpcs.length; i++) {
		actor = this.getActor(noIconNpcs[i]);
		if (actor) {
			actor.removeQuestIcon();
		}
	}
	var iconNpcs = msg.npcsIdsWithQuest;
	for (i = 0; i < iconNpcs.length; i++) {
		actor = this.getActor(iconNpcs[i]);
		if (actor) {
			actor.addQuestIcon(msg.questFlags[i]);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** A new actor shows up on the map
 *
 *  actor data can comes from one of the following messages:
 *     ~ GameRolePlayShowActorMessage
 *     ~ GameFightShowFighterMessage
 *
 * @param {Object}  actorData                       - actor data received from server.
 * @param {number}  actorData.contextualId          - Actor id (positive means it is a Player, negative a monster)
 * @param {Object}  actorData.look                  - Rendering informations
 * @param {Object}  actorData.disposition           - position on the map
 * @param {number}  actorData.disposition.cellId    - Cell id the actor is standing on
 * @param {number}  actorData.disposition.direction - direction the actor is facing
 * @param {number}  [actorData.disposition.carryingCharacterId] - carrying character
 *
 * @param {Object}  actorData.staticInfos - static infos
 *
 * @param {Object}  [models]
 *
 * @param {Function} [cb] - optionnal asynchronous callback function
 */
ActorManager.prototype.addActor = function (actorData, cb) {
	var self = this;
	var actorId = actorData.contextualId;

	// check if actor already exist.
	var actor = this.getActor(actorId);
	if (actor) {
		actor.updateData(actorData);
	} else {
		actor = this.addEmptyActor(actorData);
	}

	// Create an animation manager for this actor and assign it when ready
	this.setActorLook(actorId, actorData.look, function () {
		if (actorData.staticInfos && actorData.staticInfos.underlings) {
			self.addActorFollowers(actor, actorData.staticInfos.underlings);
		}
		var carryingCharacterId = actorData.disposition && actorData.disposition.carryingCharacterId;
		if (carryingCharacterId) {
			var carrier = self.getActor(carryingCharacterId);
			if (carrier) { carrier.carryCharacter(actor); }
		}
		return cb && cb(self.actors[actorId]);
	});
	var fighter = actor.getFighter();
	if (window.gui.playerData.isFighting && !actor.isFollower && fighter) {
		actor.addTeamCircle();
	}

	this.addedActor(actor.actorId);

	return actor;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a new actor with void animation manager
 *
 * @param {Object}  actorData                       - actor data.
 * @param {number}  actorData.contextualId          - Actor id (positive means it is a Player, negative a monster)
 * @param {Object}  actorData.disposition           - position on the map
 * @param {number}  actorData.disposition.cellId    - Cell id the actor is standing on
 * @param {number}  actorData.disposition.direction - direction the actor is facing
 */
ActorManager.prototype.addEmptyActor = function (actorData) {
	var actorId = actorData.contextualId;

	// don't create a new actor if actor already exist
	var actor = this.getActor(actorId);
	if (actor) { return actor; }

	var disposition = actorData.disposition;
	var position    = disposition.cellId;
	var direction   = disposition.direction;

	actor = new Actor({
		actorId:   actorId,
		position:  position,
		cellId:    position,
		direction: direction,
		data:      actorData,
		scene:     this.scene,
		layer:     this.isTransparentModeOn ? constants.MAP_LAYER_TRANSPARENT : constants.MAP_LAYER_PLAYGROUND,
		alpha:     this.isTransparentModeOn ? constants.TRANSPARENT_MODE_ALPHA : 1,
		actorManager: this
	});
	this.actors[actorId] = actor;

	actor.setDisposition(position, direction);
	return actor;
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Making sure an actor can be removed before triggering removal
 *
 * @param {number} actorId - id of actor to remove.
 */
ActorManager.prototype.removeActor = function (actorId) {
	var self = this;
	var actor;

	// if actor is user, don't remove it
	if (actorId === this.userId) {
		actor = this.userActor;
		if (!actor.isDead) {
			return;
		}
	} else {
		actor = this.actors[actorId];
	}

	if (!actor) { return console.warn('[ACTOR MANAGER] removeActor: actor not found', actorId); }

	// if actor is moving, wait the end of movement before removing it.
	if (actor.moving) {
		actor.pathTween.onceFinish(function () {
			self.removeActor(actorId);
		});
		return;
	}

	// Will have the effect of removing the actor sprite
	// and all the reference to the actor in the actorManager
	actor.remove();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove an actor from the map. Remove all references to this actor from actorManager.
 *  There are 2 places where an actor reference is kept and from which it has to be removed:
 *   ~ this.actors
 *   ~ this.occupiedCells
 *
 * @param {number} actor - actor to remove.
 */
ActorManager.prototype._removeActor = function (actor) {
	if (actor.fighterIndicator) {
		actor.fighterIndicator.remove();
	}
	actor.removeTurnNumber();
	var actorId = actor.actorId;
	this.removeActorOccupation(actor);

	if (this.customAnimMethods[actorId]) {
		delete this.customAnimMethods[actorId];
	}
	actor.removeTeamCircle();
	delete this.actors[actorId];

	// remove actor followers
	if (actor.followers) {
		var followers = actor.followers;
		var followerIds = [];
		for (var i = 0; i < followers.length; i++) {
			var follower = followers[i];
			followerIds.push(follower.actorId);

			// Removing follower in O(number of followers)
			// It should happen rarely enough
			var followerIdx = this.followers.indexOf(follower);
			if (followerIdx !== -1) { this.followers.splice(followerIdx, 1); }
		}
		this.removeActors(followerIds);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** RemoveActors - Remove a list of actors from map
 *
 * @param {number[]} actorIds - ids of actor to remove.
 */
ActorManager.prototype.removeActors = function (actorIds) {
	for (var i = 0, len = actorIds.length; i < len; i++) {
		this.removeActor(actorIds[i]);
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ActorManager.prototype.resetActors = function () {
	this.removeAllActors();
	this.userActor.show();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** actorMovement - make actor move on map according to a path.
 *
 * @param {Object}   msg              - GameMapMovementMessage received from server.
 * @param {number}   msg.actorId      - actor id
 * @param {Array}    msg.keyMovements - an array of cellId describing the movement of the actor. e.g. [391,348]
 * @param {boolean} [msg.slide]       - slide movement flag (push/pull in fight)
 * @param {Function} [cb]             - optional asynchronous callback function
 */
ActorManager.prototype.actorMovement = function (msg, cb) {
	var actorId = msg.actorId;
	var keyMovements = msg.keyMovements;
	var finalPosition = keyMovements[keyMovements.length - 1];
	var isoEngine = window.isoEngine;

	if (isoEngine.gameContext === GameContextEnum.ROLE_PLAY && actorId === this.userId) {
		// NB: in roleplay cb is always empty
		return isoEngine.roleplayUserActorMovement(keyMovements);
	}

	var actor = this.getActor(actorId);
	if (!actor) {
		// actor doesn't exist yet, we create an empty actor to store its position, and skip animation
		this.addEmptyActor({ contextualId: actorId, disposition: { cellId: finalPosition, direction: 1 } });
		return cb && cb();
	}

	actor.setCellPosition(finalPosition);

	if (this.paused) {
		actor.position = finalPosition;
		return cb && cb();
	}

	// create and launch animation to make the actor moves
	if (keyMovements.length === 2) {
		keyMovements = pathFinder.normalizePath(keyMovements);
	}

	if (keyMovements.length > 1) {
		if (this.isoEngine.mapRenderer.isReady) {
			// create and trigger character animation
			actor.setPath(keyMovements, { slide: msg.slide, cb: cb });
		} else {
			actor.setDisposition(finalPosition);
		}
	} else {
		return cb && cb();
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** setActorsDisposition - update position and direction of actors on map.
 *
 * @param {Array}   dispositions - dispositions of actors to update.
 *        {number}  dispositions[*].id         - id of actor to update position
 *        {number} [dispositions[*].cellId]    - position of actor on map, optional
 *        {number}  dispositions[*].direction  - direction actor is facing
 */
ActorManager.prototype.setActorsDisposition = function (dispositions, isFightSync) {
	for (var i = 0, len = dispositions.length; i < len; i++) {
		var disposition = dispositions[i];
		// Actors may be out of map if they are not displayed, eg: spectators
		if (disposition.cellId === -1) {
			continue;
		}

		var actorId = disposition.id;
		var actor = this.getActor(actorId);
		if (!actor) {
			// don't create an actor if we are in fight synchronization
			if (isFightSync) { continue; }
			// don't create an empty actor if we don't know his position.
			if (!disposition.cellId && disposition.cellId !== 0) { continue; }
			// don't create actor if it's a dead fighter
			var fighter = window.gui.fightManager.getFighter(actorId);
			if (fighter && fighter.data && !fighter.data.alive) { continue; }
			// create an empty actor
			actor = this.addEmptyActor({ contextualId: actorId, disposition: disposition });
		}

		if (actor.cellId === disposition.cellId && actor.direction === disposition.direction) {
			// Actor already is at the correct position
			continue;
		}

		actor.setDisposition(disposition.cellId, disposition.direction);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove actor from list of occupied cells
 */
ActorManager.prototype.removeActorOccupation = function (actor) {
	var cellId = actor.cellId;
	if (cellId !== null) {
		var actorsOnCell = this.occupiedCells[cellId];
		if (actorsOnCell === undefined) { return; }

		var idx = actorsOnCell.indexOf(actor);
		if (idx === -1) {
			console.warn('[ActorManager.removeActorOccupation] Trying to remove an actor from an empty cell', actor);
		} else {
			if (actorsOnCell.length === 1) {
				delete this.occupiedCells[cellId];
			} else {
				actorsOnCell.splice(idx, 1);
			}
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add actor to list of occupied cells
 */
ActorManager.prototype.addActorOccupation = function (actor) {
	var cellId = actor.cellId;
	var actorsOnCell = this.occupiedCells[cellId];
	if (actorsOnCell === undefined) {
		this.occupiedCells[cellId] = [actor];
	} else {
		// Checking that the actor is not already present
		var idx = actorsOnCell.indexOf(actor);
		if (idx === -1) {
			actorsOnCell.push(actor);
		} else {
			console.warn('[ActorManager.addActorOccupation] Trying to add an actor to a cell that it already belongs to', actor);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Computes where to put a follower (either underling or human follower)
// The computed position is accessible from the given cell id
ActorManager.prototype.computeFollowerPosition = function (cellId) {
	var cellPosition = mapPoint.getMapPointFromCellId(cellId);
	cellPosition.i = cellPosition.x;
	cellPosition.j = cellPosition.y;

	var searchEffort = 1;
	while (Math.random() < searchEffort) {
		// Selecting a cell using a roulette wheel system

		// Fetching accessible cells
		var accessibleCells = pathFinder.getAccessibleCells(cellPosition.i, cellPosition.j);
		var nbAccessibleCells = accessibleCells.length;

		// On map -19,35, there is a mob behind a tree whose followers are stuck on the same, inaccessible cell
		if (nbAccessibleCells === 0) {
			break;
		}

		// Pairing an appeal with each cell
		var movesAppeal = [];
		var totalAppeal = 0;
		for (var a = 0; a < nbAccessibleCells; a++) {
			var accessibleCellData = accessibleCells[a];
			var accessibleCellId   = mapPoint.getCellIdFromMapPoint(accessibleCellData.i, accessibleCellData.j);
			var appeal = (this.occupiedCells[accessibleCellId] === undefined) ? 1 : OCCUPATION_APPEAL;
			movesAppeal[a] = appeal;
			totalAppeal   += appeal;
		}

		// Selecting a cell with respect to movesAppeal
		var s = 0;
		var selection = totalAppeal * Math.random() - movesAppeal[0];
		while (selection > 0 && s < nbAccessibleCells) {
			s += 1;
			selection -= movesAppeal[s];
		}

		cellPosition = accessibleCells[(s === nbAccessibleCells) ? s - 1 : s];
		cellId = mapPoint.getCellIdFromMapPoint(cellPosition.i, cellPosition.j);

		// Resetting search effort
		if (this.occupiedCells[cellId]) {
			// If selected cell is occupied, increasing the search effort
			searchEffort = 0.995; // 99.5% chance to keep searching
		} else {
			searchEffort = 0.80; // 80% chance to keep searching
		}
	}

	return cellId;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Add followers to an actor
ActorManager.prototype.addActorFollowers = function (actor, followers, isFollowingHuman) {
	var nbFollowers = followers.length;
	if (nbFollowers === 0 || !gameOptions.showAllMonsters) {
		return;
	}

	if (actor.followers === null) {
		actor.followers = [];
	}

	var actorId = actor.actorId;
	for (var f = 0; f < nbFollowers; f++) {
		var follower      = followers[f];
		var followerId    = actorId + ':follower:' + f;

		var followerActor = this.getActor(followerId);
		if (!followerActor) {
			var followerPos = this.computeFollowerPosition(actor.cellId);
			followerActor = this.addEmptyActor({
				contextualId: followerId,
				disposition: {
					cellId: followerPos,
					direction: 1 + 2 * Math.round(Math.random() * 3)
				}
			});

			followerActor.isFollower = true;

			if (isFollowingHuman === true) {
				followerActor.isolationCoefficient = HUMAN_FOLLOWER_ISOLATION_COEFF;
			} else {
				// The follower is an underling
				followerActor.isolationCoefficient = UNDERLING_ISOLATION_COEFF;
			}

			// Adding follower to actor (group boss)
			actor.followers.push(followerActor);

			// Adding group boss (actor) to follower
			followerActor.groupBoss = actor;
			followerActor.data = actor.data;

			// Adding follower to list of followers currently on the map
			this.followers.push(followerActor);
		}

		// Generating renderer for the follower
		this.setActorLook(followerId, follower.look);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

ActorManager.prototype.addAnimBehaviourToActor = function (actorId, animationMethod) {
	var actor = this.actors[actorId];
	if (!actor) {
		return console.error(new Error('ActorManager.addAnimBehaviourToActor: actor ' + actorId + ' unknown'));
	}
	if (this.customAnimMethods[actorId]) {
		//TODO: fixme DOT-1596
		return console.warn('ActorManager.addAnimBehaviourToActor: actor ' + actorId + ' already has a custom animation');
	}
	if (this.followers.indexOf(actor) !== -1) {
		return console.error(
			new Error('ActorManager.addAnimBehaviourToActor: cannot add an anim behaviour to a follower')
		);
	}
	if (typeof animationMethod !== 'function') {
		return console.error(new Error('ActorManager.addAnimBehaviourToActor: animationMethod is not a function'));
	}
	this.customAnimMethods[actorId] = animationMethod;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Computes where to move a follower
ActorManager.prototype._moveFollower = function (follower) {
	if (follower.moving === true) {
		return;
	}

	var cellId = follower.cellId;

	var followerPos = mapPoint.getMapPointFromCellId(cellId);
	var groupBossPos = mapPoint.getMapPointFromCellId(follower.groupBoss.cellId);

	var ux = followerPos.x;
	var uy = followerPos.y;

	var dx = groupBossPos.x - ux;
	var dy = groupBossPos.y - uy;
	var d  = Math.sqrt(dx * dx + dy * dy);

	// If the follower is not alone on its cell it will try to move out
	if (this.occupiedCells[cellId].length === 1) {
		// Alone on current cell
		// Determine whether to move depending on distance to boss
		var isolationThreshold = 0.95 / (1 + (d - 1) * follower.isolationCoefficient);
		if (follower.groupBoss.moving === true) {
			// If its boss is moving its thereshold gets smaller
			isolationThreshold *= 0.8;
		}

		if (Math.random() < isolationThreshold) {
			return;
		}
	}

	var cellPosition = { i: followerPos.x, j: followerPos.y };
	var path = [cellId];

	var searchEffort = 1;
	var destinationId;
	while (Math.random() < searchEffort) {
		var accessibleCells = pathFinder.getAccessibleCells(cellPosition.i, cellPosition.j);
		var nbAccessibleCells = accessibleCells.length;
		if (nbAccessibleCells === 0) {
			// The follower is on an unaccessible cell
			return;
		}

		// Pairing an appeal with each cell
		var movesAppeal = [];
		var totalAppeal = 0;
		for (var a = 0; a < nbAccessibleCells; a++) {
			var accessibleCellData = accessibleCells[a];
			var accessibleCellId   = mapPoint.getCellIdFromMapPoint(accessibleCellData.i, accessibleCellData.j);

			// Appeal is function of whether an actor is occupying the cell
			var appeal = (this.occupiedCells[accessibleCellId] === undefined) ? 1 : OCCUPATION_APPEAL;

			var di = (accessibleCellData.i - cellPosition.i); // positive if cell.i on direction to boss
			var dj = (accessibleCellData.j - cellPosition.j); // positive if cell.j on direction to boss
			if (di === 0 && dj === 0) {
				// Appeal is function of whether the considered cell is preceding in the path
				appeal *= OCCUPATION_APPEAL * OCCUPATION_APPEAL;
			} else {
				// Appeal is function of the additional distance to the boss
				if (di === 0) {
					// dj is different from 0
					appeal *= Math.pow(FOLLOWER_BOSS_APPEAL, dy / dj);
				} else {
					// dj is equal to 0
					appeal *= Math.pow(FOLLOWER_BOSS_APPEAL, dx / di);
				}
			}

			movesAppeal[a] = appeal;
			totalAppeal   += appeal;
		}

		// Selecting a cell with respect to movesAppeal
		var s = 0;
		var selection = totalAppeal * Math.random() - movesAppeal[0];
		while (selection > 0 && s < nbAccessibleCells) {
			s += 1;
			selection -= movesAppeal[s];
		}

		// New follower cellId
		cellPosition  = accessibleCells[(s === nbAccessibleCells) ? s - 1 : s];
		destinationId = mapPoint.getCellIdFromMapPoint(cellPosition.i, cellPosition.j);
		path.push(destinationId);

		searchEffort = 1 - 1 / (1 + 0.5 * d); // depends on distance to boss
	}

	follower.setCellPosition(destinationId);
	follower.setPath(path);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Move all the followers
// TODO: - we may want to implement an animationMethod on actor and call it from here
//         will be most likely done when we will implement animFun
//       - we may try to not trigger this method every frame
//         (like triggering only one actor's animation method per frame)
ActorManager.prototype.refresh = function () {
	for (var actorId in this.customAnimMethods) {
		this.customAnimMethods[actorId]();
	}

	var followersNb = this.followers.length;
	if (followersNb > 0) {
		// Frequency of movement of followers depends
		// on the number of actors on the screen
		var nbActors = Object.keys(this.actors).length;
		if (Math.random() > Math.min(0.1, FOLLOWER_MOVING_FREQUENCY / nbActors)) {
			return;
		}

		// Moving followers
		for (var u = 0; u < followersNb; u++) {
			this._moveFollower(this.followers[u]);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update aggressable status of specified actors and conquest icons accordingly
 * @param {Array} actorIds - ids of actors to update.
 *        {Array} statuses - statuses of actors to update
 */
ActorManager.prototype.updateActorsAggressableStatus = function (actorIds, statuses) {
	for (var i = 0; i < actorIds.length; i++) {
		var id = actorIds[i];
		var status = statuses[i];
		var actor = this.getActor(id);
		if (!actor || !actor.data.humanoidInfo || !actor.data.humanoidInfo.options) {
			continue;
		}
		var options = actor.data.humanoidInfo.options;
		for (var j = 0; j < options.length; j++) {
			var option = options[j];
			if (option._type === 'HumanOptionAlliance') {
				option.aggressable = status;
				actor.addConquestIcon(option);
				break;
			}
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a smiley icon above an actor
 * @param {number} actorId  - id of actor which has a smiley.
 * @param {number} smileyId - if of the smiley to display
 */
ActorManager.prototype.addSmileyOnActor = function (actorId, smileyId) {
	var actor = this.getActor(actorId);
	if (!actor) { return; }
	actor.addSmileyIcon(smileyId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add or remove a sword icon above an actor
 * @param {number} actorId  - id of actor which has a smiley.
 * @param {boolean} [visible] - by default if undefined the icon will be removed
 */
ActorManager.prototype.setReadyIconOnActor = function (actorId, visible) {
	if (visible === undefined) { visible = false; }
	var actor = this.getActor(actorId);
	if (!actor) {
		return;
	}
	if (visible) {
		actor.addReadyIconOnActor();
	} else {
		actor.removeReadyIconOnActor();
	}
};

ActorManager.prototype.removeReadyIcon = function () {
	var actorIds = Object.keys(this.actors);
	var actorIdsLength = actorIds.length;
	for (var i = 0; i < actorIdsLength; i++) {
		var actor = this.actors[actorIds[i]];
		actor.removeReadyIconOnActor();
	}
	this.userActor.removeReadyIconOnActor();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Switch mode to transparent or not transparent
 * Layer and alpha of actors depends on the transparent mode
 * @param {boolean} transparent - Whether to turn transparent mode on
 */
ActorManager.prototype.setTransparentMode = function (transparent) {
	if (this.isTransparentModeOn === transparent) {
		// Transparent mode has not changed
		return;
	}

	// Choosing layer and alpha values with respect to transparent mode
	var layer, alpha;
	if (transparent) {
		layer = constants.MAP_LAYER_TRANSPARENT;
		alpha = constants.TRANSPARENT_MODE_ALPHA;
	} else {
		layer = constants.MAP_LAYER_PLAYGROUND;
		alpha = 1;
	}

	// Setting these layer and alpha values to all the actors
	for (var id in this.actors) {
		var actor = this.actors[id];
		actor.layer = layer;
		actor.alpha = alpha;
	}
	this.userActor.layer = layer;
	this.userActor.alpha = alpha;

	// Updating state (transparent or not) of the actor manager
	this.isTransparentModeOn = transparent;
};

ActorManager.prototype.checkCreatureMode = function (nbNewActors) {
	var nbActors = Object.keys(this.actors).length + nbNewActors + 1;
	var shouldCreatureModeBeOn = gameOptions.maxActorsBeforeCreatureMode < nbActors;
	this.setCreatureMode(shouldCreatureModeBeOn);
};

ActorManager.prototype.onMaxActorsBeforeCreatureModeChange = function (maxActorsBeforeCreatureMode) {
	var nbActors = Object.keys(this.actors).length + 1;
	var shouldCreatureModeBeOn = maxActorsBeforeCreatureMode < nbActors;
	this.setCreatureMode(shouldCreatureModeBeOn);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** set all actor into creature mode */
ActorManager.prototype.setCreatureMode = function (on) {
	if (on === this.isCreatureModeOn) { return; }
	if (!on) { return this._exitCreatureMode();	}
	this.isCreatureModeOn = true;

	for (var id in this.actors) {
		var actor = this.actors[id];
		actor.setCreatureLook();
		if (actor.fighterIndicator) {
			actor.fighterIndicator.y = actor.bbox[2] - actor.y;
		}
	}
	this.userActor.setCreatureLook();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ActorManager.prototype._exitCreatureMode = function () {
	if (!this.isCreatureModeOn) { return; }
	this.isCreatureModeOn = false;

	for (var id in this.actors) {
		var actor = this.actors[id];
		actor.useRealLook();
		if (actor.fighterIndicator) {
			actor.fighterIndicator.y = actor.bbox[2] - actor.y;
		}
	}

	this.userActor.useRealLook();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
ActorManager.prototype.getPlayers = function (includeSelf) {
	var list = [];
	for (var id in this.actors) {
		var actor = this.actors[id];
		if (actor.data && (actor.data.playerId || actor.data.playerId === 0)) {
			list.push(actor);
		}
	}
	if (includeSelf) {
		list.push(this.userActor);
	}
	return list;
};

ActorManager.prototype.turnIndicatorOff = function () {
	window.isoEngine.mapRenderer.removeMovementFeedback();
};

ActorManager.prototype.turnIndicatorOn = function (fighter) {
	this.turnIndicatorOff();
	var actor = this.getActor(fighter.id);
	if (actor) {
		var team = actor.getFighterData().teamId;
		var cellId = fighter.data.disposition.cellId;
		if (cellId !== -1 && window.isoEngine.mapRenderer.map) {
			var coords = atouin.cellCoord[cellId];
			tapFeedback.addTurnFeedback({ x: coords.x, y: coords.y, position: cellId }, team);
		}
	}
};

ActorManager.prototype.removeTeamCircles = function () {
	this.userActor.removeTeamCircle();
	for (var i = 0; i < this.actors.length; i++) {
		var actor = this.actors[i];
		actor.removeTeamCircle();
	}
};

ActorManager.prototype.selectionIndicatorOff = function (fighter) {
	var actor = this.getActor(fighter.id);
	if (actor && actor.fighterIndicator) {
		actor.fighterIndicator.remove();
	}
};

ActorManager.prototype.selectionIndicatorOn = function (fighter) {
	var actor = this.getActor(fighter.id);
	if (actor) {
		if (actor.fighterIndicator) {
			actor.fighterIndicator.remove();
		}
		if (fighter.data.disposition.cellId !== -1) {
			actor.fighterIndicator = new FighterIndicator(actor.x, actor.bbox[2] - 12);
		}
	}
};

ActorManager.prototype.removeAllFighterIndicators = function () {
	if (this.userActor.fighterIndicator) {
		this.userActor.fighterIndicator.remove();
	}
	for (var i = 0; i < this.actors.length; i++) {
		var actor = this.actors[i];
		if (actor.fighterIndicator) {
			actor.fighterIndicator.remove();
		}
	}
};

ActorManager.prototype.turnNumberOn = function (id, turnNumber) {
	var self = this;
	var actor;
	if (id === this.userActor.actorId) {
		actor = this.userActor;
	} else {
		actor = this.actors[id];
	}
	if (actor) { // there is a race here
		addNumber(id, actor);
	} else {
		this._onIdAdded[id] = addNumber;
	}

	function addNumber(id, actor) {
		if (!actor) {
			if (id === self.userActor.actorId) {
				actor = self.userActor;
			} else {
				actor = self.actors[id];
			}
		}
		if (turnNumber === '') {
			actor.removeTurnNumber();
		} else {
			actor.addTurnNumber(turnNumber);
		}
	}
};

// fighters can sometimes be loaded before actors, so sometimes we need to defer exec
ActorManager.prototype.addedActor = function (actorId) {
	var actorLoadedFunc = this._onIdAdded[actorId];
	if (actorLoadedFunc) {
		actorLoadedFunc(actorId);
		delete this._onIdAdded[actorId];
	}
};

ActorManager.prototype.allTurnNumbersOff = function () {
	for (var actor in this.actors) {
		this.actors[actor].removeTurnNumber();
	}
	this.userActor.removeTurnNumber();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameFightRefreshFighterMessage
 * @desc A character need to have his look and disposition refreshed
 * @param {Object} msg - GameFightRefreshFighterMessage
 */
ActorManager.prototype.refreshFighter = function (msg) {
	var actor = window.actorManager.getActor(msg.informations.contextualId);
	if (actor) {
		window.gui.transmitFightSequenceMessage(msg);
		actor.setDisposition(msg.informations.disposition.cellId, msg.informations.disposition.direction);
		var options = {};
		actor.setLook(msg.informations.look, options, function () {
			actor.applyLook({ look: msg.informations.look });
		});
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/ActorManager/index.js
 ** module id = 1029
 ** module chunks = 0
 **/