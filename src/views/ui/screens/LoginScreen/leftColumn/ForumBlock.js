require('./ForumBlock.less');
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');
var bbcode = require('epochtalk-bbcode-parser');
var getText = require('getText').getText;
var haapi = require('haapi');
var helper = require('helper');
var RetractableBlock = require('./RetractableBlock/index.js');

function ForumBlock() {
	WuiDom.call(this, 'div', { className: 'ForumBlock', hidden: false });

	this._newsLoaded = false;

	this._retractableBlock = this.appendChild(new RetractableBlock(false));
	var wrapper = this._retractableBlock.getContainer().createChild('div', { className: ['forumNewsMargin'] });
	this._content = wrapper.createChild('div', { className: ['forumNews'] });

	enrichBbCodeLibrary();
}

inherits(ForumBlock, WuiDom);
module.exports = ForumBlock;

ForumBlock.prototype.refresh = function () {
	this._retractableBlock.show();
	this._retractableBlock.setTitle(getText('tablet.login.changelog'));
	this._update();
};

ForumBlock.prototype._update = function () {
	var self = this;

	this._content.clearContent();
	this._content.addClassNames('spinner');

	// retrieve the list of all topics from the thread
	haapi.getForumTopicsList(function (error, topicsList) {
		if (error) {
			if (window.developmentMode) { console.error(error); }
			self._content.delClassNames('spinner');
			self._content.setHtml(getText('tablet.login.forumUnreachable'));
			helper.allLinksOnTargetBlank(self._content);
			return;
		}

		// retrieve the most recent topic
		var lastTopic = getMostRecentTopic(topicsList);

		// retrieve all posts from this topic
		haapi.getForumPostsList(lastTopic.id, function (error, postsList) {
			self._content.delClassNames('spinner');
			if (error) {
				self._content.setHtml(getText('tablet.login.forumUnreachable'));
				helper.allLinksOnTargetBlank(self._content);
				return;
			}

			var i;
			var posts = [lastTopic].concat(postsList);

			// formating content
			var html = '';
			for (i = 0; i < posts.length; i++) {
				if (i === 0) {
					html += '<h2>' + posts[i].title + '</h2><br/>';
				} else {
					html += '<br /><br /><center>* * *</center><br />';
				}
				var content = posts[i].content;

				content = bbcodePreProcess(content);
				content = bbcode.process({ text: content }).html;
				content = bbcodePostProcess(content);

				html += content;
			}

			// html injection
			self._content.setHtml(html);

			// update <a href> tags to use Cordova's browser plugin (requiring to use window.open)
			helper.allLinksOnTargetBlank(self._content);

			// set title's sub-title
			self._retractableBlock.setSubTitle(lastTopic.title);
		});
	});
};

function getMostRecentTopic(data) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	data = data.filter(function (elm) {
		return !elm.pinned;
	});
	data.sort(function (date1, date2) {
		return Date.parse(date2.added_date) - Date.parse(date1.added_date);
	});
	return data[0];
}

function enrichBbCodeLibrary() {
	var unsupportedTag = {
		openTag: function () {
			return '<center>' + getText('tablet.login.forumUnsupportedTag') + '</center><br />';
		},
		closeTag: function () {
			return '';
		},
		displayContent: false
	};

	bbcode.addTags({
		h2: {
			openTag: function () {
				return '<h3>';
			},
			closeTag: function () {
				return '</h3>';
			}
		},
		h3: {
			openTag: function () {
				return '<h4>';
			},
			closeTag: function () {
				return '</h4>';
			}
		},
		hr: {
			openTag: function () {
				return '<br /><hr class="postSeparator"><br />';
			},
			closeTag: function () {
				return '';
			}
		},
		embed: unsupportedTag,
		spoiler: unsupportedTag
	});
}

function bbcodePreProcess(content) {
	content = content.replace(/\[hr\]/g, '[hr][/hr]');
	content = content.replace(/\[list=1\]/g, '[list type=decimal]');
	return content;
}

function bbcodePostProcess(content) {
	content = content.replace(/(?:\r\n|\r|\n)/g, '<br />');
	return content;
}



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/LoginScreen/leftColumn/ForumBlock.js
 ** module id = 994
 ** module chunks = 0
 **/