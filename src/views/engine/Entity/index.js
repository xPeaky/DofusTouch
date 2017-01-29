var inherits                 = require('util').inherits;
var AnimatedSprite           = require('AnimatedSprite');
var colorHelper              = require('colorHelper');
var AnimatedGfx              = require('AnimatedGfx');
var animationManagerLoading  = require('animationManagerLoading');
var subentitySymbolModifiers = require('Entity/subentitySymbolModifiers');
var SubEntityBinding         = require('SubEntityBindingPointCategoryEnum');

function Entity(params, animManager) {
	AnimatedSprite.call(this, params, animManager);
	this.direction  = params.direction !== undefined ? params.direction : 1;
	this.animSymbol = { base: 'AnimStatique', type: null, direction: this.direction };
	this.look       = null;

	this.showSubentities = true;
}
inherits(Entity, AnimatedSprite);
module.exports = Entity;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Entity.prototype.updateAnimation = function () {
	this.animSymbol.direction = this.direction;
	this.animManager.assignSymbol(this.animSymbol, false);
};


// TODO: refactor addSubentity to remove the duplication of functionality with animationManagerLoading.loadSubentity
//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a subentity.
 *
 * @param {Object}   subentity                             - subentity definition
 *        {number}   subentity.bindingPointCategory        - binding type (see below)
 *        {number}   subentity.bindingPointIndex           - binding index
 *        {Object}   subentity.subEntityLook               - look object
 *        {number}   subentity.subEntityLook.bonesId       - bones id
 *        {number[]} subentity.subEntityLook.indexedColors - colors
 *        {number[]} subentity.subEntityLook.scales        - scales on X and Y
 *        {number[]} subentity.subEntityLook.skins         - skin ids
 *        {Object[]} subentity.subEntityLook.subentities   - a list of subentities definition
 *
 * @param {Object}   options          - options parameter
 *        {string}   options.boneType - path prefix to use for bones models
 *        {string}   options.skinType - path prefix to use for skin models
 *
 *
 * binding type is an enum that can take one of the following values:
 *    0: HOOK_POINT_CATEGORY_UNUSED
 *    1: HOOK_POINT_CATEGORY_PET
 *    2: HOOK_POINT_CATEGORY_MOUNT_RIDER
 *    3: HOOK_POINT_CATEGORY_LIFTED_ENTITY
 *    4: HOOK_POINT_CATEGORY_BASE_BACKGROUND
 *    5: HOOK_POINT_CATEGORY_MERCHANT_BAG
 *    6: HOOK_POINT_CATEGORY_BASE_FOREGROUND
 */
