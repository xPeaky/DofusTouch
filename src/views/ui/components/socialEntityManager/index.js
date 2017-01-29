var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;

var taxCollectorHelper = require('./taxCollector.js');
var TaxCollector = taxCollectorHelper.TaxCollector;

var prismHelper = require('./prism.js');
var Prism = prismHelper.Prism;

var entityManager = module.exports = new EventEmitter();

var enums = require('./enums.js');
var fightState = entityManager.fightState = enums.fightState;
var fightingSide = entityManager.fightingSide = enums.fightingSide;
var entityType = entityManager.entityType = enums.entityType;

var fights, entities;

entityManager._reset = function () {
	fights = entityManager.fights = {};
	fights[entityType.taxCollector] = {};
	fights[entityType.prism] = {};

	entities = entityManager.entities = {};
	entities[entityType.taxCollector] = {};
	entities[entityType.prism] = {};
};


function addFight(type, fightId, fightData) {
	fightData = fightData || {};

	var entity = entities[type][fightId] || {};

	var fight = fights[type][fightId] = {
		id: fightId,
		type: type,
		fighters: {},
		state: entity.fightState,
		waitingForHelpInfo: entity.waitingForHelpInfo
	};

	fight.fighters[fightingSide.allies] = fightData.allyCharactersInformations || [];
	fight.fighters[fightingSide.enemies] = fightData.enemyCharactersInformations || [];

	entityManager.emit('fightStarted', type, fight);

	if (fightData.state === fightState.fighting) {
		entityManager.emit('fighting', type, fight);
	}

	return fight;
}

entityManager.isPlayerDefending = function (type, playerId) {
	if (!entityType[type]) { return console.log('unknown entity type', type); }

	var fights = entityManager.fights[type];
	for (var fightId in fights) {
		var fight = fights[fightId];

		if (fight.state !== fightState.waitingForHelp ||
			!entityManager.isPlayerFightingFor(playerId, type, fightId, fightingSide.allies)) {
			continue;
		}

		return parseInt(fightId, 10);
	}

	return null;
};

entityManager.getAttackedEntity = function (fight) {
	if (!fight.type || !fight.hasOwnProperty('id') || !entityType[fight.type]) {
		return console.log('wrong fight object');
	}

	return entityManager.entities[fight.type][fight.id];
};

entityManager.isPlayerFightingFor = function (playerId, type, fightId, side) {
	if (!entityType[type]) { return console.log('unknown entity type', type); }

	var fight = fights[type][fightId];
	if (!fight) {
		return false;
	}

	var fighters = fight.fighters[side];
	for (var i = 0, len = fighters.length; i < len; i += 1) {
		if (fighters[i].id === playerId) {
			return true;
		}
	}

	return false;
};

var kickRequest = null;
entityManager.playerAutoKick = function (type, fightId) {
	if (!entityType[type]) { return console.log('unknown entity type', type); }
	var playerId = window.gui.playerData.id;

	if (type === entityType.taxCollector) {
		window.dofus.sendMessage('GuildFightLeaveRequestMessage', { taxCollectorId: fightId, characterId: playerId });
	} else {
		window.dofus.sendMessage('PrismFightJoinLeaveRequestMessage', { subAreaId: fightId, join: false });
	}

	kickRequest = {
		type: type,
		fightId: fightId,
		playerId: playerId
	};
};

