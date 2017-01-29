module.exports = {
	shed: {
		equip: 2,  // Shed to equip
		free: 3,  // Free from shed
		certificate: 4,  // Shed to certificate
		paddock: 6,  // Shed to paddock
		sterilize: 17  // Sterilize from shed
	},
	paddock: {
		shed: 7,  // Paddock to shed
		free: 8,  // Free from paddock
		equip: 10,  // Paddock to equip
		certificate: 14,  // Paddock to certificate
		sterilize: 19  // Sterilizer from paddock
	},
	equip: {
		shed: 1,  // Equip to shed
		paddock: 9,  // Equip to paddock
		free: 11,  // Free from equip
		certificate: 13,  // Equip to certificate
		sterilize: 18  // Sterilize from equip
	},
	certificate: {
		shed: 5, // Certificate to shed
		paddock: 16, // Certificate to paddock
		equip: 15 // Certificate to equip
		// free: 12  // Free from certificate; COMMENTED since server refuses (Flash fails too)
	}
};

// NOTE: enum[from/at][action/to];


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/ExchangeHandleMountEnum/index.js
 ** module id = 658
 ** module chunks = 0
 **/