Entity.prototype.addSubentity = function (subentity, options, cb) {
	if (!this.showSubentities) {
		return;
	}

	// create animation manager for subentity
	var subEntityLook = subentity.subEntityLook;

	if (!subEntityLook) {
		// What the flip is going on?
		// TODO: figure what the flip is going on
		console.error(new Error('Subentity has no look: ' + Object.keys(subentity).join(';')));
		return;
	}

	var boneId  = subEntityLook.bonesId + '/motion';
	var skinIds = subEntityLook.skins;
	var scale   = subEntityLook.scales[0];
	var tints   = colorHelper.parseIndexedColors(subEntityLook.indexedColors);

	var self = this;
	options.addToSprite = false;
	animationManagerLoading.loadCharacterAnimationManager(this, boneId, skinIds, tints, scale, options,
		function onSubentityLoaded(subentityAnimManager) {
			self.animManager.addSubentity({
				animManager: subentityAnimManager,
				bindingPoint: 'carried_' + subentity.bindingPointCategory + '_' + subentity.bindingPointIndex,
				symbolModifier: subentitySymbolModifiers[subentity.bindingPointCategory],
				bindingPointCategory: subentity.bindingPointCategory
			});

			return cb && cb(subentityAnimManager);
		}
	);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Entity.prototype.addSubentities = function (subentities, options, cb) {
	if (!subentities) {
		return cb && cb();
	}

	var nSubentitiesToAdd = subentities.length + 1;
	var nSubentitiesAdded = 0;
	function onSubentityAdded() {
		nSubentitiesAdded += 1;
		if (nSubentitiesAdded === nSubentitiesToAdd) {
			return cb && cb();
		}
	}

	for (var s = 0; s < subentities.length; s += 1) {
		this.addSubentity(subentities[s], options, onSubentityAdded);
	}

	onSubentityAdded();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Load and set entity look
 *
 * @param {Object}   look               - entity look
 *        {number}   look.bonesId       - entity bones id
 *        {number[]} look.indexedColors - colors
 *        {number[]} look.scales        - scales on X and Y
 *        {number[]} look.skins         - skin ids
 *        {Object[]} look.subentities   - a list of subentities definition
 *
 * @param {Object}   options            - option parameter
 *        {string}   options.boneType   - path prefix to use for bones models
 *        {string}   options.skinType   - path prefix to use for skin models
 *
 * @param {Function} [cb]               - optional callback function
 *
 */
Entity.prototype.setLook = function (look, options, cb) {
	var previousLook = this.look;

	// Testing for look equivalence
	var scale   = look.scales[0];
	var skinIds = look.skins;
	var areLooksEquivalent = previousLook &&
		(this.look.bonesId === look.bonesId) &&
		(this.look.skins.length === skinIds.length) &&
		(this.look.scales[0] === scale);

	for (var s = 0; areLooksEquivalent && s < skinIds.length; s += 1) {
		areLooksEquivalent = areLooksEquivalent && skinIds[s] === this.look.skins[s];
	}

	this.look = look;
	var tints = colorHelper.parseIndexedColors(look.indexedColors);
	if (areLooksEquivalent) {
		// No need to reload an animation manager
		this.animManager.setTints(tints);
		this.animManager.cleanupAnimationsAndRemoveSubentities();
		this.addSubentities(look.subentities, options, cb);
		return;
	}

	if (previousLook) {
		// Triggering Ninja Smoke animation
		var ninjaSmoke = new AnimatedGfx({
			x: this.x,
			y: this.y,
			position: this.position + 1,
			scene: this.scene
		});

		animationManagerLoading.loadAnimationManager(ninjaSmoke, 'bone', '1165/FX', function (animationManager) {
			animationManager.assignSymbol({ base: 'FX', direction: 0 }, false, function () {
				ninjaSmoke.remove();
			});
		});
	}

	var oldAnimManager = this.animManager;
	function onLookLoaded() {
		// Clearing previously used animation manager
		oldAnimManager.clear(true); // (continueAnimation)

		return cb && cb();
	}

	animationManagerLoading.loadLook(this, look, options, onLookLoaded);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove the mount from an entity look
 *
 * @param {Object}   look          - entity look
 *        {number}   bonesId       - bones id
 *        {number[]} skins         - list of skin ids
 *        {number[]} indexedColors - entity colors
 *        {number[]} scales        - scale
 *        {Object[]} subentities   - a list of entity looks
 */
var RIDER_CATEGORY = SubEntityBinding.HOOK_POINT_CATEGORY_MOUNT_DRIVER;

// Map of looks corresponding to the unmounted version for each given mounted look
// See original source code ankamagames/tiphon/types/TiphonUtility.as
var UMOUNTED_LOOKS = {};
UMOUNTED_LOOKS[2]    = 1;    // Chevaucheur normal
UMOUNTED_LOOKS[1084] = 44;   // Picole
UMOUNTED_LOOKS[1068] = 113;  // Momification
UMOUNTED_LOOKS[1202] = 453;  // Colere de Zatoishwan
UMOUNTED_LOOKS[1575] = 1;    // Psychopathe
UMOUNTED_LOOKS[1576] = 1;    // Pleutre
UMOUNTED_LOOKS[2456] = 1107; // Goule

Entity.getLookWithoutMount = function (look) {
	var subEntities = look.subentities;

	for (var i = 0; i < subEntities.length; i++) {
		var subEntity = subEntities[i];
		if (subEntity.bindingPointCategory === RIDER_CATEGORY && subEntity.bindingPointIndex === 0) {
			look = subEntity.subEntityLook;
			var bonesId = UMOUNTED_LOOKS[look.bonesId];
			if (bonesId === undefined) {
				bonesId = look.bonesId;
			}

			return {
				_type:         'EntityLook',
				bonesId:       bonesId,
				indexedColors: look.indexedColors,
				scales:        look.scales,
				skins:         look.skins,
				subentities:   look.subentities
			};
		}
	}

	return look;
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Entity/index.js
 ** module id = 241
 ** module chunks = 0
 **/