require('./NewsBlock.less');
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');
var Button = require('Button');
var getText = require('getText').getText;
var haapi = require('haapi');
var helper = require('helper');
var RetractableBlock = require('./RetractableBlock/index.js');
var tapBehavior = require('tapBehavior');

var DELAY_BETWEEN_AUTOMATED_CHANGE = 5000;     // ms
var FORCED_REFRESH_DELAY = 8 * 60 * 60 * 1000; // 8 hours
var TRANSITION_TIME = 600;                     // ms
var NEWS_WIDTH = 475;                          // px
var PAGES = 3;                                 // number of news displayed

function NewsBlock(loginScreen) {
	WuiDom.call(this, 'div', { className: 'NewsBlock', hidden: false });
	var self = this;
	this.loginScreen = loginScreen;

	this._newsLoadedTime = 0;
	this._currentPage = 0;
	this._newsLang = null;
	this._transitioning = false;
	this._setTimoutId = null;

	this._carouselPages = [];
	this._banners = [];
	this._newsUrls = [];
	this._bannerTitles = [];
	this._date = [];
	this._dots = [];

	this._retractableBlock = this.appendChild(new RetractableBlock(true));
	var container = this._retractableBlock.getContainer();
	this._carouselMargin = container.createChild('div', { className: 'carouselMargin' });
	this._carouselWrapper = this._carouselMargin.createChild('div', { className: 'carouselWrapper' });
	helper.cssTransition(this._carouselWrapper, TRANSITION_TIME + 'ms');

	this._dotsWrapper = this._carouselMargin.createChild('div', { className: 'dotsWrapper', hidden: true });

	function setPageTappedEvent(page) {
		function onTap() {
			var newsUrl = self._newsUrls[page];
			if (!newsUrl) { return; }
			helper.openUrlInAppBrowser(newsUrl);
		}
		self._banners[page].on('tap', onTap);
		self._bannerTitles[page].on('tap', onTap);
	}

	for (var page = 0; page < PAGES; page++) {
		// carousel page
		this._carouselPages[page] = this._carouselWrapper.createChild('div', {
			className: ['carouselPage', 'page' + page], hidden: true
		});

		// banner (image)
		this._banners[page] = this._carouselPages[page].createChild('div', { className: ['banner', 'spinner'] });
		tapBehavior(this._banners[page]);

		// news title
		this._bannerTitles[page] = this._carouselPages[page].createChild('div', { className: 'bannerTitle' });
		tapBehavior(this._bannerTitles[page]);

		// date of the news
		this._date[page] = this._carouselPages[page].createChild('div', { className: 'date' });

		// links
		setPageTappedEvent(page);

		// small dots
		this._dots[page] = this._dotsWrapper.createChild('div', { className: 'dot' });
	}

	this._resetTransform();
	this._updateDots();

	this._rightArrow = container.appendChild(new Button({ className: 'rightArrow', hidden: true }, function () {
		if (self._transitioning) { return; }
		self._scrollToNextNews();
	}));

	this._leftArrow = container.appendChild(new Button({ className: 'leftArrow', hidden: true }, function () {
		if (self._transitioning) { return; }
		self._scrollToPrevNews();
	}));

	loginScreen.on('hide', function () {
		for (var page = 0; page < PAGES; page++) {
			self._banners[page].setStyle('backgroundImage', 'initial'); // free up memory
		}
		self._newsLoadedTime = 0;
		self._clearTimeout();
	});
}

inherits(NewsBlock, WuiDom);
module.exports = NewsBlock;

NewsBlock.prototype.refresh = function () {
	this._retractableBlock.show();
	this._retractableBlock.setTitle(getText('tablet.login.news'));
	this._update();
};

