var getText = require('getText').getText;
var staticContent = require('staticContent');
var gameOptions = require('gameOptions');

// enums
var AtlasInfosEnum = require('AtlasInfosEnum');
var CompassTypeEnum = require('CompassTypeEnum');

// const
var ICON_HOUSE = 'icon_1000';
var ICON_GUILD_HOUSE = 'icon_1001';
var ICON_GUILD_PADDOCK = 'icon_1002';
var ICON_FLAG_PHOENIX = 'flag1';
var HINT_FILTER_POSSESSIONS = 7;
var HINT_FILTER_FLAGS = 'hint';

function initPossessions(GPS) {
	// houses, guild houses, guild paddocks, prisms
	var gui = window.gui;

	// my houses (only Japan supports multiple houses)
	function addHouse(house) {
		var poiParams = {
			id: 'house_' + house.houseId,
			mapId: house.mapId,
			categoryId: HINT_FILTER_POSSESSIONS,
			nameId: getText('ui.common.myHouse'),
			iconId: ICON_HOUSE
		};

		GPS.addPOI(poiParams);
	}

	gui.on('AccountHouseMessage', function (msg) {
		msg.houses.forEach(function (house) {
			addHouse(house);
		});
	});
	// TODO house bought / sold

	// guild houses
	function addGuildHouse(house) {
		staticContent.getData('Houses', house.modelId, function (error, dbHouse) {
			if (error) {
				return console.error(error);
			}

			var poiParams = {
				id: 'guild_house_' + house.houseId,
				mapId: house.mapId,
				categoryId: HINT_FILTER_POSSESSIONS,
				nameId: getText('ui.common.guildHouse') + getText('ui.common.colon') + dbHouse.nameId,
				iconId: ICON_GUILD_HOUSE
			};

			GPS.addPOI(poiParams);
		});
	}

	gui.on('GuildHousesInformationMessage', function (msg) {
		msg.housesInformations.forEach(function (house) {
			addGuildHouse(house);
		});
	});
	gui.on('GuildHouseUpdateInformationMessage', function (msg) {
		addGuildHouse(msg.housesInformations);
	});
	gui.on('GuildHouseRemoveMessage', function (msg) {
		GPS.removePOI('guild_house_' + msg.houseId);
	});

	// guild paddocks
	function addGuildPaddock(paddock) {
		var poiParams = {
			id: 'guild_paddock_' + paddock.paddockId,
			mapId: paddock.mapId,
			categoryId: HINT_FILTER_POSSESSIONS,
			nameId: getText('ui.guild.paddock', paddock.maxOutdoorMount),
			iconId: ICON_GUILD_PADDOCK
		};

		GPS.addPOI(poiParams);
	}

	gui.on('GuildInformationsPaddocksMessage', function (msg) {
		msg.paddocksInformations.forEach(function (paddock) {
			addGuildPaddock(paddock);
		});
	});
	gui.on('GuildPaddockBoughtMessage', function (msg) {
		addGuildPaddock(msg.paddockInfo);
	});
	gui.on('GuildPaddockRemovedMessage', function (msg) {
		GPS.removePOI('guild_paddock_' + msg.paddockId);
	});
}

function initPhoenixes(GPS) {
	// phoenixes
	var gui = window.gui;

	gui.on('AtlasPointInformationsMessage', function (msg) {
		if (msg.type.type !== AtlasInfosEnum.ATLAS_INFOS_PHOENIX) {
			return;
		}

		var i;
		if (this.playerData.isAlive()) {
			for (i = 0; i < GPS._lastPhoenixes.length; i += 1) {
				GPS.removePOI('phoenix_' + GPS._lastPhoenixes[i].mapId);
			}
		} else {
			var phoenixes = msg.type.coords;
			for (i = 0; i < phoenixes.length; i += 1) {
				var phoenix = phoenixes[i];
				var poiParams = {
					id: 'phoenix_' + phoenix.mapId,
					mapId: phoenix.mapId,
					categoryId: 'phoenix',
					x: phoenix.worldX,
					y: phoenix.worldY,
					nameId: getText('ui.common.phoenix'),
					iconId: ICON_FLAG_PHOENIX,
					isDestination: true
				};

				GPS.addPOI(poiParams);
			}
			GPS._lastPhoenixes = phoenixes;
		}

		gui.compass.updateMarkersPositions();
	});
}

