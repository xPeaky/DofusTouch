var connectionManager = require('dofusProxy/connectionManager.js');


connectionManager.on('NotificationListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('NotificationByServerMessage', function (msg) {
	console.info('NotificationByServerMessage: ', 'id:' + msg.id, msg.parameters);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-notification.js
 ** module id = 102
 ** module chunks = 0
 **/