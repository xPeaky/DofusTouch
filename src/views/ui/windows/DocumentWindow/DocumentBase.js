var WuiDom = require('wuidom');
var CompassTypeEnum = require('CompassTypeEnum');
var inherits = require('util').inherits;
var tapEvents = require('tapHelper').events;
var helper = require('helper');

var EXP_IMG = /(.*?)(<img.*?\/?>)/gi;
var EXP_DIESE = /#+/g;
var EXP_LINK = /<a\shref=['"](.*?)['"]\s*>(.*?)<\/a>/gi; // detect the a html tags
var EXP_ATTR = /([-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))/g;

// Constants

var START_QUEST = 'startquest'; // magic link id to start a quest
var VALIDATE_OBJECTIVE = 'validateobjective'; // magic link id to validate an objective
var GO_TO_COORDINATE = 'map'; // magic link id to add a point on the map
var NAVIGATE_TO_URL = 'url'; // magic link id to go to open a web page

function DocumentBase() {
	WuiDom.call(this, 'div', { hidden: true });

	this._styleSheet = null; // feuille de style

	this._title = null;
	this._author = null;
	this._subTitle = null;
	this._pages = null;
}

inherits(DocumentBase, WuiDom);
module.exports = DocumentBase;


DocumentBase.prototype._linkHandler = function (textEvent) {
	var param = textEvent.split(',');

	if (param[0] === START_QUEST) {
		window.dofus.sendMessage('QuestStartRequestMessage', { questId: param[1] });
		this.close();
	} else if (param[0] === VALIDATE_OBJECTIVE) {
		window.dofus.sendMessage('QuestObjectiveValidationMessage', { questId: param[1], objectiveId: param[2] });
		this.close();
	} else if (param[0] === GO_TO_COORDINATE) {
		window.gui.emit('CompassUpdateMessage', {
			type: CompassTypeEnum.COMPASS_TYPE_SIMPLE,
			worldX: ~~param[1],
			worldY: ~~param[2]
		});
	}
};

DocumentBase.prototype.close = function () {
	this.emit('close');
};

DocumentBase.prototype._getImageData = function (page) {
	// get the img tag
	var exp = new RegExp(EXP_IMG);
	var data = exp.exec(page);

	if (!data) {
		return null;
	}

	var imgTag = data[2];

	var expAttr = new RegExp(EXP_ATTR);

	var m;
	var attr = {};
	while ((m = expAttr.exec(imgTag)) !== null) {
		if (m.index === expAttr.lastIndex) {
			expAttr.lastIndex++;
		}
		attr[m[1]] = m[2] || m[3];
	}

	var imgData = {};

	imgData.regExpResult = data[0];

	imgData.before = data[1];

	var source = attr.src.replace(EXP_DIESE, '');
	var bookImgInfo = source.split(',');

	// set asset url
	if (bookImgInfo[0] === 'swf') {
		// special case for swf: we converted them to png and put them in a special directory
		source = 'gfx/documents/swf/' + bookImgInfo[1] + '.png';
	} else {
		source = 'gfx/documents/' + bookImgInfo[1] + '.' + bookImgInfo[0];
	}

	imgData.imageId = source;
	imgData.width = parseInt(attr.width, 10);
	imgData.height = parseInt(attr.height, 10);
	imgData.hspace = parseInt(attr.hspace, 10);
	imgData.align = attr.align || '';

	return imgData;
};


/**
 * @param {string} page
 * @returns {Array}
 */
DocumentBase.prototype._getAllImagesData = function (page) {
	var images = [];

	var data;
	var exp = new RegExp(EXP_IMG);
	while ((data = exp.exec(page)) !== null) {
		images.push(this._getImageData(data[0]));
	}
	return images;
};


/**
 * @param {string} page
 * @returns {Array}
 */
DocumentBase.prototype._getAllLinks = function (page) {
	var links = [];
	var data;
	var exp = new RegExp(EXP_LINK);

	while ((data = exp.exec(page)) !== null) {
		links.push({
			text: data[2],
			href: data[1].replace('event:', ''),
			original: data[0]
		});
	}
	return links;
};


/**
 * Duplication of the function for the books
 * @protected
 */
DocumentBase.prototype._formatText = function (t) {
	var newText = t;

	newText = newText.replace(/\n/g, ' ');
	newText = newText.replace(/\r/g, ' ');
	newText = newText.replace(/\t/g, '');
	newText = newText.replace(/<p><\/p>/g, '<br/>');

	return newText;
};

/**
 * Find links and add click event to parse the id in the href.
 * We need to work directly with DOM element to avoid messing the HTML structure.
 * @param {string} strText
 * @private
 */
DocumentBase.prototype._formatLinks = function (strText) {
	var self = this;

	// Need to work directly with DOM element to avoid messing the HTML structure

	function createLink(tag, href, external) {
		if (external) {
			tag.addEventListener(tapEvents.end, function (e) {
				helper.openUrlInAppBrowser(href);
				e.preventDefault();
			});
		} else {
			tag.addEventListener(tapEvents.end, function (e) {
				self._linkHandler(href);
				e.preventDefault();
			});
		}
	}

	var content = new WuiDom('div');
	content.setHtml(strText);

	var tags = content.rootElement.getElementsByTagName('a');

	for (var i = 0, len = tags.length; i < len; i++) {
		var tag = tags[i];
		var href = tag.href.replace('event:', '');


		if (href.indexOf(NAVIGATE_TO_URL) !== -1) {
			// In case of "real" links
			createLink(tag, href.split(',')[1], true);
		} else {
			createLink(tag, href);
			tag.href = '#';
		}
	}

	return content;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/DocumentWindow/DocumentBase.js
 ** module id = 712
 ** module chunks = 0
 **/