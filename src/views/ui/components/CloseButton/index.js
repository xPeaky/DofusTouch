var inherits = require('util').inherits;
var Button = require('Button');

function CloseButton(options, action) {
	options = options || {};
	var defaultOptions = {
		className: 'closeButton',
		sound: 'CANCEL_BUTTON'
	};
	for (var option in defaultOptions) {
		if (options[option] === undefined) {
			options[option] = defaultOptions[option];
		}
	}
	Button.call(this, options, action);
}

inherits(CloseButton, Button);
module.exports = CloseButton;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/CloseButton/index.js
 ** module id = 403
 ** module chunks = 0
 **/