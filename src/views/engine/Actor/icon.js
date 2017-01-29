var Actor                   = require('./main.js');
var constants               = require('constants');
var AnimatedGfx             = require('AnimatedGfx');
var Graphic                 = require('Graphic');
var textureLoading          = require('textureLoading');
var animationManagerLoading = require('animationManagerLoading');
var socialEntityManager     = require('socialEntityManager');
var Delay                   = require('TINAlight').Delay;
var PrismStateEnum          = require('PrismStateEnum');
var AggressableStatusEnum   = require('AggressableStatusEnum');

var IconCategoryEnum = {
	QUEST: 1,
	DEFAULT: 2,
	AVA: 3,
	SMILEY: 4,
	UI: 5
};

var IconsImageName = {
	miniBoss: 'archmonsters',
	hardcoreDrop: 'treasure',
	defender: 'defender',
	attacker: 'forward',
	ally: 'ownTeam',
	disqualified: 'neutral',
	prequalified: 'clock'
};

var ICON_MARGIN_WIDTH = 5;
var ICON_MARGIN_HEIGHT = 5;
var SMILEY_DISPLAY_DURATION = 3 * 24;

var smileyDelay = new Delay();

Actor.prototype._getIcon = function (type, category) {
	if (!this.icons.hasOwnProperty(category)) {
		return null;
	}
	return this.icons[category][type];
};

Actor.prototype._setIcon = function (icon, type, category) {
	if (!this.icons.hasOwnProperty(category)) {
		this.icons[category] = {};
	}
	this.icons[category][type] = icon;
};

