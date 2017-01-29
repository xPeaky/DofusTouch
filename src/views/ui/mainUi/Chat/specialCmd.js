var protocolConstants = require('protocolConstants');
var getText = require('getText').getText;
var DofusDate = require('timeManager').DofusDate;

/**
 * Special commands are whois, whoami, mapid, time
 * @param {string} cmd
 * @param {array} [args]
 * @return {boolean} - Return true if it was a special command
 */
module.exports = function (cmd, args) {
	/**
	 * Send WHOIS request if you args are correct
	 * @return {boolean} true if the request has been correctly send
	 */
	function sendWhoisRequest() {
		args = args || [];
		if (args.length === 0 || args[0].length > protocolConstants.MAX_PLAYER_OR_ACCOUNT_NAME_LEN) {
			return;
		}
		window.dofus.sendMessage('BasicWhoIsRequestMessage', {
			search: args[0],
			verbose: true
		});
		return true;
	}

	cmd = cmd.toLowerCase();

	if (cmd === 'whois') {
		return sendWhoisRequest();
	} else if (cmd === 'whoami') {
		window.dofus.sendMessage('BasicWhoAmIRequestMessage', { verbose: true });
		return true;
	} else if (cmd === 'mapid') {
		var mapId = window.isoEngine.mapRenderer.mapId;

		// "ui.chat.console.currentMap": "Current map: %2", //3663604
		var text = getText('ui.chat.console.currentMap', null, mapId); // warning: mapId is the second arg, the first
	                                                                   // one is not used
		window.gui.chat.logMsg(text);
		return true;
	} else if (cmd === 'time') {
		var date = new DofusDate(Date.now() / 1000/*in sec*/).getServerDate().toString(/*useDofusYear = */true);
		var dateText = getText('ui.time.dateLetters', date.day, date.monthName, date.year) + ' - ' + date.time;
		window.gui.chat.logMsg(dateText);
		return true;
	}
	// default
	return false;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Chat/specialCmd.js
 ** module id = 453
 ** module chunks = 0
 **/