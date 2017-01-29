function TransformState(sx, sy, r, g, b, a) {
	this.sx = sx;
	this.sy = sy;

	this.r = r;
	this.g = g;
	this.b = b;
	this.a = a;
}

exports.empty = new TransformState(0.10, 0.10, 0.50, 0.50, 0.50, 0.00); // Has to have alpha = 0

// used by spriteBoxes

exports.fullRed   = new TransformState(0.78, 0.78, 0.80, 0.12, 0.08, 0.80);
exports.fullGreen = new TransformState(0.78, 0.78, 0.00, 1.00, 0.22, 0.70);
exports.fullBlue  = new TransformState(0.78, 0.78, 0.00, 0.51, 0.91, 0.80);

exports.walkable     = new TransformState(0.90, 0.90, 1.00, 0.92, 0.00, 0.50);
exports.unwalkable   = new TransformState(0.90, 0.90, 0.90, 0.00, 0.00, 0.80);
exports.walkableLast = new TransformState(0.90, 0.90, 1.00, 1.00, 0.00, 0.80);

// spell related

exports.inSight      = new TransformState(0.78, 0.78, 0.00, 0.00, 1.00, 0.50);
exports.outSight     = new TransformState(0.78, 0.78, 0.60, 0.60, 1.00, 0.50);
exports.areaOfEffect = new TransformState(0.78, 0.78, 1.00, 0.00, 0.00, 0.90);

// spell related, not users turn

exports.inSightEnemyTurn      = new TransformState(0.78, 0.78, 0.30, 0.30, 0.30, 0.80);
exports.outSightEnemyTurn     = new TransformState(0.78, 0.78, 0.50, 0.50, 0.50, 0.70);
exports.areaOfEffectEnemyTurn = new TransformState(0.78, 0.78, 1.00, 1.00, 1.00, 1.00);

// used by targetIndicators

exports.blueTeamStart = new TransformState(1.00, 1.00, 0.00, 0.00, 1.00, 0.50);
exports.blueTeamEnd   = new TransformState(0.95, 1.00, 0.10, 0.40, 0.80, 0.45);
exports.redTeamStart  = new TransformState(1.00, 1.00, 1.00, 0.00, 0.00, 0.50);
exports.redTeamEnd    = new TransformState(0.95, 1.00, 0.80, 0.40, 0.10, 0.45);

// used by walkable area

exports.walkArea           = new TransformState(1.00, 1.00, 0.00, 0.90, 0.02, 0.30);
exports.walkAreaRequiresAP = new TransformState(1.00, 1.00, 0.00, 0.43, 0.40, 0.40);
exports.walkAreaRestricted = new TransformState(1.00, 1.00, 1.00, 0.00, 0.00, 0.40);

exports.enemyWalkArea           = new TransformState(1.000, 1.000, 0.100, 0.900, 0.032, 0.600);
exports.enemyWalkAreaRequiresAP = new TransformState(1.000, 1.000, 0.100, 0.435, 0.400, 0.600);
exports.enemyWalkAreaRestricted = new TransformState(0.900, 0.900, 1.000, 0.000, 0.000, 0.600);

exports.TransformState = TransformState;

// if you need translation or rotation, add it.


// old user movement zone
// color: 'rgba(144,112,16,0.3)', outline: '#971' });



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/grid/transformStates/index.js
 ** module id = 66
 ** module chunks = 0
 **/