function initQuests(GPS) {
	// quests
	var gui = window.gui;

	var quests = gui.playerData.quests;
	quests.on('objectiveValidated', function (quest, objectiveId) {
		GPS.removePOI(GPS.getQuestObjectivePoiId(objectiveId));
	});

	quests.on('stepValidated', function (quest, stepId) {
		var step = quest.dbSteps[stepId];
		for (var i = 0; i < step.objectiveIds.length; i += 1) {
			GPS.removePOI(GPS.getQuestObjectivePoiId(step.objectiveIds[i]));
		}
	});

	quests.on('questFinished', function (quest) {
		var step = quest.dbSteps[quest.stepId];
		for (var i = 0; i < step.objectiveIds.length; i += 1) {
			GPS.removePOI(GPS.getQuestObjectivePoiId(step.objectiveIds[i]));
		}
	});

	quests.on('questUpdate', function (questId) {
		if (!GPS.questFollower.isQuestFollowed(questId)) { return; }
		GPS.addQuestNextObjective(questId);
	});

	quests.on('questStarted', function (questId) {
		if (!gameOptions.autoGpsFlags) { return; }
		GPS.questFollower.followQuest(questId, true);
	});

	quests.on('listUpdated', function () {
		GPS.addAllFollowedQuestsObjectives();
	});
}

function initSpouse(GPS) {
	// NOTE: only see spouse on map while following (via compass message)
	var gui = window.gui;

	function addNewSpouse(spouse) {
		var poiParams = {
			id: 'spouse_' + spouse.spouseId,
			mapId: spouse.mapId,
			categoryId: HINT_FILTER_FLAGS,
			nameId: getText('ui.cartography.positionof', spouse.spouseName),
			color: { r: 255, g: 0, b: 137, a: 1 },
			isDestination: true
		};

		GPS.addPOI(poiParams);
		GPS._lastSpouseId = spouse.spouseId;
	}

	// SpouseStatusMessage
	gui.on('SpouseStatusMessage', function (msg) {
		function doAdd(spouse) {
			if (!spouse.followingSpouse) {
				return;
			}
			addNewSpouse(spouse);
		}
		if (msg.hasSpouse) {
			// NOTE: socialData doesn't always have spouse yet
			var spouse = gui.playerData.socialData.spouse;
			if (!spouse) {
				gui.once('SpouseInformationsMessage', function (msg) {
					doAdd(msg.spouse);
				});
			} else {
				doAdd(spouse);
			}
		} else {
			if (!GPS._lastSpouseId) {
				return;
			}
			GPS.removePOI('spouse_' + GPS._lastSpouseId);
			delete GPS._lastSpouseId;
		}
	});
}

