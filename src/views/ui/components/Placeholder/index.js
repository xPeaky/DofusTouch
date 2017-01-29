require('./styles.less');
var Scroller = require('Scroller');


/**
 * @param {WuiDom} parent - element to hide behind the placeholder
 * @param {object} [options]
 * @param {WuiDom} [options.headerElement] - if a header exists, pass it here
 */
function Placeholder(parent, options) {
	this.parent = parent;

	this.options = options || {};

	this.frame = null;
	this.text = null;
}
module.exports = Placeholder;


/**
 * Sets or "unset" the placeholder text.
 * @param {string} [text] - placeholder's text or null/undefined/'' to hide previous placeholder
 */
Placeholder.prototype.setText = function (text) {
	if (!text) { return this.frame && this.frame.hide(); }

	var parent = this.parent;
	if (!this.frame) {
		this.frame = parent.createChild('div', { className: 'placeholderFrame' });
		if (this.options.headerElement) { this.frame.addClassNames('withHeader'); }
		this.text = this.frame.createChild('div', { className: 'placeholderText' });
	}

	// Compute height - exception for Scroller: an empty scroller has no height so we take its parent's height
	if (parent instanceof Scroller) { parent = parent.getParent(); }
	var height = parent.rootElement.offsetHeight;

	// If element has a header that must be always displayed, remove its height
	if (this.options.headerElement) { height -= this.options.headerElement.rootElement.offsetHeight; }

	this.frame.setStyle('minHeight', height + 'px');
	this.text.setText(text);
	this.frame.show();
};

/**
 * Hides or shows the placeholder (without cheching the current text.
 * NB: does nothing if no text was ever set.
 * @param {boolean} isVisible - note that undefined means "hide"
 */
Placeholder.prototype.toggleDisplay = function (isVisible) {
	if (this.frame) { this.frame.toggleDisplay(!!isVisible); }
};

Placeholder.prototype.refresh = function () {
	if (!this.frame || !this.frame.isVisible()) { return; }
	this.setText(this.text.getText());
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Placeholder/index.js
 ** module id = 317
 ** module chunks = 0
 **/