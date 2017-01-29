var connectionManager = require('dofusProxy/connectionManager.js');


// SystemMessageDisplayMessage
connectionManager.on('SystemMessageDisplayMessage', function (msg) {
	window.gui.openSimplePopup(msg.text, msg.title);
	if (msg.hangUp) {
		window.gui.disconnect();
		window.isoEngine.disconnect();
	}
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-server-basic.js
 ** module id = 150
 ** module chunks = 0
 **/