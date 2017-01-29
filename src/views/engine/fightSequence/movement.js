
//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function displayUserMovementZone(actorId) {
	if (actorId === window.actorManager.userId) {
		window.isoEngine.displayUserMovementZone();
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function clearUserMovementZone(actorId) {
	if (actorId === window.actorManager.userId) {
		window.isoEngine.clearUserMovementZone();
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameMapMovementMessage
 *
 * @param {number}   msg.actorId      - moving actor id
 * @param {number[]} msg.keyMovements - list of cell id defining movement path
 */
exports.mapMovement = function (msg, animSequence) {
	animSequence.push(function seqMapMovement(cb) {
		clearUserMovementZone(msg.actorId);
		window.gui.transmitFightSequenceMessage(msg);
		window.actorManager.actorMovement(msg, cb);
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightSlideMessage */
exports.slideMovement = function (msg, animSequence) {
	if (msg.startCellId === -1 || msg.endCellId === -1) { return; }
	animSequence.push(function seqSlideMovement(cb) {
		clearUserMovementZone(msg.actorId);
		window.gui.transmitFightSequenceMessage(msg);
		window.actorManager.actorMovement({
			actorId: msg.targetId,
			keyMovements: [msg.startCellId, msg.endCellId],
			slide: true
		}, cb);
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Teleport an actor to a position
 *
 * @param {number} msg.targetId - target actor id
 * @param {number} msg.cellId   - new position of target actor
 */
exports.teleport = function (msg, animSequence) {
	if (msg.cellId === -1) { return; }
	var actor = window.actorManager.getActor(msg.targetId);
	if (!actor) { return; }
	animSequence.push(function seqTeleport(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		actor.setDisposition(msg.cellId);
		displayUserMovementZone(msg.targetId);
		return cb();
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Exchange positions of caster and target actors.
 *
 * @param {number} msg.sourceId     - caster actor id
 * @param {number} msg.targetId     - target actor id
 * @param {number} msg.casterCellId - new position of caster
 * @param {number} msg.targetCellId - new position of target
 */
exports.exchangePositions = function (msg, animSequence) {
	var source = window.actorManager.getActor(msg.sourceId);
	var target = window.actorManager.getActor(msg.targetId);

	animSequence.push(function seqExchangePositions(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		if (source) { source.setDisposition(msg.casterCellId); }
		if (target) { target.setDisposition(msg.targetCellId); }
		displayUserMovementZone(msg.sourceId);
		displayUserMovementZone(msg.targetId);
		return cb();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/fightSequence/movement.js
 ** module id = 1043
 ** module chunks = 0
 **/