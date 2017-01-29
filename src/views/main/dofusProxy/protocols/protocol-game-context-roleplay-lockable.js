var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @param {object}  msg - msg
 * @param {boolean} msg.changeOrUse
 * @param {number}  msg.codeSize
 *
 * @desc Possible known next packets :
 *      ~ LockableUseCodeMessage
 *      ~ LockableChangeCodeMessage
 *      ~ LeaveDialogRequestMessage
 */
connectionManager.on('LockableShowCodeDialogMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// LockableCodeResultMessage
connectionManager.on('LockableCodeResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


// LockableStateUpdateAbstractMessage


// LockableStateUpdateHouseDoorMessage
connectionManager.on('LockableStateUpdateHouseDoorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});


// LockableStateUpdateStorageMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-lockable.js
 ** module id = 113
 ** module chunks = 0
 **/