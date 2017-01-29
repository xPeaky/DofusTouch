/** @module loadTemplate */

var constants       = require('constants');
var Cache3State     = require('Cache3State');
var assetPreloading = require('assetPreloading');
var textureLoading  = require('textureLoading');
var audioManager    = require('audioManager');

var AnimationGraphic      = require('AnimationGraphic');
var HierarchicalAnimation = require('HierarchicalAnimation');
var AtlasAnimation        = require('AtlasAnimation');

var HierarchicalAnimationTemplate = require('HierarchicalAnimationTemplate');
var AtlasAnimationTemplate        = require('AtlasAnimationTemplate');

// Root of different types of animations/textures
var TEMPLATES_PATH = {
	skin:      constants.SKIN_PATH,
	bone:      constants.BONE_PATH,
	icon:      constants.ICON_PATH,
	ornaments: constants.ORNAMENT_PATH,
	embedded:  constants.EMBEDDED_PATH,
	loader:    constants.LOADER_PATH
};

var FILTERING = {
	skin:      'mipmap',
	bone:      'mipmap',
	icon:      'linear',
	ornaments: 'linear',
	embedded:  'linear',
	loader:    'linear'
};

// Cache holding animations up to a number of constants.MAX_ANIMATIONS animations
var animationCache = new Cache3State(constants.MAX_ANIMATIONS);

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var missingTemplates = {};
exports.loadMissingTemplatesInfo = function () {
	assetPreloading.loadJson(constants.MISSING_ANIM_PATH, function (missingTemplatesList) {
		for (var i = 0; i < missingTemplatesList.length; i++) {
			missingTemplates[missingTemplatesList[i]] = true;
		}
	});
};

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Class containing all the data corresponding to one json animation file
function AnimationData(symbols, matrices, colors) {
	this.symbols  = symbols;
	this.matrices = matrices;
	this.colors   = colors;
}

var emptyAnimationHandle = { element: new AnimationData({}, [], []), release: function () {} };

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Creates an AnimationData object from json data
function createAnimation(animationId, jsonData, texture) {
	if (jsonData === constants.EMPTY_JSON) {
		return emptyAnimationHandle;
	}

	// Animation can be under atlas format or hierarchical format
	// Hierarchical format is detected by the presence of a symbols property on the jsonData
	// In the atlas format, the symbols are at the root of the jsonData object
	var isHierarchical = !!jsonData.symbols;

	var symbols = {};
	var symbolsData, animationData, Animation;

	if (isHierarchical) {
		animationData = new AnimationData(symbols, jsonData.matrices, jsonData.colors);
		Animation = HierarchicalAnimation;
		symbolsData = jsonData.symbols;
	} else {
		animationData = symbols;
		Animation = AtlasAnimation;
		symbolsData = jsonData;
	}

	var symbolIds = Object.keys(symbolsData);
	for (var i = 0; i < symbolIds.length; i += 1) {
		var id = symbolIds[i];
		var symbolData = symbolsData[id];

		if (symbolData.isGraphic) {
			symbols[id] = new AnimationGraphic(symbolData, animationData, texture);
		}

		if (symbolData.isAnim) {
			symbols[id] = new Animation(symbolData, animationData, texture);
		}
	}

	return animationCache.addAndHoldElement(animationData, 1, animationId);
}

function createTemplate(type, templateId, texture, animation) {
	var isHierarchical = !!animation.element.symbols;
	var template = isHierarchical ? new HierarchicalAnimationTemplate(templateId) : new AtlasAnimationTemplate(templateId);
	template.generateTemplate(texture, animation);
	audioManager.createAnimSoundGroups(template.getAnimationSounds(templateId), 'sfx');
	return template;
}

/**
 * @method
 * @desc Load and create a template with the appropriate texture and animation
 *
 * @param  {string}   templateType  - Type of the template to load
 * @param  {array}    templateId    - Id of the template to create
 * @param  {function} usage         - Where the template is meant to be used (ui or map)
 * @param  {function} cb            - Callback method triggered when the template has been created
 * @param  {object}   textureCache  - Cache to fetch and store the texture of the template
 */
