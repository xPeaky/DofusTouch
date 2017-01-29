
exports.tween = function (dom, props, options, cb) {
	cancelTween(dom);

	// set default params
	options = options || {};
	var time = options.time || 500;
	var delay = options.delay || 0;
	var ease = options.easing || 'ease-in-out';
	var elm = dom.rootElement;
	var elementTransition = elm.style.webkitTransition;

	var transition = 'all ' + time + 'ms ' + ease;
	if (delay) {
		transition += ' ' + delay + 'ms';
	}

	// listen for animation end
	var endTimeout, handleTransitionEnd;
	var wasCancelled = false, finished = false;

	function cleanup() {
		window.clearTimeout(endTimeout);
		elm.removeEventListener('webkitTransitionEnd', handleTransitionEnd);
		endTimeout = null;
		elm.style.webkitTransition = elementTransition;
		dom._tween = null;
	}

	function cancel() {
		if (wasCancelled || finished) { return; }
		wasCancelled = finished = true;
		cleanup();
		cb = null;
	}

	handleTransitionEnd = function (e) {
		if (finished) { return; }
		finished = true;

		if (e) { e.stopPropagation(); }

		cleanup();

		if (cb) {
			cb.call(dom, e);
			cb = null;
		}
	};

	window.setTimeout(function () {
		if (wasCancelled) {
			return;
		}
		elm.style.webkitTransition = transition;

		for (var n in props) {
			elm.style[n] = props[n];
		}

		// Normal transition end handler, however doesn't trigger if the element is not visible
		// (e.g. if we switch view before the transition ends)
		elm.addEventListener('webkitTransitionEnd', handleTransitionEnd);

		// backup plan for handling transition end. If the 'webkitTransitionEnd' event didn't fire, this one will
		// Fixed:  This looks like a bug after someone refactored thi script to use ms instead of s
		endTimeout = window.setTimeout(handleTransitionEnd, (delay + time)); // * 1000);
	}, 0);

	dom._tween = { cancel: cancel };
	return dom._tween;
};

function cancelTween(dom) {
	if (!dom._tween) { return false; }
	dom._tween.cancel();
	dom.emit('tweenCancelled');
	return true;
}
exports.cancelTween = cancelTween;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/tweener/index.js
 ** module id = 31
 ** module chunks = 0
 **/