function getConquestStatus(actorAllianceId, playerAllianceId, prismAllianceId) {
	if (actorAllianceId === playerAllianceId) {
		return 'ally';
	}

	if (actorAllianceId === prismAllianceId) {
		return 'defender';
	}

	return 'attacker';
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @param {HumanOptionAlliance} alliance option
 */
Actor.prototype.addConquestIcon = function (option) {
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	var playerData = window.gui.playerData;
	var playerAggressableStatus = playerData.characters.mainCharacter.characteristics.alignmentInfos.aggressable;
	var isPlayerAggressable = playerAggressableStatus !== AggressableStatusEnum.NON_AGGRESSABLE;
	var isActorAggressable = option.aggressable !== AggressableStatusEnum.NON_AGGRESSABLE;
	var hasActorPvpEnabled = option.aggressable === AggressableStatusEnum.PvP_ENABLED_AGGRESSABLE ||
		option.aggressable === AggressableStatusEnum.PvP_ENABLED_NON_AGGRESSABLE;

	var conquestStatus;
	if (isPlayerAggressable && playerData.alliance.hasAlliance() && isActorAggressable && !hasActorPvpEnabled) {
		var prismInfo = socialEntityManager.entities.prism[playerData.position.subAreaId];
		if (prismInfo && prismInfo.prism && prismInfo.prism.state === PrismStateEnum.PRISM_STATE_VULNERABLE) {
			var actorAllianceId = option.allianceInformations.allianceId;
			var playerAllianceId = playerData.alliance.current.allianceId;
			var prismAllianceId = prismInfo.prism.alliance.allianceId;
			var isPlayer = this.actorId === playerData.id;
			switch (option.aggressable) {
				case AggressableStatusEnum.AvA_DISQUALIFIED:
					if (isPlayer) {
						conquestStatus = 'disqualified';
					}
					break;
				case AggressableStatusEnum.AvA_PREQUALIFIED_AGGRESSABLE:
					if (isPlayer) {
						conquestStatus = 'prequalified';
					} else {
						conquestStatus = getConquestStatus(actorAllianceId, playerAllianceId, prismAllianceId);
					}
					break;
				case AggressableStatusEnum.AvA_ENABLED_AGGRESSABLE:
					if (isPlayer) {
						conquestStatus = 'ally';
					} else {
						conquestStatus = getConquestStatus(actorAllianceId, playerAllianceId, prismAllianceId);
					}
					break;
			}
		}
	}

	if (this._getIcon(conquestStatus, IconCategoryEnum.AVA)) {
		return;
	}

	this.removeIconCategory(IconCategoryEnum.AVA);
	if (conquestStatus) {
		this.addIcon(conquestStatus, IconCategoryEnum.AVA);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @param {number} smileyId
 */
Actor.prototype.addSmileyIcon = function (smileyId) {
	var self = this;
	var smileyData = window.gui.databases.Smileys[smileyId];
	if (!smileyData) {
		return console.error('Smiley ' + smileyId + ' details are not available, it could not be displayed');
	}
	var smileyCategory = IconCategoryEnum.SMILEY;
	this.removeIconCategory(smileyCategory);
	this.addIcon(smileyData.gfxId, smileyCategory);
	if (smileyDelay.playing || smileyDelay.starting) {
		smileyDelay.stop();
	}
	smileyDelay.reset(SMILEY_DISPLAY_DURATION, function () {
		self.removeIconCategory(smileyCategory);
	});
	smileyDelay.start();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 */
Actor.prototype.addReadyIconOnActor = function () {
	this.addIcon('Social_tx_fightState', IconCategoryEnum.UI);
};

Actor.prototype.removeReadyIconOnActor = function () {
	this.removeIconCategory(IconCategoryEnum.UI);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @param {GameRolePlayNpcQuestFlag} questFlag
 */
Actor.prototype.addQuestIcon = function (questFlag) {
	var self = this;

	var questType = 'questObjectiveClip';
	if (questFlag.questsToStartId.length) {
		questType = 'questClip';
	}
	// is there already a quest icon?
	if (this._getIcon(questType, IconCategoryEnum.QUEST)) {
		return;
	}
	this.removeQuestIcon();
	this.questType = questType;

	var icon = new AnimatedGfx({
		layer: constants.MAP_LAYER_ICONS,
		x: self.x,
		y: self.y,
		offsetY: 0,
		scene: self.scene
	});

	animationManagerLoading.loadAnimationManager(icon, 'embedded', 'quest', function (animationManager) {
		animationManager.assignSymbol({ base: questType, direction: -1 }, true);
		self._setIcon(icon, questType, IconCategoryEnum.QUEST);
		self._positionIcons();
	});
};

Actor.prototype.addIcon = function (type, category) {
	category = category || IconCategoryEnum.DEFAULT;
	var icon = this._getIcon(type, category);
	if (icon) {
		return;
	}

	var iconImagePath;
	switch (category) {
		case IconCategoryEnum.SMILEY:
			iconImagePath = 'gfx/smilies/';
			break;
		case IconCategoryEnum.UI:
			iconImagePath = 'ui/';
			break;
		default:
			type = IconsImageName[type];
			iconImagePath = 'gfx/icons/conquestIcon/';
			break;
	}
	if (!type) {
		return console.warn('Icon type \'' + type + '\' is unknown and could not be displayed.');
	}

	var self = this;
	function assignIconTexture(iconTexture) {
		if (newIcon._cleared) {
			// the icon may have been removed before this finishes loading.
			iconTexture.release();
			return;
		}
		newIcon.w = iconTexture.element.width;
		newIcon.h = iconTexture.element.height;
		newIcon.texture = iconTexture;
		self._positionIcons();
		newIcon.forceRefresh();
	}

	var iconImageFullPath = iconImagePath + type + '.png';
	var newIcon = new Graphic({
		layer: constants.MAP_LAYER_ICONS,
		x: this.x,
		y: this.y,
		w: 0,
		h: 0,
		scene: this.scene
	});
	this._setIcon(newIcon, type, category);
	textureLoading.loadTexture(iconImageFullPath, assignIconTexture, this.scene.renderer);
};

Actor.prototype._positionIcons = function () {
	var iconsRowOffsetY = 0;
	for (var categoryName in IconCategoryEnum) {
		var category = IconCategoryEnum[categoryName];
		var iconsWidth = 0;
		var iconsLength = 0;
		var type;
		for (type in this.icons[category]) {
			var width = this.icons[category][type].w;
			iconsWidth += width ? width : 0; // AnimatedGfx does not have a width property
			iconsLength++;
		}
		if (iconsLength === 0) {
			continue;
		}
		iconsWidth += ICON_MARGIN_WIDTH * (iconsLength - 1);
		var offsetX = ~~(-iconsWidth * 0.5);
		var iconsRowMaxHeight = 0;
		for (type in this.icons[category]) {
			var icon = this.icons[category][type];
			var iconHeight = icon.h ? icon.h : 0; // AnimatedGfx does not have a height property
			iconsRowMaxHeight = Math.max(iconsRowMaxHeight, icon.h ? icon.h : 50);
			var offsetY = this.bbox ? this.bbox[2] - this.y - iconHeight - 10 : -100;
			offsetY -= iconsRowOffsetY;
			if (this.y + offsetY < 0) {
				offsetY = this.bbox ? this.bbox[3] - this.y + 10 : 100;
				offsetY += iconsRowOffsetY;
			}
			icon.x = this.x + offsetX;
			icon.y = this.y + offsetY;
			icon.position = this.position;
			offsetX += icon.w + ICON_MARGIN_WIDTH;
		}
		iconsRowOffsetY += iconsRowMaxHeight + ICON_MARGIN_HEIGHT;
	}

	if (window.gui.fightManager.fightState === 1) {
		this.updateTurnIndicatorPosition();
	}

	if (this.fighterIndicator) {
		this.fighterIndicator.x = this.x;
		this.fighterIndicator.y = this.bbox[2] - 10;
	}

	if (this._turnNumber) {
		this._turnNumber.updatePosition(this.x, this.y);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.removeQuestIcon = function () {
	this.removeIconCategory(IconCategoryEnum.QUEST);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.removeIcon = function (type, category) {
	var icon = this._getIcon(type, category);
	if (!icon) {
		return;
	}
	icon.remove();
	delete this.icons[category][type];
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.removeIconCategory = function (category) {
	for (var type in this.icons[category]) {
		this.removeIcon(type, category);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.removeIcons = function () {
	for (var categoryName in IconCategoryEnum) {
		var category = IconCategoryEnum[categoryName];
		this.removeIconCategory(category);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/icon.js
 ** module id = 616
 ** module chunks = 0
 **/