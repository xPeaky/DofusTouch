/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Étape pour laquelle on envoie le message de sortie de la file d'attente d'arène  */
module.exports = {
	/** On est dans la file d'attente de combat d'arène. */
	ARENA_STEP_REGISTRED: 0,
	/** On sort de la file d'attente d'arène car on attend la validation d'un combat d'arène. */
	ARENA_STEP_WAITING_FIGHT: 1,
	/** On sort de la file d'attente d'arène car on commence un combat d'arène. */
	ARENA_STEP_STARTING_FIGHT: 2,
	/** On se désinscrit entièrement du système de combat d'arène. */
	ARENA_STEP_UNREGISTER: 3
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/PvpArenaStepEnum/index.js
 ** module id = 538
 ** module chunks = 0
 **/