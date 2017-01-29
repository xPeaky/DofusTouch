var Actor = require('./main.js');
var getText = require('getText').getText;
var npcActionRequest = require('contextualMenus/ContextualMenuNpc').npcActionRequest;
var beginnerAssistant = require('beginnerAssistant');
var windowsManager = require('windowsManager');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Execute correct action when an actor is tapped, depending on his type
 */
Actor.prototype.tap = function (x, y) {
	var actorId = this.actorId;
	var data = this.data;
	var local = this.scene.convertSceneToCanvasCoordinate(x, y);
	var coordinates = { x: local.x, y: local.y, isCanvasCoordinate: true };

	switch (data.type) {
	case 'GameRolePlayGroupMonsterInformations':
		window.gui.openContextualMenu('monster', data, coordinates);
		break;

	case 'GameRolePlayPrismInformations':
		window.gui.openContextualMenu('prism', data, coordinates);
		break;

	case 'GameRolePlayTaxCollectorInformations':
		data.mapId = window.isoEngine.mapRenderer.map.id;
		window.gui.openContextualMenu('taxCollector', data, coordinates);
		break;
	case 'GameRolePlayNpcInformations':
	case 'GameRolePlayNpcWithQuestInformations':
		var isoEngine = window.isoEngine;
		var mapId = isoEngine.mapRenderer.map.id;
		var npcId = data.npcId;
		if (!npcId) { return; }
		var npcData = data.npcData;
		if (!npcData) { return console.debug('NPC missing in database:', npcId); } // DOF-447; Flash does the same

		if (npcData.actions.length === 1 && window.gui.playerData.isAlive()) {
			isoEngine.highlightActorOnAction(actorId);
			return npcActionRequest(npcData, actorId, mapId, npcData.actions[0]);
		}

		window.gui.openContextualMenu('npc', {
			actorId: actorId,
			npcId: npcId,
			npcData: npcData,
			mapId: mapId
		}, coordinates);
		break;

	case 'GameRolePlayCharacterInformations':
	case 'GameRolePlayMutantInformations':
		var interactiveElements;
		if (this !== this.actorManager.userActor) {
			interactiveElements = window.isoEngine.mapRenderer.interactiveElements;
		}
		window.gui.openContextualMenu('player', {
			accountId: data.accountId,
			playerId: data.playerId,
			playerName: data.name,
			cellId: this.cellId,
			isMutant: data.type === 'GameRolePlayMutantInformations',
			humanoidInfoOptions: data.humanoidInfo && data.humanoidInfo.options,
			alignmentInfos: data.alignmentInfos,
			interactiveElements: interactiveElements
		}, coordinates);
		break;

	case 'GameRolePlayMerchantInformations':
		//TODO: merchand contextual menu
		var actions = [];
		actions.push({
			caption: getText('ui.common.buy'),
			target: 'dofus',
			action: 'sendMessage',
			params: ['ExchangeOnHumanVendorRequestMessage', { humanVendorId: actorId, humanVendorCell: this.cellId }]
		});
		window.gui.openContextualMenu('generic', { title: data.name, actions: actions }, coordinates);
		break;

	case 'FightTeamInformations':
	case 'FightAllianceTeamInformations':
	case 'FightTeamLightInformations':
		window.gui.openContextualMenu('fightTeam', data, coordinates);
		break;

	case 'GameFightCharacterInformations':
		window.gui.openContextualMenu('player', {
			playerId: data.playerId,
			playerName: data.name,
			isMutant: false
		}, coordinates);
		break;

	case 'GameRolePlayMountInformations':
		var mountActions = [{
			caption: getText('ui.mount.viewMountDetails'),
			cb: function () { windowsManager.getWindow('mount').showPaddockMount(actorId); }
		}];
		window.gui.openContextualMenu('generic', {
				title: (data.name || getText('ui.common.noName')) + '\n' +
					getText('ui.mount.mountOf', data.ownerName) + '\n' +
					getText('ui.common.rank', data.level),
				actions: mountActions
			}, coordinates);
		break;

	case 'GameFightMutantInformations':
	case 'GameFightMonsterInformations':
	case 'GameFightMonsterWithAlignmentInformations':
	case 'GameFightTaxCollectorInformations':
		return;

	// following types are custom for Dofus touch client

	case 'PaddockObject':
		window.gui.openContextualMenu('paddockObject', {
			cellId: this.cellId,
			paddockObjectName: this.data.name
		}, coordinates);
		break;

	case 'BeginnerAssistant':
		beginnerAssistant.openDialog();
		break;

	default:
		return;
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/tap.js
 ** module id = 613
 ** module chunks = 0
 **/