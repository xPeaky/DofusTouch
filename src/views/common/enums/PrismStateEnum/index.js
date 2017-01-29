/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : État d'un prisme d'alliance */
module.exports = {
	/** État « invulnérable » du prisme : il vient d'être posé, et ne peut être attaqué */
	PRISM_STATE_INVULNERABLE: 0,
	/** État de base du prisme */
	PRISM_STATE_NORMAL: 1,
	/** Prisme attaqué, phase de ralliement pré-combat */
	PRISM_STATE_ATTACKED: 2,
	/** Prisme en combat */
	PRISM_STATE_FIGHTING: 3,
	/** État « affaibli » du prisme : le prisme a été battu une première fois, durée (24+x)h */
	PRISM_STATE_WEAKENED: 4,
	/** État « vulnérable » du prisme : Phase « King of the Hill »  */
	PRISM_STATE_VULNERABLE: 5,
	/** État « vaincu » du prisme : il peut être remplacé */
	PRISM_STATE_DEFEATED: 6
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/PrismStateEnum/index.js
 ** module id = 345
 ** module chunks = 0
 **/