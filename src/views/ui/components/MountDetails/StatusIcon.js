require('./StatusIcon.less');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var TooltipBox = require('TooltipBox');
var WuiDom = require('wuidom');


/**
 * @param {string} [className]
 * @param {object} [options]
 * @param {string} [options.tooltip] - tooltip text; tooltip is disabled if undefined
 */
function StatusIcon(className, options) {
	WuiDom.call(this, 'div', { className: ['statusIcon', className] });

	options = options || {};
	this.isEnabled = false;

	this.tooltipText = options.tooltip;
	if (options.tooltip !== undefined) {
		TooltipBox.addTooltip(this, genericTooltipHandler);
	}
}
inherits(StatusIcon, WuiDom);
module.exports = StatusIcon;


function genericTooltipHandler() {
	// "this" is the WuiDom
	if (this.isEnabled === false) {
		return new WuiDom('div', { className: 'disabledTooltipFeature', text: this.tooltipText });
	}
	return this.tooltipText;
}

StatusIcon.prototype.setEnabled = function (isEnabled) {
	this.isEnabled = isEnabled;
	this.toggleClassName('disabled', !isEnabled);
};

StatusIcon.prototype.setFertileIcon = function (fertilityState, showDisabled) {
	var isDisabled = false;

	if (fertilityState.isNewborn) {
		this.replaceClassNames(['disabled', 'fertile', 'pregnant', 'sterile'], ['newborn']);
		this.tooltipText = getText('ui.mount.filterBorn');
	} else if (fertilityState.fecondationTime >= 0) {
		this.replaceClassNames(['disabled', 'fertile', 'neutered', 'newborn', 'sterile'], ['pregnant']);
		this.tooltipText = getText('ui.mount.pregnantSince', fertilityState.fecondationTime);
	} else if (!fertilityState.canReproduce) {
		this.replaceClassNames(['disabled', 'fertile', 'pregnant', 'newborn'], ['sterile']);
		var isNeutered = fertilityState.isNeutered;
		this.toggleClassName('neutered', isNeutered);
		this.tooltipText = getText(isNeutered ? 'ui.mount.castrated' : 'ui.mount.sterilized');
	} else if (fertilityState.isFecondationReady || showDisabled) {
		this.replaceClassNames(['pregnant', 'neutered', 'newborn', 'sterile'], ['fertile']);
		isDisabled = showDisabled && !fertilityState.isFecondationReady;
		this.toggleClassName('disabled', isDisabled);
		this.tooltipText = getText('ui.mount.fecondable');
	} else {
		this.hide();
		return;
	}
	this.show();
	this.isEnabled = !isDisabled;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/MountDetails/StatusIcon.js
 ** module id = 669
 ** module chunks = 0
 **/