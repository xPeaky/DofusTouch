/** @module loadAnimationManager */

var colorHelper              = require('colorHelper');
var templateLoading          = require('templateLoading');
var AnimationManager         = require('AnimationManager');
var subentitySymbolModifiers = require('Entity/subentitySymbolModifiers');
var bindingPoints            = require('SubEntityBindingPointCategoryEnum');

var HOOK_POINT_CATEGORY_MOUNT_DRIVER  = bindingPoints.HOOK_POINT_CATEGORY_MOUNT_DRIVER;

function TemplateLoadingOption(type, id, usage) {
	this.type = type;
	this.id = id;
	this.usage = usage || '';
}

/**
 * @method
 * @desc Load and create a template with the appropriate texture and animation
 *
 * @param {string}   sprite          - Sprite to attach to the animation manager
 * @param {string}   boneId          - Bone id of the template
 * @param {string[]} skinIds         - Skin ids of the templates to merge to the bone template
 * @param {number[]} tints           - tints of the character
 * @param {number}   scale           - scale of the character
 * @param {number}   options         - additional options (texture cache and bones and skins usage)
 * @param {function} cb              - Callback method triggered when the templates has been created
 */
exports.loadCharacterAnimationManager = function (sprite, boneId, skinIds, tints, scale, options, cb) {
	options = options || {};

	var templatesToLoad = [];
	templatesToLoad.push(new TemplateLoadingOption('bone', boneId, options.boneType));

	var nSkins = skinIds.length;
	for (var s = 0; s < nSkins; s += 1) {
		templatesToLoad.push(new TemplateLoadingOption('skin', skinIds[s], options.skinType));
	}

	var addToSprite  = options.addToSprite;
	var textureCache = options.textureCache || sprite.renderer;
	function onTemplatesLoaded(templates) {
		var boneTemplate = templates[0];

		var lastSkinIndex = templates.length - 1;
		for (var s = 1; s <= lastSkinIndex; s += 1) {
			var skinTemplate = templates[s];
			boneTemplate.merge(skinTemplate, true);
		}

		var bonesId = boneId.split('/')[0];
		var animationManager = new AnimationManager(sprite, boneTemplate, scale ? scale / 100 : 1, bonesId, tints);
		if (addToSprite !== false) { // Should be added by default
			sprite.setAnimManager(animationManager);
		}

		return cb && cb(animationManager);
	}

	templateLoading.loadTemplates(templatesToLoad, onTemplatesLoaded, textureCache, 'archivable');
};

/**
 * @method
 * @desc Load and create a template with the appropriate texture and animation
 *
 * @param {string}   sprite          - Sprite to attach to the animation manager
 * @param {string}   templateType    - Type of the template of the animation manager
 * @param {string[]} templateId      - Id of the template of the animation manager
 * @param {function} cb              - Callback method triggered when the templates has been created
 */
exports.loadAnimationManager = function (sprite, templateType, templateId, cb) {
	function onTemplateLoaded(template) {
		var bonesId = typeof templateId === 'string' ? templateId.split('/').shift() : templateId;
		var animationManager = new AnimationManager(sprite, template, 1, bonesId);
		sprite.setAnimManager(animationManager);
		return cb && cb(animationManager);
	}

	var textureCache = sprite.renderer;
	templateLoading.loadTemplate(templateType, templateId, '', onTemplateLoaded, textureCache, 'archivable');
};

function loadSubentity(sprite, subentity, subentityIndex, subentityAnimationManagers, options, cb) {
	// create animation manager for subentity
	var subEntityLook = subentity.subEntityLook;

	var boneId  = subEntityLook.bonesId + '/motion';
	var skinIds = subEntityLook.skins;
	var scale   = subEntityLook.scales[0];
	var tints   = colorHelper.parseIndexedColors(subEntityLook.indexedColors);

	exports.loadCharacterAnimationManager(sprite, boneId, skinIds, tints, scale, options,
		function onSubentityLoaded(subentityAnimManager) {
			subentityAnimationManagers[subentityIndex] = subentityAnimManager;
			if (subentity.bindingPointCategory === HOOK_POINT_CATEGORY_MOUNT_DRIVER) {
				sprite.riderEntity = subentityAnimManager;
			}
			cb();
		}
	);
}

exports.loadLook = function (sprite, look, options, cb) {
	options = options || {};

	var mainAnimationManager = null;
	var subentityAnimationManagers = [];

	var subentities  = (sprite.showSubentities) ? look.subentities : null;
	var nSubentities = subentities ? subentities.length : 0;

	var nAnimationManagersLoaded = 0;
	var nAnimationManagersToLoad = 2 + nSubentities;

	function onAnimationManagerLoaded() {
		nAnimationManagersLoaded += 1;
		if (nAnimationManagersLoaded === nAnimationManagersToLoad) {
			// Adding animation manager of the subentities to the main animation manager
			for (var s = 0; s < nSubentities; s += 1) {
				var subentity = subentities[s];
				mainAnimationManager.addSubentity({
					animManager: subentityAnimationManagers[s],
					bindingPoint: 'carried_' + subentity.bindingPointCategory + '_' + subentity.bindingPointIndex,
					symbolModifier: subentitySymbolModifiers[subentity.bindingPointCategory],
					bindingPointCategory: subentity.bindingPointCategory
				});
			}
			return cb & cb(mainAnimationManager);
		}
	}

	var boneId  = look.bonesId + '/motion';
	var skinIds = look.skins;
	var tints   = colorHelper.parseIndexedColors(look.indexedColors);
	var scale   = look.scales[0];

	exports.loadCharacterAnimationManager(sprite, boneId, skinIds, tints, scale, options, function (animationManager) {
		mainAnimationManager = animationManager;
		onAnimationManagerLoaded();
	});

	// Subentity looks are never added to the sprite
	options.addToSprite = false;
	for (var s = 0; s < nSubentities; s += 1) {
		loadSubentity(sprite, subentities[s], s, subentityAnimationManagers, options, onAnimationManagerLoaded);
	}

	onAnimationManagerLoaded();
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/animationManagerLoading/index.js
 ** module id = 248
 ** module chunks = 0
 **/