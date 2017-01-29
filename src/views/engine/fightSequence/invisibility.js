//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightInvisibilityMessage
 * @desc A character set itself invisible / lose his invisibility / is detected.
 *
 * @param {number} msg.actionId - action id (and action text)
 * @param {number} msg.sourceId - source actor (human, monstres, etc.) id.
 *
 * @param {number} msg.targetId - target actor (human, monster, etc.) id
 * @param {number} msg.state    - invisibility state { 1: INVISIBLE, 2: DETECTED, 3: VISIBLE }
 */
exports.setVisibility = function (msg, animSequence) {
	var actorManager = window.actorManager;
	var actor = actorManager.getActor(msg.targetId);
	if (!actor) { return; }

	animSequence.push(function seqInvisibility(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		// update target's fighterData.invisibilityState
		var actorData = actor.getFighterData();
		// update target invisibility
		actor.setInvisibility(msg.state, actorData.teamId);

		return cb();
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightVanishMessage
 * @desc A character vanish in a fight. Play vanish animation without displaying message.
 *
 * @param {number} msg.actionId - action id (and action text)
 * @param {number} msg.sourceId - source actor (human, monstres, etc.) id.
 * @param {number} msg.targetId - vanishing character id (human, monsters, etc)
 */
exports.vanish = function (msg, animSequence) {
	var actorManager = window.actorManager;
	var target = actorManager.getActor(msg.targetId);
	if (!target) {
		return console.warn('No found actor with id ' + msg.targetId);
	}

	animSequence.push(function seqVanish(cb) {
		window.gui.transmitFightSequenceMessage(msg);
		target.oneShootAnim({ base: 'AnimVanish' }, false, function () {
			actorManager.removeActor(msg.targetId);
			return cb();
		});
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightInvisibleObstacleMessage
 * @desc Un obstacle invisible rend une action impossible
 *
 * @param {number} actionId - action id (and action text)
 * @param {number} sourceId - source actor (human, monstres, etc.) id.
 * @param {number} sourceSpellId - Identifiant du niveau du sort utilisé lors de l'action impossible,
 *                                 -1 pour du corps à corps
 */



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** GameActionFightInvisibleDetectedMessage
 * @desc Un personnage invisible dévoile brievement sa position
 *
 * @param {number} msg.actionId - action id (and action text)
 * @param {number} msg.sourceId - source actor (human, monstres, etc.) id.
 * @param {number} msg.targetId - Identifiant du personnage (human, monstres, etc) détecté
 * @param {number} msg.cellId   - La cellule où le personnage est détecté
 */
exports.detected = function (msg, animSequence) {
	var actorManager = window.actorManager;
	var target = actorManager.getActor(msg.targetId);
	if (!target) {
		return console.error('No found actor with id ' + msg.targetId);
	}

	// play detected animation only if teamId is different from user
	var targetData = target.getFighterData();
	var userData = actorManager.userActor.getFighterData();
	if (targetData.teamId === userData.teamId) { return; }

	animSequence.push(function seqDetected(cb) {
		// display a shadow of actor and fade it away
		target.invisibleDetectedAnimation();
		return cb();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/fightSequence/invisibility.js
 ** module id = 1045
 ** module chunks = 0
 **/