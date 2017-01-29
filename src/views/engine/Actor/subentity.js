var Actor                    = require('./main.js');
var Entity                   = require('Entity');
var subentitySymbolModifiers = require('Entity/subentitySymbolModifiers');
var bindingPoints            = require('SubEntityBindingPointCategoryEnum');

var HOOK_POINT_CATEGORY_MOUNT_DRIVER  = bindingPoints.HOOK_POINT_CATEGORY_MOUNT_DRIVER;
var HOOK_POINT_CATEGORY_LIFTED_ENTITY = bindingPoints.HOOK_POINT_CATEGORY_LIFTED_ENTITY;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a subentity to the actor.
 *
 * @param {Object}   subentity                             - subentity definition
 * @param {number}   subentity.bindingPointCategory        - binding type (see below)
 * @param {number}   subentity.bindingPointIndex           - binding index
 * @param {Object}   subentity.subEntityLook               - look object
 * @param {number}   subentity.subEntityLook.bonesId       - bones id
 * @param {number[]} subentity.subEntityLook.indexedColors - colors
 * @param {number[]} subentity.subEntityLook.scales        - scales on X and Y
 * @param {number[]} subentity.subEntityLook.skins         - skin ids
 * @param {Object[]} subentity.subEntityLook.subentities   - a list of subentities definition
 */
Actor.prototype.addSubentity = function (subentity, options, cb) {
	var self = this;
	Entity.prototype.addSubentity.call(this, subentity, options, function (subentityAnimManager) {
		if (subentity.bindingPointCategory === HOOK_POINT_CATEGORY_MOUNT_DRIVER) {
			self.riderEntity = subentityAnimManager;
		}
		return cb && cb(subentityAnimManager);
	});
};



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Add a lifted subentity to the actor.
 *
 * @param {Object} target - Actor instance, character to be carried.
 */
Actor.prototype.carryCharacter = function (target) {
	var self = this;

	if (this.animManager.isTemporary) {
		// actor is still void and not ready to add a carried character
		console.warn('Actor animManager is not ready.');
		// HACK: delay the function call with setTimeout. TODO: find a better solution to this problem
		window.setTimeout(function () {
			self.carryCharacter(target);
		}, 2000);
		return;
	}

	var carrier = this.riderEntity || this.animManager;
	carrier.addAnimation({ base: 'carrying', direction: -1 }, function () {
		carrier.addAnimationModifier('AnimStatique', 'AnimStatiqueCarrying');
		carrier.addAnimationModifier('AnimMarche',   'AnimMarcheCarrying');
		carrier.addAnimationModifier('AnimCourse',   'AnimCourseCarrying');
		carrier.addAnimationModifier('AnimHit',      'AnimHitCarrying');
		carrier.addAnimationModifier('AnimTacle',    'AnimTacleCarrying');

		var carriedEntity = {
			animManager:          target.animManager,
			bindingPoint:         'carried_3_0',
			symbolModifier:       subentitySymbolModifiers[HOOK_POINT_CATEGORY_LIFTED_ENTITY],
			bindingPointCategory: HOOK_POINT_CATEGORY_LIFTED_ENTITY
		};

		target.parentActor = self;
		self.carriedEntity = carriedEntity;
		self.carriedActor  = target;
		carrier.addSubentity(carriedEntity);

		// TODO: handle creature mode

		target.setDisposition(self.cellId);
		target.getFighterData().isCarryied = true;
		target.y = -1000;
		self.staticAnim();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/subentity.js
 ** module id = 615
 ** module chunks = 0
 **/