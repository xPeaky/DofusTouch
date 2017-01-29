require('./styles.less');
var addTooltip = require('TooltipBox').addTooltip;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');
var playUiSound = require('audioManager').playUiSound;

var addIconStringValues = ['before', 'after'];


/**
 * Button without style
 *
 * @param {object}   [options]              - These options will be given to WuiDom
 * @param {boolean}  [options.disable]      - Disable the button at the creation
 * @param {string|WuiDom|function} [options.tooltip]      - Add tooltip by default.
 *                   You can either give a string or WuiDom object or a method that returns either of them.
 * @param {number}   [options.repeatDelay]  - (msec) The delay between the repeat of the action
 * @param {boolean}  [options.scaleOnPress] - Add animation on press (default is true)
 * @param {string}   [options.sound]        - Audio sound code (cf. audioManager's uiSoundEnum.js)
 * @param {string}   [options.addIcon]      - 'before' or 'after' => adds a "btnIcon" div; default is no icon div.
 *                                             boolean value is OK too; true => same as 'after'; false => no icon div.
 *
 *        There also the options from wuiDom
 *
 * @param {function} action - The tap execution
 * @constructor
 */
function Button(options, action) {
	options = options || {};
	WuiDom.call(this, 'div', options);
	this.addClassNames('Button');

	tapBehavior(this, { repeatDelay: options.repeatDelay, doubletapTimeout: 1 }); // disable doubletap

	var addIcon = options.addIcon;
	if (addIcon) {
		if (typeof addIcon === 'string' && addIconStringValues.indexOf(addIcon) < 0) {
			return console.error('Invalid addIcon option:', addIcon);
		}
		var iconDiv = new WuiDom('div', { className: 'btnIcon' });

		if (addIcon === 'before') { this.appendChild(iconDiv); }
		if (options.text) { this.createChild('div', { className: 'btnText', text: options.text }); }
		if (addIcon === 'after' || addIcon === true) { this.appendChild(iconDiv); }
	}

	if (options.scaleOnPress || options.scaleOnPress === undefined) {
		this.addClassNames('scaleOnPress');
	}

	if (options.tooltip) {
		addTooltip(this, options.tooltip);
	}

	if (typeof action === 'function') {
		this.on('tap', action);
	}
	this.on('tap', function () {
		playUiSound(options.sound || 'GEN_BUTTON');
	});

	// Register event listener for custom display
	this.on('tapstart', function () {
		this.addClassNames('pressed');
	});

	this.on('tapend', function () {
		this.delClassNames('pressed');
	});

	this.on('enable', function (enable) {
		this.toggleClassName('disabled', !enable);
	});

	if (options.disable) {
		this.disable();
	}
}
inherits(Button, WuiDom);

module.exports = Button;

// DEPRECATED: use Button class above.
// Example:
//   new DofusButton(caption, { className: myBtnClass });
// becomes:
//   new Button({ text: caption, className: ['greenButton', myBtnClass] });
function DofusButton(caption, options, action) {
	options = options || {};
	options.text = caption;
	Button.call(this, options, action);
	this.addClassNames('button'); // TODO: replace all uses (around 17 now) of 'button' className by 'greenButton'
}
inherits(DofusButton, Button);
Button.DofusButton = DofusButton;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Button/index.js
 ** module id = 203
 ** module chunks = 0
 **/