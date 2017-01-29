var EXP_RULE = /(\.*?[a-z0-9_\-]+?)[ ]*{[ ]*(.*?\/?)[ ]*}/gi;

function createStyleSheet() {
	// Create the <style> tag
	var style = document.createElement('style');

	// WebKit hack :(
	style.appendChild(document.createTextNode(''));

	// Add the <style> element to the page
	document.head.appendChild(style);

	return style;
}

function addCSSRule(sheet, selector, rules, index) {
	if ('insertRule' in sheet) {
		sheet.insertRule(selector + '{' + rules + '}', index);
	} else if ('addRule' in sheet) {
		sheet.addRule(selector, rules, index);
	}
}

function CSSParser() {
	this.styleTag = null;
}

module.exports = CSSParser;


CSSParser.prototype.destroy = function () {
	if (!this.styleTag) { return; }
	document.head.removeChild(this.styleTag);
	this.styleTag = null;
};

CSSParser.prototype.create = function (rawRules, classPrefix) {
	if (!this.styleTag) {
		this.styleTag = createStyleSheet();
	}

	var sheet = this.styleTag.sheet;
	var exp = new RegExp(EXP_RULE);
	var rule;

	while ((rule = exp.exec(rawRules)) !== null) {
		if (rule.index === exp.lastIndex) {
			exp.lastIndex++;
		}

		if (classPrefix) {
			if (rule[1] === 'body') {
				rule[1] = classPrefix;
			} else {
				rule[1] = classPrefix + ' ' + rule[1];
			}
		}

		addCSSRule(sheet, rule[1], rule[2], 0);
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/DocumentWindow/CSSParser.js
 ** module id = 713
 ** module chunks = 0
 **/