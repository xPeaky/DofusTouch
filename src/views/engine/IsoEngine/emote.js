// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var IsoEngine       = require('./main.js');
var async           = require('async');
var preloadAssets   = require('preloadAssets');
var castSpell       = require('castSpell');
var playUiSound     = require('audioManager').playUiSound;
var constants       = require('constants');
var LightColumn     = require('LightColumn');
var TextSprite      = require('TextSprite');
var TINA            = require('TINAlight');
var Tween           = TINA.Tween;
var easing          = TINA.easing;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Play emoticon animation
 *
 * @param {Objet}   msg                - EmotePlayMessage
 *        {number}  msg.accountId      - id of account playing the emote
 *        {number}  msg.actorId        - id of actor playingthe emote
 *        {number}  msg.emoteId        - emote id
 *        {number}  msg.emoteStartTime - timestamp
 *        {Object}  msg._emote         - emote data object (enriched)
 *        {string}  msg._emote.defaultAnim      - animation name
 *        {boolean} msg._emote.eight_directions - animation exist in all 8 directions
 *        {boolean} msg._emote.persistancy      - is animation followed by static animation
 */
IsoEngine.prototype.playEmote = function (msg) {
	// don't play emotes if we are in creature (pokemon) mode
	if (this.actorManager.isCreatureModeOn) { return; }

	var actor = this.actorManager.getActor(msg.actorId);
	if (!actor) { return; }

	// emote id 0 means stopping the current emote animation
	if (msg.emoteId === 0) {
		actor.staticAnim();
		return;
	}

	var emoteData = msg._emote;
	if (!emoteData) { return; }

	var animType = emoteData.defaultAnim;
	// capitalize the first letter
	animType = animType.substring(0, 1).toUpperCase() + animType.substring(1) + '_0';

	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	if (!emoteData.eight_directions) {
		// convert direction to linear direction
		var direction = ~~(actor.direction / 2) * 2 + 1;
		if (direction !== actor.direction) {
			actor.setDisposition(null, direction);
		}
	}

	// TODO: persistancy -> AnimEmoteXXXX_Statique_0_1

	actor.loadAndPlayAnimation({ base: 'AnimEmote', type: animType }, false);
};

IsoEngine.prototype.playLevelUpAnimation = function (actorId, cb) {
	var actor = this.actorManager.getActor(actorId);
	if (!actor) {
		return;
	}

	// Determining gender index
	// The body skin (index 0 in skins) is used as the gender index
	var genderIndex;
	var look = actor.look;
	if (look && look.skins && look.skins[0]) {
		var bodySkin = look.skins[0];
		genderIndex = (bodySkin & 1).toString();
	} else {
		// sex undetermined, randomly assigning gender
		genderIndex = (Math.random() < 0.5) ? '0' : '1';
	}

	// Playing Emote level-up animation
	var base = 'AnimEmoteInterface_' + genderIndex;
	actor.loadAndPlayAnimation({ base: base, direction: 1 }, false, cb);
	playUiSound('LEVEL_UP');

	// Adding level-up text
	var x = actor.x;
	var y = actor.y;

	var text = 'LEVEL UP';
	var bitmapFont = this.bitmapFonts.characters;
	var levelUpTextSprite = new TextSprite({
		x: x,
		y: y,
		scene: this.mapScene,
		text: text,
		fallbackText: text,
		layer: constants.MAP_LAYER_POINT_LABELS,
		bitmapFont: bitmapFont,
		color: [0.3, 0.5, -0.1, 0.0]
	});

	levelUpTextSprite.scaleX = 0.7;
	levelUpTextSprite.scaleY = 0.7;

	Tween(levelUpTextSprite, ['y', 'alpha'])
		.from({ y: y, alpha: 0.0 })
		.to({ y: y, alpha: 0.0 }, 9) // tempo
		.to({ y: y - 40, alpha: 1.0 }, 8, easing.backOut, 2)
		.to({ y: y - 40, alpha: 1.0 }, 16)
		.to({ y: y - 90, alpha: 0.0 }, 12, easing.backIn, 2)
		.onFinish(function () {
			levelUpTextSprite.remove();
		})
		.start();

	// Adding a special effect, it has two purposes:
	// 1 - Make the animation more badass
	// 2 - Hide an artefacts in the level-up animation that was meant to be displayed in an interface
	// (the top of a white-yellow halo is cropped)
	var specialEffect = new LightColumn(actor.position, x, y);
	specialEffect.red   = 1.0;
	specialEffect.green = 1.0;
	specialEffect.blue  = 0.9;
	Tween(specialEffect, ['scaleX', 'scaleY', 'alpha'])
		.from({
			scaleX: 0.3,
			scaleY: 0.3,
			alpha:  0
		})
		.to({
			scaleX: 1.0,
			scaleY: 1.0,
			alpha:  1.7
		}, 7, easing.polyOut, 4)
		.to({
			scaleX: 0.3,
			scaleY: 1.0,
			alpha:  1.7
		}, 20, easing.polyOut, 2)
		.to({
			scaleX: 0.3,
			scaleY: 1.0,
			alpha:  0
		}, 7, easing.polyOut, 2)
		.onFinish(function () {
			specialEffect.remove();
		})
		.start();
};

IsoEngine.prototype.playRoleplaySpellAnim = function (msg) {
	preloadAssets([msg], function () {
		var animSequence = [];
		castSpell(msg, animSequence);

		// trigger animations in the right order
		async.series(animSequence);
	});
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/emote.js
 ** module id = 1057
 ** module chunks = 0
 **/