function initCompass(GPS) {
	// updates to tracked POIs
	var gui = window.gui;

	function updatePOIs(msg) {
		// ASSUMPTION: these updates always apply to the current world map
		// NOTE: server does NOT send this message when arriving into a new world map
		var poiParams;

		// TODO: handle all cases
		switch (msg.type) {
			/*case CompassTypeEnum.COMPASS_TYPE_SIMPLE:
				break;*/
			case CompassTypeEnum.COMPASS_TYPE_SPOUSE:
				var spouse = gui.playerData.socialData.spouse;
				// adding / updating spouse onto current world only, thus no mapId
				if (!spouse) {
					console.warn('Spouse does not exist');
					return;
				}

				poiParams = {
					id: 'spouse_' + spouse.spouseId,
					x: msg.worldX,
					y: msg.worldY,
					categoryId: HINT_FILTER_FLAGS,
					nameId: getText('ui.cartography.positionof', spouse.spouseName),
					color: { r: 255, g: 0, b: 137, a: 1 },
					mapId: spouse.mapId,
					isDestination: true
				};
				break;
			case CompassTypeEnum.COMPASS_TYPE_PARTY:
				var member = gui.party.getMemberById(gui.party.currentParty.partyId, msg.memberId);
				if (!member) {
					console.warn('Party member', msg.memberId, 'does not exist.');
					return;
				}

				poiParams = {
					id: 'party_' + member.id,
					x: msg.worldX,
					y: msg.worldY,
					categoryId: HINT_FILTER_FLAGS,
					nameId: getText('ui.cartography.positionof', member.name) + '\n\n(' + msg.worldX + ', ' + msg.worldY + ')',
					color: [1.0, 1.1, 2.0, 1.0],
					mapId: member.mapId,
					isDestination: true
				};
				GPS._lastPartyMemberId = member.id;
				break;
			/*case CompassTypeEnum.COMPASS_TYPE_PVP_SEEK:
				break;*/
			case CompassTypeEnum.COMPASS_TYPE_QUEST:
				// example: map id 148752, talk to Captain Ardier, finish the quest to go Frigost, talk to Mousse Haka
				poiParams = {
					id: 'flag_srv' + msg.type,
					x: msg.worldX,
					y: msg.worldY,
					categoryId: HINT_FILTER_FLAGS,
					nameId: msg.worldX + ',' + msg.worldY,
					color: { r: 85, g: 136, b: 0, a: 1 },
					mapId: window.gui.playerData.position.worldmapId,
					isDestination: true
				};
				window.gui.chat.logMsg(getText('tablet.cartography.flagUpdated', msg.worldX, msg.worldY));
				break;
			case 'zaap':
				poiParams = {
					id: 'zaap',
					x: msg.worldX,
					y: msg.worldY,
					categoryId: 'zaap',
					nameId: msg.worldX + ',' + msg.worldY,
					color: { r: 150, g: 199, b: 221, a: 1 },
					mapId: window.gui.playerData.position.worldmapId,
					isDestination: true
				};
				break;
			default:
				console.error('Unhandled CompassTypeEnum value:', msg.type);
				// falls through
			case CompassTypeEnum.COMPASS_TYPE_SIMPLE:
				var dist = gui.compass.addMarker({
					type: msg.type,
					x: msg.worldX,
					y: msg.worldY
				});
				window.gui.chat.logMsg(getText('tablet.cartography.compassUpdated', dist));
				// TODO: default poiParams
		}

		if (poiParams) { GPS._updatePOI(poiParams); }
		gui.compass.updateMarkersPositions();
	}

	gui.on('CompassUpdateMessage', updatePOIs);
	gui.on('CompassUpdatePartyMemberMessage', updatePOIs);

	gui.on('CompassResetMessage', function (msg) {
		// ASSUMPTION: these updates always apply to the current world map
		// TODO: handle all cases
		switch (msg.type) {
			/*case CompassTypeEnum.COMPASS_TYPE_SIMPLE:
				break;*/
			case CompassTypeEnum.COMPASS_TYPE_SPOUSE:
				// remove spouse from map
				var spouse = gui.playerData.socialData.spouse;
				GPS.removePOI('spouse_' + spouse.spouseId);
				break;
			case CompassTypeEnum.COMPASS_TYPE_PARTY:
				GPS.removePOI('party_' + GPS._lastPartyMemberId);
				break;
			/*case CompassTypeEnum.COMPASS_TYPE_PVP_SEEK:
				break;*/
			case CompassTypeEnum.COMPASS_TYPE_QUEST:
				GPS.removePOI('flag_srv' + msg.type);
				break;
			default:
				gui.compass.removeMarker({
					type: msg.type
				});
		}

		gui.compass.updateMarkersPositions();
	});

	gui.playerData.position.on('mapUpdate', function () {
		if (!gui.playerData.isFighting && !gui.tutorialManager.inTutorial) {
			gui.compass.updateMarkersPositions();
		} else {
			gui.compass.clearContent();
		}
	});

	// destination markers
	GPS.on('updatePOI', function (poi) {
		if (poi.isDestination) {
			var marker = gui.compass.markers[poi.id];
			marker.x = poi.x;
			marker.y = poi.y;
			if (poi.nameId) {
				marker.tooltip = poi.nameId;
			}
			gui.compass.updateMarkersPositions();
		}
	});

	// fight
	gui.fightManager.on('fightStart', function () {
		gui.compass.clearContent();
	});
}

module.exports.init = function (GPS) {
	initPhoenixes(GPS);
	initPossessions(GPS);
	initQuests(GPS);
	initSpouse(GPS);

	initCompass(GPS);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/GPS/flags.js
 ** module id = 470
 ** module chunks = 0
 **/