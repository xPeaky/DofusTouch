require('./styles.less');
var Button = require('Button');
var inherits = require('util').inherits;
var InputBox = require('InputBox');
var WuiDom = require('wuidom');


function SearchBox(options) {
	WuiDom.call(this, 'div', { className: 'searchBox' });

	options = options || {};
	this.maxLength = options.maxLength || 50;

	this._createContent();
}
inherits(SearchBox, WuiDom);
module.exports = SearchBox;


SearchBox.prototype.clear = function () {
	this.searchInput.setValue('');
	this.cancelBtn.hide();
};

// NB: this is just for "initializing" the input field content - does not trigger event
SearchBox.prototype.setValue = function (text) {
	this.searchInput.setValue(text);
	this.cancelBtn.toggleDisplay(typeof text === 'string' && text !== '');
};

function searchInputChangeHandler() {
	this.mySearchBox.cancelBtn.show();
}

function searchBtnHandler() {
	var self = this.mySearchBox;
	self.emit('search', self.searchInput.getValue());
}

function cancelBtnHandler() {
	var self = this.mySearchBox;
	self.cancelBtn.hide();
	self.clear();
	self.searchInput.blur();
	self.emit('cancel');
}

SearchBox.prototype._createContent = function () {
	var inpFrame = this.createChild('div', { className: 'inputFrame' });
	var searchInput = this.searchInput = inpFrame.appendChild(new InputBox({ attr: { maxLength: this.maxLength } }));
	searchInput.mySearchBox = this;
	searchInput.on('change', searchInputChangeHandler);
	searchInput.on('validate', searchBtnHandler);

	var cancelBtn = this.cancelBtn = inpFrame.appendChild(
		new Button({ className: 'cancelBtn', addIcon: true, hidden: true },
			cancelBtnHandler));
	cancelBtn.mySearchBox = this;

	var searchBtn = this.appendChild(
		new Button({ className: 'searchBtn', addIcon: true }, searchBtnHandler));
	searchBtn.mySearchBox = this;
};

SearchBox.prototype.showAsSearching = function (isSearching) {
	this.toggleClassName('spinner', isSearching);
	this.searchInput.setEnable(!isSearching);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SearchBox/index.js
 ** module id = 404
 ** module chunks = 0
 **/