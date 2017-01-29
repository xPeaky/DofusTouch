/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les types d'échange possibles */
module.exports = {
	/** Achat/vente dans un magasin d'un npc. */
	NPC_SHOP: 0,
	/** Échange entre deux joueurs. */
	PLAYER_TRADE: 1,
	/** Échange d'objets avec d'un npc. */
	NPC_TRADE: 2,
	/** Interaction avec un atelier. */
	CRAFT: 3,
	/** Échange avec les joueurs deconnectés en mode marchand. */
	DISCONNECTED_VENDOR: 4,
	/** Echange avec un coffre, ou la banque. */
	STORAGE: 5,
	/** Modifier son inventaire de magasin */
	SHOP_STOCK: 6,
	/** Échange avec un percepteur. */
	TAXCOLLECTOR: 8,
	/** Échange d'objets : génère un nouvel objet en fonction des effets de celui proposé. */
	NPC_MODIFY_TRADE: 9,
	/** Mise en vente d'objet dans les hôtels de vente. */
	BIDHOUSE_SELL: 10,
	/** Achat d'objet dans les hôtels de vente. */
	BIDHOUSE_BUY: 11,
	/** Multicraft : Confectionneur / artisan / fabriquant */
	MULTICRAFT_CRAFTER: 12,
	/** Multicraft : client */
	MULTICRAFT_CUSTOMER: 13,
	/** Bible des artisans */
	JOB_INDEX: 14,
	/** Échange avec l'inventaire de montures */
	MOUNT: 15,
	/** Échange avec l'enclos des montures */
	MOUNT_STABLE: 16,
	/** Échange avec un NPC pour réssuciter un famillié mourru */
	NPC_RESURECT_PET: 17,
	/** Échange de monture avec NPC */
	NPC_TRADE_MOUNT: 18,
	/** Consultation des maisons en vente avec NPC */
	REALESTATE_HOUSE: 19,
	/** Consultation des enclos en vente avec NPC */
	REALESTATE_FARM: 20
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/ExchangeTypeEnum/index.js
 ** module id = 417
 ** module chunks = 0
 **/