entityManager.initialize = function (gui) {
	entityManager._reset();

	gui.on('disconnect', function () {
		entityManager._reset();
	});

	taxCollectorHelper.setupEvents();
	gui.on('TaxCollectorListMessage', function (msg) {
		var taxCollectorInfoList = msg.informations;
		var taxCollectors = entities.taxCollector;

		var i;
		for (i = 0; i < taxCollectorInfoList.length; i += 1) {
			var taxCollector = new TaxCollector(taxCollectorInfoList[i]);
			taxCollectors[taxCollector.id] = taxCollector;
		}

		entityManager.emit('entityList', entityType.taxCollector, taxCollectorInfoList, msg.nbcollectorMax);

		var fightersInfoList = msg.fightersInformations;
		for (i = 0; i < fightersInfoList.length; i += 1) {
			var fightInfo = fightersInfoList[i];
			addFight(entityType.taxCollector, fightInfo.collectorId, fightInfo);
		}
	});

	gui.on('TaxCollectorMovementAddMessage', function (msg) {
		var taxCollector = new TaxCollector(msg.informations);

		var taxCollectors = entities.taxCollector;
		var isNew = !taxCollectors.hasOwnProperty(taxCollector.id);
		taxCollectors[taxCollector.id] = taxCollector;

		if (isNew) {
			entityManager.emit('entityAdded', entityType.taxCollector, taxCollector);
			return;
		} else {
			entityManager.emit('entityUpdated', entityType.taxCollector, taxCollector);
		}

		if (taxCollector.fightState === fightState.noFight) {
			removeFight(entityType.taxCollector, taxCollector.id);
		} else {
			var fight = fights[entityType.taxCollector][taxCollector.id];
			if (!fight) {
				return addFight(entityType.taxCollector, taxCollector.id);
			}

			fight.state = taxCollector.fightState;
			fight.waitingForHelpInfo = taxCollector.waitingForHelpInfo;

			if (fight.state === fightState.fighting) {
				entityManager.emit('fighting', entityType.taxCollector, fight);
			}
		}
	});

	gui.on('TaxCollectorMovementRemoveMessage', function (msg) {
		var collectorId = msg.collectorId;
		var taxCollectors = entities.taxCollector;

		if (!taxCollectors[collectorId]) {
			return;
		}

		delete taxCollectors[collectorId];
		entityManager.emit('entityRemoved', entityType.taxCollector, collectorId);
	});

	gui.on('PrismsListMessage', function (msg) {
		var prisms = entities.prism;
		var prismList = msg.prisms;

		for (var i = 0, len = prismList.length; i < len; i += 1) {
			var prism = new Prism(prismList[i]);
			prisms[prism.id] = prism;
		}

		entityManager.emit('entityList', entityType.prism, prismList);
	});

	gui.on('PrismsListUpdateMessage', function (msg) {
		var prisms = entities.prism;
		var prismList = msg.prisms;

		for (var i = 0, len = prismList.length; i < len; i += 1) {
			var prismInfo = prismList[i];
			var prism = prisms[prismInfo.subAreaId];

			if (prism) {
				prism.updateInfo(prismInfo);
				entityManager.emit('entityUpdated', entityType.prism, prism);
			} else {
				prism = new Prism(prismInfo);
				prisms[prism.id] = prism;
				entityManager.emit('entityAdded', entityType.prism, prism);
			}
		}
	});

	gui.on('PrismsInfoValidMessage', function (msg) {
		var fightList = msg.fights;
		var prisms = entities.prism;

		for (var i = 0, len = fightList.length; i < len; i += 1) {
			var fightInfo = fightList[i];
			var prism = prisms[fightInfo.subAreaId];
			if (!prism) {
				console.warning('unknown prism', fightInfo.subAreaId);
				continue;
			}

			// first defender is the prism being attacked. we handle it separately to match the tax collector behavior.
			var firstFighter = fightInfo.allyCharactersInformations[0];
			if (firstFighter && firstFighter.name === '3451') {
				prism.look = firstFighter.entityLook;
				prism.level = firstFighter.level;
				fightInfo.allyCharactersInformations.splice(0, 1);
			}

			// the state of the prism (stored in the entities object) is wrong at this moment. we know these fights are
			// in the 'waitingForHelp' state.
			prism.fightState = fightState.waitingForHelp;

			addFight(entityType.prism, fightInfo.subAreaId, fightInfo);
		}
	});

	gui.on('PrismFightAddedMessage', function (msg) {
		var fightInfo = msg.fight;
		var prism = entities.prism[fightInfo.subAreaId];
		if (!prism) {
			return console.warning('unknown prism', fightInfo.subAreaId);
		}

		addFight(entityType.prism, fightInfo.subAreaId, fightInfo);
	});

	function removeFight(type, fightId) {
		if (!fights[type][fightId]) {
			return;
		}

		delete fights[type][fightId];
		entityManager.emit('fightEnded', type, fightId);
	}


	gui.on('PrismFightRemovedMessage', function (msg) {
		removeFight(entityType.prism, msg.subAreaId);
	});


	function addFighter(type, fightId, side, fighter) {
		var fight = fights[type][fightId];
		if (!fight) {
			return;
		}

		var fighterList = fight.fighters[side];
		fighterList.push(fighter);

		entityManager.emit('fighterJoined', type, fightId, side, fighter, fighterList.length - 1);
	}

	gui.on('GuildFightPlayersHelpersJoinMessage', function (msg) {
		addFighter(entityType.taxCollector, msg.fightId, fightingSide.allies, msg.playerInfo);
	});

	gui.on('PrismFightDefenderAddMessage', function (msg) {
		var defender = msg.defender;
		// the prism being attacked info is passed like any other fighter. it has a special hardcoded name: his monster id
		if (defender.name === '3451') {
			var prism = entities.prism[msg.subAreaId];
			prism.look = defender.entityLook;
			prism.level = defender.level;
			entityManager.emit('fightTarget', entityType.prism, msg.subAreaId, prism);
		} else {
			addFighter(entityType.prism, msg.subAreaId, fightingSide.allies, defender);
		}
	});

	gui.on('PrismFightAttackerAddMessage', function (msg) {
		addFighter(entityType.prism, msg.subAreaId, fightingSide.enemies, msg.attacker);
	});


	function setFighterList(type, fightId, side, fighterList) {
		var fight = fights[type][fightId];
		if (!fight) {
			fight = addFight(type, fightId);
		}

		fight.fighters[side] = fighterList;

		entityManager.emit('fighterList', type, fightId, side, fighterList);
	}

	gui.on('GuildFightPlayersEnemiesListMessage', function (msg) {
		setFighterList(entityType.taxCollector, msg.fightId, fightingSide.enemies, msg.playerInfo);
	});


	function removeFighter(type, fightId, side, fighterId) {
		var fight = fights[type][fightId];
		if (!fight) {
			return;
		}

		var fighterList = fight.fighters[side];
		for (var i = 0, len = fighterList.length; i < len; i += 1) {
			var id = fighterList[i].id;
			if (id === fighterId) {
				fighterList.splice(i, 1);
				entityManager.emit('fighterLeft', type, fightId, side, fighterId, i);
				return;
			}
		}

		return console.error('unknown fighter id', fighterId);
	}

	gui.on('GuildFightPlayersEnemyRemoveMessage', function (msg) {
		removeFighter(entityType.taxCollector, msg.fightId, fightingSide.enemies, msg.playerId);
	});

	gui.on('GuildFightPlayersHelpersLeaveMessage', function (msg) {
		if (kickRequest &&
			kickRequest.type === entityType.taxCollector &&
			kickRequest.fightId === msg.fightId &&
			kickRequest.playerId === msg.playerId) {
			window.gui.chat.logMsg(getText('ui.social.guild.autoFightLeave'));
			kickRequest = null;
		}

		removeFighter(entityType.taxCollector, msg.fightId, fightingSide.allies, msg.playerId);
	});

	gui.on('PrismFightDefenderLeaveMessage', function (msg) {
		if (kickRequest &&
			kickRequest.type === entityType.prism &&
			kickRequest.fightId === msg.subAreaId &&
			kickRequest.playerId === msg.fighterToRemoveId) {
			window.gui.chat.logMsg(getText('ui.prism.AutoDisjoin'));
			kickRequest = null;
		}

		removeFighter(entityType.prism, msg.subAreaId, fightingSide.allies, msg.fighterToRemoveId);
	});

	gui.on('PrismFightAttackerRemoveMessage', function (msg) {
		removeFighter(entityType.prism, msg.subAreaId, fightingSide.enemies, msg.fighterToRemoveId);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/socialEntityManager/index.js
 ** module id = 335
 ** module chunks = 0
 **/