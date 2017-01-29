var connectionManager = require('dofusProxy/connectionManager.js');


// LeaveDialogMessage
connectionManager.on('LeaveDialogMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PauseDialogMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-dialog.js
 ** module id = 123
 ** module chunks = 0
 **/