NewsBlock.prototype._update = function () {
	var Config = window.Config;
	var self = this;
	if ((Date.now() - this._newsLoadedTime) < FORCED_REFRESH_DELAY && this._newsLang === Config.language) {
		return;
	}
	this._clearTimeout();
	this._rightArrow.hide();
	this._leftArrow.hide();
	this._dotsWrapper.hide();
	this._newsLoadedTime = 0;
	this._banners[this._currentPage].addClassNames('spinner');
	haapi.getNewsList(PAGES, function (err, results) {
		/* // failure scenarios test code
		var i = Math.random();
		if (i < 0.33) { console.log('haapi dead'); err = 'error'; results = undefined; } else
		if (i < 0.66) { console.log('empty'); results = []; } else { console.log('all ok'); }*/

		//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
		if (err || !results) { // haapi is dead or something similar
			return self._noNewsFallback();
		}
		if (!results.length) { // it just no news to display
			self.loginScreen._forumBlock._retractableBlock.expand();
			return self._noNewsFallback();
		}
		self._newsLoadedTime = Date.now();
		for (var page = 0; page < PAGES; page++) {
			var news = results[page];
			var imageUrl = news.image_url;
			self._banners[page].delClassNames(['spinner', 'noNewsFallback']);
			if (imageUrl) {
				self._banners[page].setStyle('backgroundImage', 'url("' + imageUrl + '")');
			}
			self._date[page].setText(news.date);
			self._newsUrls[page] = news.url;
			self._bannerTitles[page].setText(news.title);
		}
		self._rightArrow.show();
		self._leftArrow.show();
		self._dotsWrapper.show();
		self._registerNextNewsChange();
		self._newsLang = Config.language;
	});
};

NewsBlock.prototype._scrollToPrevNews = function () {
	this._scrollNews(-1);
};

NewsBlock.prototype._scrollToNextNews = function () {
	this._scrollNews(1);
};

NewsBlock.prototype._scrollNews = function (direction) {
	if (direction !== -1 && direction !== 1) { return; }
	var self = this;
	if (this._transitioning) { return; }
	this._clearTimeout();
	this._currentPage = (this._currentPage + PAGES + direction) % PAGES;
	helper.cssTransform(this._carouselWrapper, 'translate(' + (direction === 1 ? -NEWS_WIDTH * 2 : 0) + 'px, 0px)');
	this._updateDots();
	this._transitioning = true;
	setTimeout(function () {
		self._resetTransform();
		self._transitioning = false;
		self._registerNextNewsChange();
	}, TRANSITION_TIME + 200);
};

NewsBlock.prototype._updateDots = function () {
	for (var page = 0; page < PAGES; page++) {
		this._dots[page].toggleClassName('selected', this._currentPage === page);
	}
};

NewsBlock.prototype._resetTransform = function () {
	helper.cssTransition(this._carouselWrapper, '0ms');
	helper.forceReflow(this._carouselWrapper);
	helper.cssTransform(this._carouselWrapper, 'translate(-' + NEWS_WIDTH + 'px, 0px)');
	helper.forceReflow(this._carouselWrapper);
	helper.cssTransition(this._carouselWrapper, TRANSITION_TIME + 'ms');

	for (var page = 0; page < PAGES; page++) {
		var isLeftPage = (page === this._currentPage - 1) || ((page - PAGES) === this._currentPage - 1);
		var isCurrentPage = (page === this._currentPage);
		var isRightPage = (page === this._currentPage + 1) || ((page + PAGES) === this._currentPage + 1);
		var shouldShow = isLeftPage || isCurrentPage || isRightPage;

		if (shouldShow) {
			var position = isLeftPage ? 0 : (isCurrentPage ? NEWS_WIDTH : NEWS_WIDTH * 2);
			this._carouselPages[page].setStyle('left', position + 'px');
			this._carouselPages[page].show();
		} else {
			this._carouselPages[page].hide();
		}
	}
};

NewsBlock.prototype._registerNextNewsChange = function () {
	var self = this;
	if (this._setTimoutId !== null) { return; }
	if (this._transitioning) { return; }
	if (self._newsLoadedTime === 0) { return; }
	this._setTimoutId = setTimeout(function () {
		this._setTimoutId = null;
		if (self._newsLoadedTime === 0) { return; }
		self._scrollToNextNews();
		self._registerNextNewsChange();
	}, DELAY_BETWEEN_AUTOMATED_CHANGE);
};

NewsBlock.prototype._clearTimeout = function () {
	if (this._setTimoutId !== null) {
		clearTimeout(this._setTimoutId);
		this._setTimoutId = null;
	}
};

NewsBlock.prototype._noNewsFallback = function () {
	this._newsLoadedTime = 0;
	this._leftArrow.hide();
	this._rightArrow.hide();
	this._dotsWrapper.hide();
	this._clearTimeout();
	for (var page = 0; page < PAGES; page++) {
		this._banners[page].delClassNames('spinner');
		this._bannerTitles[page].setText(getText('tablet.login.noNewsFallback'));
	}
	this._banners[this._currentPage].addClassNames('noNewsFallback');
	this._newsUrls[this._currentPage] = getText('tablet.forum.link');
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/LoginScreen/leftColumn/NewsBlock.js
 ** module id = 990
 ** module chunks = 0
 **/