exports.loadTemplate = function (templateType, templateId, usage, cb, textureCache, cachingStrategy) {
	if (missingTemplates[templateId]) {
		var emptyTexture = textureCache.getEmptyTexture();
		return cb && cb(createTemplate(templateType, templateId, emptyTexture, emptyAnimationHandle));
	}

	var templatePath = TEMPLATES_PATH[templateType] + usage + templateId;
	var textureUrl   = templatePath + '.png';
	var animationUrl = templatePath + '.json';

	var texture, jsonData; // To store the texture and json when they are loaded

	var nAssetsLoaded = 0;
	var nAssetsToLoad = 1; // At least the texture need to be loaded

	var animation = animationCache.holdElement(animationUrl);

	function onJsonLoaded(justLoadedJsonData) {
		jsonData = justLoadedJsonData;
		nAssetsLoaded += 1;
		if (nAssetsLoaded === nAssetsToLoad) {
			animation = createAnimation(animationUrl, jsonData, texture);

			var template = createTemplate(templateType, templateId, texture, animation);
			return cb && cb(template);
		}
	}

	if (animation === undefined) {
		// Animation is not in cache
		// Json file needs to be loaded
		nAssetsToLoad += 1;
		assetPreloading.loadJson(animationUrl, onJsonLoaded);
	}

	function onTextureLoaded(justLoadedTexture) {
		texture = justLoadedTexture;
		nAssetsLoaded += 1;
		if (nAssetsLoaded === nAssetsToLoad) {
			if (animation === undefined) {
				animation = createAnimation(animationUrl, jsonData, texture);
			}

			var template = createTemplate(templateType, templateId, texture, animation);
			return cb && cb(template);
		}
	}

	textureLoading.loadTexture(textureUrl, onTextureLoaded, textureCache, FILTERING[templateType], cachingStrategy);
};


/**
 * @method
 * @desc Load and create a template with the appropriate texture and animation
 *
 * @param  {array}    templatesInfo - Array of couples of template types and ids
 * @param  {function} cb            - Callback method triggered when the template has been created
 * @param  {object}   textureCache  - Cache to fetch and store the texture of the template
 */
exports.loadTemplates = function (templatesInfo, cb, textureCache, cachingStrategy) {
	var textures   = [];
	var animations = [];
	var jsonsData  = [];
	var templates  = [];

	var textureUrls         = [];
	var animationUrls       = [];
	var animationUrlsToLoad = [];

	var animationsIndexes = [];

	var nTemplates = templatesInfo.length;

	var nAssetsLoaded = 0;
	var nAssetsToLoad = 0; // At least one texture per template to load

	for (var t = 0; t < nTemplates; t += 1) {
		var templateInfo = templatesInfo[t];
		var templateType = templateInfo.type;
		var templateId   = templateInfo.id;

		if (missingTemplates[templateId]) {
			var emptyTexture = textureCache.getEmptyTexture();
			templates[t] = createTemplate(templateType, templateId, emptyTexture, emptyAnimationHandle);
			continue;
		}

		var templatePath = TEMPLATES_PATH[templateType] + templateInfo.usage + templateId;

		var textureUrl   = templatePath + '.png';
		var animationUrl = templatePath + '.json';

		textureUrls.push(textureUrl);
		animationUrls.push(animationUrl);

		nAssetsToLoad += 1; // one more texture to load

		var animation = animationCache.holdElement(animationUrl);

		if (animation === undefined) {
			animationUrlsToLoad.push(animationUrl);
			animationsIndexes.push(t);
			nAssetsToLoad += 1; // json needs to be loaded
		} else {
			// Animation in cache, no need to load json file
			animations[t] = animation;
		}
	}

	function onJsonLoaded(jsonData, jsonIndex) {
		var animationIndex = animationsIndexes[jsonIndex];

		var texture = textures[animationIndex];
		if (texture === undefined) {
			// Texture not yet loaded
			jsonsData[animationIndex] = jsonData;
		} else {
			var animationUrl = animationUrls[animationIndex];
			var animation = createAnimation(animationUrl, jsonData, texture);
			animations[animationIndex] = animation;
			var templateInfo = templatesInfo[animationIndex];
			templates[animationIndex] = createTemplate(templateInfo.type, templateInfo.id, texture, animation);
		}

		nAssetsLoaded += 1;
		if (nAssetsLoaded === nAssetsToLoad) {
			return cb && cb(templates);
		}
	}

	function onTextureLoaded(texture, textureIndex) {
		textures[textureIndex] = texture;

		var animation, templateInfo;
		var jsonData = jsonsData[textureIndex];
		if (jsonData === undefined) {
			// Json data either not loaded yet, or unnecessary because animation already exists
			animation = animations[textureIndex];
			if (animation !== undefined) {
				templateInfo = templatesInfo[textureIndex];
				templates[textureIndex] = createTemplate(templateInfo.type, templateInfo.id, texture, animation);
			}
		} else {
			// Json data exists
			// Creating animation
			var animationUrl = animationUrls[textureIndex];
			animation = createAnimation(animationUrl, jsonData, texture);
			templateInfo = templatesInfo[textureIndex];
			templates[textureIndex] = createTemplate(templateInfo.type, templateInfo.id, texture, animation);
		}

		nAssetsLoaded += 1;
		if (nAssetsLoaded === nAssetsToLoad) {
			return cb && cb(templates);
		}
	}

	var filtering = FILTERING[templatesInfo[0].type];
	textureLoading.loadTextures(textureUrls, onTextureLoaded, null, textureCache, filtering, cachingStrategy);
	assetPreloading.loadJsons(animationUrlsToLoad, onJsonLoaded, null);
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/templateLoading/index.js
 ** module id = 249
 ** module chunks = 0
 **/