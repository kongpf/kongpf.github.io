this.createjs = this.createjs || {};
//##############################################################################
//##############################################################################
createjs.extend = function (subclass, superclass) {
	"use strict";
	function o() { this.constructor = subclass; }
	o.prototype = superclass.prototype;
	return (subclass.prototype = new o());
};
//##############################################################################
//##############################################################################
createjs.promote = function (subclass, prefix) {
	"use strict";
	var subP = subclass.prototype, supP = (Object.getPrototypeOf && Object.getPrototypeOf(subP)) || subP.__proto__;
	if (supP) {
		subP[(prefix += "_") + "constructor"] = supP.constructor;
		for (var n in supP) {
			if (subP.hasOwnProperty(n) && (typeof supP[n] == "function")) { subP[prefix + n] = supP[n]; }
		}
	}
	return subclass;
};
//##############################################################################
//##############################################################################
createjs.indexOf = function (array, searchElement) {
	"use strict";
	for (var i = 0, l = array.length; i < l; i++) {
		if (searchElement === array[i]) {
			return i;
		}
	}
	return -1;
};
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function UID() {
		throw "UID cannot be instantiated";
	}
	UID._nextID = 0;
	UID.get = function () {
		return UID._nextID++;
	};
	createjs.UID = UID;
}());
//##############################################################################
//##############################################################################
createjs.deprecate = function (fallbackMethod, name) {
	"use strict";
	return function () {
		var msg = "Deprecated property or method '" + name + "'. See docs for info.";
		console && (console.warn ? console.warn(msg) : console.log(msg));
		return fallbackMethod && fallbackMethod.apply(this, arguments);
	}
};
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Event(type, bubbles, cancelable) {
		this.type = type;
		this.target = null;
		this.currentTarget = null;
		this.eventPhase = 0;
		this.bubbles = !!bubbles;
		this.cancelable = !!cancelable;
		this.timeStamp = (new Date()).getTime();
		this.defaultPrevented = false;
		this.propagationStopped = false;
		this.immediatePropagationStopped = false;
		this.removed = false;
	}
	var p = Event.prototype;
	p.preventDefault = function () {
		this.defaultPrevented = this.cancelable && true;
	};
	p.stopPropagation = function () {
		this.propagationStopped = true;
	};
	p.stopImmediatePropagation = function () {
		this.immediatePropagationStopped = this.propagationStopped = true;
	};
	p.remove = function () {
		this.removed = true;
	};
	p.clone = function () {
		return new Event(this.type, this.bubbles, this.cancelable);
	};
	p.set = function (props) {
		for (var n in props) { this[n] = props[n]; }
		return this;
	};
	p.toString = function () {
		return "[Event (type=" + this.type + ")]";
	};
	createjs.Event = Event;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function EventDispatcher() {
		this._listeners = null;
		this._captureListeners = null;
	}
	var p = EventDispatcher.prototype;
	EventDispatcher.initialize = function (target) {
		target.addEventListener = p.addEventListener;
		target.on = p.on;
		target.removeEventListener = target.off = p.removeEventListener;
		target.removeAllEventListeners = p.removeAllEventListeners;
		target.hasEventListener = p.hasEventListener;
		target.dispatchEvent = p.dispatchEvent;
		target._dispatchEvent = p._dispatchEvent;
		target.willTrigger = p.willTrigger;
	};
	p.addEventListener = function (type, listener, useCapture) {
		var listeners;
		if (useCapture) {
			listeners = this._captureListeners = this._captureListeners || {};
		} else {
			listeners = this._listeners = this._listeners || {};
		}
		var arr = listeners[type];
		if (arr) { this.removeEventListener(type, listener, useCapture); }
		arr = listeners[type];
		if (!arr) { listeners[type] = [listener]; }
		else { arr.push(listener); }
		return listener;
	};
	p.on = function (type, listener, scope, once, data, useCapture) {
		if (listener.handleEvent) {
			scope = scope || listener;
			listener = listener.handleEvent;
		}
		scope = scope || this;
		return this.addEventListener(type, function (evt) {
			listener.call(scope, evt, data);
			once && evt.remove();
		}, useCapture);
	};
	p.removeEventListener = function (type, listener, useCapture) {
		var listeners = useCapture ? this._captureListeners : this._listeners;
		if (!listeners) { return; }
		var arr = listeners[type];
		if (!arr) { return; }
		for (var i = 0, l = arr.length; i < l; i++) {
			if (arr[i] == listener) {
				if (l == 1) { delete (listeners[type]); }
				else { arr.splice(i, 1); }
				break;
			}
		}
	};
	p.off = p.removeEventListener;
	p.removeAllEventListeners = function (type) {
		if (!type) { this._listeners = this._captureListeners = null; }
		else {
			if (this._listeners) { delete (this._listeners[type]); }
			if (this._captureListeners) { delete (this._captureListeners[type]); }
		}
	};
	p.dispatchEvent = function (eventObj, bubbles, cancelable) {
		if (typeof eventObj == "string") {
			var listeners = this._listeners;
			if (!bubbles && (!listeners || !listeners[eventObj])) { return true; }
			eventObj = new createjs.Event(eventObj, bubbles, cancelable);
		} else if (eventObj.target && eventObj.clone) {
			eventObj = eventObj.clone();
		}
		try { eventObj.target = this; } catch (e) { }
		if (!eventObj.bubbles || !this.parent) {
			this._dispatchEvent(eventObj, 2);
		} else {
			var top = this, list = [top];
			while (top.parent) { list.push(top = top.parent); }
			var i, l = list.length;
			for (i = l - 1; i >= 0 && !eventObj.propagationStopped; i--) {
				list[i]._dispatchEvent(eventObj, 1 + (i == 0));
			}
			for (i = 1; i < l && !eventObj.propagationStopped; i++) {
				list[i]._dispatchEvent(eventObj, 3);
			}
		}
		return !eventObj.defaultPrevented;
	};
	p.hasEventListener = function (type) {
		var listeners = this._listeners, captureListeners = this._captureListeners;
		return !!((listeners && listeners[type]) || (captureListeners && captureListeners[type]));
	};
	p.willTrigger = function (type) {
		var o = this;
		while (o) {
			if (o.hasEventListener(type)) { return true; }
			o = o.parent;
		}
		return false;
	};
	p.toString = function () {
		return "[EventDispatcher]";
	};
	p._dispatchEvent = function (eventObj, eventPhase) {
		var l, arr, listeners = (eventPhase <= 2) ? this._captureListeners : this._listeners;
		if (eventObj && listeners && (arr = listeners[eventObj.type]) && (l = arr.length)) {
			try { eventObj.currentTarget = this; } catch (e) { }
			try { eventObj.eventPhase = eventPhase | 0; } catch (e) { }
			eventObj.removed = false;
			arr = arr.slice();
			for (var i = 0; i < l && !eventObj.immediatePropagationStopped; i++) {
				var o = arr[i];
				if (o.handleEvent) { o.handleEvent(eventObj); }
				else { o(eventObj); }
				if (eventObj.removed) {
					this.off(eventObj.type, o, eventPhase == 1);
					eventObj.removed = false;
				}
			}
		}
		if (eventPhase === 2) { this._dispatchEvent(eventObj, 2.1); }
	};
	createjs.EventDispatcher = EventDispatcher;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Ticker() {
		throw "Ticker cannot be instantiated.";
	}
	Ticker.RAF_SYNCHED = "synched";
	Ticker.RAF = "raf";
	Ticker.TIMEOUT = "timeout";
	Ticker.timingMode = null;
	Ticker.maxDelta = 0;
	Ticker.paused = false;
	Ticker.removeEventListener = null;
	Ticker.removeAllEventListeners = null;
	Ticker.dispatchEvent = null;
	Ticker.hasEventListener = null;
	Ticker._listeners = null;
	createjs.EventDispatcher.initialize(Ticker);
	Ticker._addEventListener = Ticker.addEventListener;
	Ticker.addEventListener = function () {
		!Ticker._inited && Ticker.init();
		return Ticker._addEventListener.apply(Ticker, arguments);
	};
	Ticker._inited = false;
	Ticker._startTime = 0;
	Ticker._pausedTime = 0;
	Ticker._ticks = 0;
	Ticker._pausedTicks = 0;
	Ticker._interval = 50;
	Ticker._lastTime = 0;
	Ticker._times = null;
	Ticker._tickTimes = null;
	Ticker._timerId = null;
	Ticker._raf = true;
	Ticker._setInterval = function (interval) {
		Ticker._interval = interval;
		if (!Ticker._inited) { return; }
		Ticker._setupTick();
	};
	Ticker.setInterval = createjs.deprecate(Ticker._setInterval, "Ticker.setInterval");
	Ticker._getInterval = function () {
		return Ticker._interval;
	};
	Ticker.getInterval = createjs.deprecate(Ticker._getInterval, "Ticker.getInterval");
	Ticker._setFPS = function (value) {
		Ticker._setInterval(1000 / value);
	};
	Ticker.setFPS = createjs.deprecate(Ticker._setFPS, "Ticker.setFPS");
	Ticker._getFPS = function () {
		return 1000 / Ticker._interval;
	};
	Ticker.getFPS = createjs.deprecate(Ticker._getFPS, "Ticker.getFPS");
	try {
		Object.defineProperties(Ticker, {
			interval: { get: Ticker._getInterval, set: Ticker._setInterval },
			framerate: { get: Ticker._getFPS, set: Ticker._setFPS }
		});
	} catch (e) { console.log(e); }
	Ticker.init = function () {
		if (Ticker._inited) { return; }
		Ticker._inited = true;
		Ticker._times = [];
		Ticker._tickTimes = [];
		Ticker._startTime = Ticker._getTime();
		Ticker._times.push(Ticker._lastTime = 0);
		Ticker.interval = Ticker._interval;
	};
	Ticker.reset = function () {
		if (Ticker._raf) {
			var f = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.oCancelAnimationFrame || window.msCancelAnimationFrame;
			f && f(Ticker._timerId);
		} else {
			clearTimeout(Ticker._timerId);
		}
		Ticker.removeAllEventListeners("tick");
		Ticker._timerId = Ticker._times = Ticker._tickTimes = null;
		Ticker._startTime = Ticker._lastTime = Ticker._ticks = Ticker._pausedTime = 0;
		Ticker._inited = false;
	};
	Ticker.getMeasuredTickTime = function (ticks) {
		var ttl = 0, times = Ticker._tickTimes;
		if (!times || times.length < 1) { return -1; }
		ticks = Math.min(times.length, ticks || (Ticker._getFPS() | 0));
		for (var i = 0; i < ticks; i++) { ttl += times[i]; }
		return ttl / ticks;
	};
	Ticker.getMeasuredFPS = function (ticks) {
		var times = Ticker._times;
		if (!times || times.length < 2) { return -1; }
		ticks = Math.min(times.length - 1, ticks || (Ticker._getFPS() | 0));
		return 1000 / ((times[0] - times[ticks]) / ticks);
	};
	Ticker.getTime = function (runTime) {
		return Ticker._startTime ? Ticker._getTime() - (runTime ? Ticker._pausedTime : 0) : -1;
	};
	Ticker.getEventTime = function (runTime) {
		return Ticker._startTime ? (Ticker._lastTime || Ticker._startTime) - (runTime ? Ticker._pausedTime : 0) : -1;
	};
	Ticker.getTicks = function (pauseable) {
		return Ticker._ticks - (pauseable ? Ticker._pausedTicks : 0);
	};
	Ticker._handleSynch = function () {
		Ticker._timerId = null;
		Ticker._setupTick();
		if (Ticker._getTime() - Ticker._lastTime >= (Ticker._interval - 1) * 0.97) {
			Ticker._tick();
		}
	};
	Ticker._handleRAF = function () {
		Ticker._timerId = null;
		Ticker._setupTick();
		Ticker._tick();
	};
	Ticker._handleTimeout = function () {
		Ticker._timerId = null;
		Ticker._setupTick();
		Ticker._tick();
	};
	Ticker._setupTick = function () {
		if (Ticker._timerId != null) { return; }
		var mode = Ticker.timingMode;
		if (mode == Ticker.RAF_SYNCHED || mode == Ticker.RAF) {
			var f = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
			if (f) {
				Ticker._timerId = f(mode == Ticker.RAF ? Ticker._handleRAF : Ticker._handleSynch);
				Ticker._raf = true;
				return;
			}
		}
		Ticker._raf = false;
		Ticker._timerId = setTimeout(Ticker._handleTimeout, Ticker._interval);
	};
	Ticker._tick = function () {
		var paused = Ticker.paused;
		var time = Ticker._getTime();
		var elapsedTime = time - Ticker._lastTime;
		Ticker._lastTime = time;
		Ticker._ticks++;
		if (paused) {
			Ticker._pausedTicks++;
			Ticker._pausedTime += elapsedTime;
		}
		if (Ticker.hasEventListener("tick")) {
			var event = new createjs.Event("tick");
			var maxDelta = Ticker.maxDelta;
			event.delta = (maxDelta && elapsedTime > maxDelta) ? maxDelta : elapsedTime;
			event.paused = paused;
			event.time = time;
			event.runTime = time - Ticker._pausedTime;
			Ticker.dispatchEvent(event);
		}
		Ticker._tickTimes.unshift(Ticker._getTime() - time);
		while (Ticker._tickTimes.length > 100) { Ticker._tickTimes.pop(); }
		Ticker._times.unshift(time);
		while (Ticker._times.length > 100) { Ticker._times.pop(); }
	};
	var w = window, now = w.performance.now || w.performance.mozNow || w.performance.msNow || w.performance.oNow || w.performance.webkitNow;
	Ticker._getTime = function () {
		return ((now && now.call(w.performance)) || (new Date().getTime())) - Ticker._startTime;
	};
	createjs.Ticker = Ticker;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function VideoBuffer(video) {
		this.readyState = video.readyState;
		this._video = video;
		this._canvas = null;
		this._lastTime = -1;
		if (this.readyState < 2) { video.addEventListener("canplaythrough", this._videoReady.bind(this)); } //once:true isn't supported everywhere, but its a non-critical optimization here.
	}
	var p = VideoBuffer.prototype;
	p.getImage = function () {
		if (this.readyState < 2) { return; }
		var canvas = this._canvas, video = this._video;
		if (!canvas) {
			canvas = this._canvas = createjs.createCanvas ? createjs.createCanvas() : document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
		}
		if (video.readyState >= 2 && video.currentTime !== this._lastTime) {
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			this._lastTime = video.currentTime;
		}
		return canvas;
	};
	p._videoReady = function () {
		this.readyState = 2;
	};
	createjs.VideoBuffer = VideoBuffer;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function MouseEvent(type, bubbles, cancelable, stageX, stageY, nativeEvent, pointerID, primary, rawX, rawY, relatedTarget) {
		this.Event_constructor(type, bubbles, cancelable);
		this.stageX = stageX;
		this.stageY = stageY;
		this.rawX = (rawX == null) ? stageX : rawX;
		this.rawY = (rawY == null) ? stageY : rawY;
		this.nativeEvent = nativeEvent;
		this.pointerID = pointerID;
		this.primary = !!primary;
		this.relatedTarget = relatedTarget;
	}
	var p = createjs.extend(MouseEvent, createjs.Event);
	p._get_localX = function () {
		return this.currentTarget.globalToLocal(this.rawX, this.rawY).x;
	};
	p._get_localY = function () {
		return this.currentTarget.globalToLocal(this.rawX, this.rawY).y;
	};
	p._get_isTouch = function () {
		return this.pointerID !== -1;
	};
	try {
		Object.defineProperties(p, {
			localX: { get: p._get_localX },
			localY: { get: p._get_localY },
			isTouch: { get: p._get_isTouch }
		});
	} catch (e) { }
	p.clone = function () {
		return new MouseEvent(this.type, this.bubbles, this.cancelable, this.stageX, this.stageY, this.nativeEvent, this.pointerID, this.primary, this.rawX, this.rawY);
	};
	p.toString = function () {
		return "[MouseEvent (type=" + this.type + " stageX=" + this.stageX + " stageY=" + this.stageY + ")]";
	};
	createjs.MouseEvent = createjs.promote(MouseEvent, "Event");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Matrix2D(a, b, c, d, tx, ty) {
		this.setValues(a, b, c, d, tx, ty);
	}
	var p = Matrix2D.prototype;
	Matrix2D.DEG_TO_RAD = Math.PI / 180;
	Matrix2D.identity = null;
	p.setValues = function (a, b, c, d, tx, ty) {
		this.a = (a == null) ? 1 : a;
		this.b = b || 0;
		this.c = c || 0;
		this.d = (d == null) ? 1 : d;
		this.tx = tx || 0;
		this.ty = ty || 0;
		return this;
	};
	p.append = function (a, b, c, d, tx, ty) {
		var a1 = this.a;
		var b1 = this.b;
		var c1 = this.c;
		var d1 = this.d;
		if (a != 1 || b != 0 || c != 0 || d != 1) {
			this.a = a1 * a + c1 * b;
			this.b = b1 * a + d1 * b;
			this.c = a1 * c + c1 * d;
			this.d = b1 * c + d1 * d;
		}
		this.tx = a1 * tx + c1 * ty + this.tx;
		this.ty = b1 * tx + d1 * ty + this.ty;
		return this;
	};
	p.prepend = function (a, b, c, d, tx, ty) {
		var a1 = this.a;
		var c1 = this.c;
		var tx1 = this.tx;
		this.a = a * a1 + c * this.b;
		this.b = b * a1 + d * this.b;
		this.c = a * c1 + c * this.d;
		this.d = b * c1 + d * this.d;
		this.tx = a * tx1 + c * this.ty + tx;
		this.ty = b * tx1 + d * this.ty + ty;
		return this;
	};
	p.appendMatrix = function (matrix) {
		return this.append(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
	};
	p.prependMatrix = function (matrix) {
		return this.prepend(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
	};
	p.appendTransform = function (x, y, scaleX, scaleY, rotation, skewX, skewY, regX, regY) {
		if (rotation % 360) {
			var r = rotation * Matrix2D.DEG_TO_RAD;
			var cos = Math.cos(r);
			var sin = Math.sin(r);
		} else {
			cos = 1;
			sin = 0;
		}
		if (skewX || skewY) {
			skewX *= Matrix2D.DEG_TO_RAD;
			skewY *= Matrix2D.DEG_TO_RAD;
			this.append(Math.cos(skewY), Math.sin(skewY), -Math.sin(skewX), Math.cos(skewX), x, y);
			this.append(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, 0, 0);
		} else {
			this.append(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y);
		}
		if (regX || regY) {
			this.tx -= regX * this.a + regY * this.c;
			this.ty -= regX * this.b + regY * this.d;
		}
		return this;
	};
	p.concat = function (mtx) {
		var args = arguments,
			a = this.a, b = this.b, c = this.c, d = this.d,
			tx = this.tx, ty = this.ty;

		var ma, mb, mc, md, mx, my;
		if (args.length >= 6) {
			ma = args[0];
			mb = args[1];
			mc = args[2];
			md = args[3];
			mx = args[4];
			my = args[5];
		}
		else {
			ma = mtx.a;
			mb = mtx.b;
			mc = mtx.c;
			md = mtx.d;
			mx = mtx.tx;
			my = mtx.ty;
		}

		this.a = a * ma + b * mc;
		this.b = a * mb + b * md;
		this.c = c * ma + d * mc;
		this.d = c * mb + d * md;
		this.tx = tx * ma + ty * mc + mx;
		this.ty = tx * mb + ty * md + my;
		return this;
	},
		p.prependTransform = function (x, y, scaleX, scaleY, rotation, skewX, skewY, regX, regY) {
			if (rotation % 360) {
				var r = rotation * Matrix2D.DEG_TO_RAD;
				var cos = Math.cos(r);
				var sin = Math.sin(r);
			} else {
				cos = 1;
				sin = 0;
			}
			if (regX || regY) {
				this.tx -= regX; this.ty -= regY;
			}
			if (skewX || skewY) {
				skewX *= Matrix2D.DEG_TO_RAD;
				skewY *= Matrix2D.DEG_TO_RAD;
				this.prepend(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, 0, 0);
				this.prepend(Math.cos(skewY), Math.sin(skewY), -Math.sin(skewX), Math.cos(skewX), x, y);
			} else {
				this.prepend(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y);
			}
			return this;
		};
	p.rotate = function (angle) {
		angle = angle * Matrix2D.DEG_TO_RAD;
		var cos = Math.cos(angle);
		var sin = Math.sin(angle);
		var a1 = this.a;
		var b1 = this.b;
		this.a = a1 * cos + this.c * sin;
		this.b = b1 * cos + this.d * sin;
		this.c = -a1 * sin + this.c * cos;
		this.d = -b1 * sin + this.d * cos;
		return this;
	};
	p.skew = function (skewX, skewY) {
		skewX = skewX * Matrix2D.DEG_TO_RAD;
		skewY = skewY * Matrix2D.DEG_TO_RAD;
		this.append(Math.cos(skewY), Math.sin(skewY), -Math.sin(skewX), Math.cos(skewX), 0, 0);
		return this;
	};
	p.scale = function (x, y) {
		this.a *= x;
		this.b *= x;
		this.c *= y;
		this.d *= y;
		//this.tx *= x;
		//this.ty *= y;
		return this;
	};
	p.translate = function (x, y) {
		this.tx += this.a * x + this.c * y;
		this.ty += this.b * x + this.d * y;
		return this;
	};
	p.identity = function () {
		this.a = this.d = 1;
		this.b = this.c = this.tx = this.ty = 0;
		return this;
	};
	p.invert = function () {
		var a1 = this.a;
		var b1 = this.b;
		var c1 = this.c;
		var d1 = this.d;
		var tx1 = this.tx;
		var n = a1 * d1 - b1 * c1;
		this.a = d1 / n;
		this.b = -b1 / n;
		this.c = -c1 / n;
		this.d = a1 / n;
		this.tx = (c1 * this.ty - d1 * tx1) / n;
		this.ty = -(a1 * this.ty - b1 * tx1) / n;
		return this;
	};
	p.isIdentity = function () {
		return this.tx === 0 && this.ty === 0 && this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1;
	};
	p.equals = function (matrix) {
		return this.tx === matrix.tx && this.ty === matrix.ty && this.a === matrix.a && this.b === matrix.b && this.c === matrix.c && this.d === matrix.d;
	};
	p.transformPoint = function (x, y, pt) {
		pt = pt || {};
		pt.x = x * this.a + y * this.c + this.tx;
		pt.y = x * this.b + y * this.d + this.ty;
		return pt;
	};
	p.transformBoundsPoint = function (point, round, returnNew) {
		var x = point.x * this.a + point.y * this.c + this.tx,
			y = point.x * this.b + point.y * this.d + this.ty;

		if (round) {
			x = x + 0.5 >> 0;
			y = y + 0.5 >> 0;
		}
		if (returnNew) return { x: x, y: y };
		point.x = x;
		point.y = y;
		return point;
	};
	p.decompose = function (target) {
		if (target == null) { target = {}; }
		target.x = this.tx;
		target.y = this.ty;
		target.scaleX = Math.sqrt(this.a * this.a + this.b * this.b);
		target.scaleY = Math.sqrt(this.c * this.c + this.d * this.d);
		var skewX = Math.atan2(-this.c, this.d);
		var skewY = Math.atan2(this.b, this.a);
		var delta = Math.abs(1 - skewX / skewY);
		if (delta < 0.00001) {
			target.rotation = skewY / Matrix2D.DEG_TO_RAD;
			if (this.a < 0 && this.d >= 0) {
				target.rotation += (target.rotation <= 0) ? 180 : -180;
			}
			target.skewX = target.skewY = 0;
		} else {
			target.skewX = skewX / Matrix2D.DEG_TO_RAD;
			target.skewY = skewY / Matrix2D.DEG_TO_RAD;
		}
		return target;
	};
	p.copy = function (matrix) {
		return this.setValues(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
	};
	p.clone = function () {
		return new Matrix2D(this.a, this.b, this.c, this.d, this.tx, this.ty);
	};
	p.toString = function () {
		return "[Matrix2D (a=" + this.a + " b=" + this.b + " c=" + this.c + " d=" + this.d + " tx=" + this.tx + " ty=" + this.ty + ")]";
	};
	Matrix2D.identity = new Matrix2D();
	createjs.Matrix2D = Matrix2D;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function DisplayProps(visible, alpha, shadow, compositeOperation, matrix) {
		this.setValues(visible, alpha, shadow, compositeOperation, matrix);
	}
	var p = DisplayProps.prototype;
	p.setValues = function (visible, alpha, shadow, compositeOperation, matrix) {
		this.visible = visible == null ? true : !!visible;
		this.alpha = alpha == null ? 1 : alpha;
		this.shadow = shadow;
		this.compositeOperation = compositeOperation;
		this.matrix = matrix || (this.matrix && this.matrix.identity()) || new createjs.Matrix2D();
		return this;
	};
	p.append = function (visible, alpha, shadow, compositeOperation, matrix) {
		this.alpha *= alpha;
		this.shadow = shadow || this.shadow;
		this.compositeOperation = compositeOperation || this.compositeOperation;
		this.visible = this.visible && visible;
		matrix && this.matrix.appendMatrix(matrix);
		return this;
	};
	p.prepend = function (visible, alpha, shadow, compositeOperation, matrix) {
		this.alpha *= alpha;
		this.shadow = this.shadow || shadow;
		this.compositeOperation = this.compositeOperation || compositeOperation;
		this.visible = this.visible && visible;
		matrix && this.matrix.prependMatrix(matrix);
		return this;
	};
	p.identity = function () {
		this.visible = true;
		this.alpha = 1;
		this.shadow = this.compositeOperation = null;
		this.matrix.identity();
		return this;
	};
	p.clone = function () {
		return new DisplayProps(this.alpha, this.shadow, this.compositeOperation, this.visible, this.matrix.clone());
	};
	createjs.DisplayProps = DisplayProps;
})();
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Point(x, y) {
		this.setValues(x, y);
	}
	var p = Point.prototype;
	p.setValues = function (x, y) {
		this.x = x || 0;
		this.y = y || 0;
		return this;
	};
	p.copy = function (point) {
		this.x = point.x;
		this.y = point.y;
		return this;
	};
	p.clone = function () {
		return new Point(this.x, this.y);
	};
	p.toString = function () {
		return "[Point (x=" + this.x + " y=" + this.y + ")]";
	};
	createjs.Point = Point;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Rectangle(x, y, width, height) {
		this.setValues(x, y, width, height);
	}
	var p = Rectangle.prototype;
	p.setValues = function (x, y, width, height) {
		this.x = x || 0;
		this.y = y || 0;
		this.width = width || 0;
		this.height = height || 0;
		return this;
	};
	p.extend = function (x, y, width, height) {
		width = width || 0;
		height = height || 0;
		if (x + width > this.x + this.width) { this.width = x + width - this.x; }
		if (y + height > this.y + this.height) { this.height = y + height - this.y; }
		if (x < this.x) { this.width += this.x - x; this.x = x; }
		if (y < this.y) { this.height += this.y - y; this.y = y; }
		return this;
	};
	p.pad = function (top, left, bottom, right) {
		this.x -= left;
		this.y -= top;
		this.width += left + right;
		this.height += top + bottom;
		return this;
	};
	p.copy = function (rectangle) {
		return this.setValues(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
	};
	p.contains = function (x, y, width, height) {
		width = width || 0;
		height = height || 0;
		return (x >= this.x && x + width <= this.x + this.width && y >= this.y && y + height <= this.y + this.height);
	};
	p.union = function (rect) {
		return this.clone().extend(rect.x, rect.y, rect.width, rect.height);
	};
	p.intersection = function (rect) {
		var x1 = rect.x, y1 = rect.y, x2 = x1 + rect.width, y2 = y1 + rect.height;
		if (this.x > x1) { x1 = this.x; }
		if (this.y > y1) { y1 = this.y; }
		if (this.x + this.width < x2) { x2 = this.x + this.width; }
		if (this.y + this.height < y2) { y2 = this.y + this.height; }
		return (x2 <= x1 || y2 <= y1) ? null : new Rectangle(x1, y1, x2 - x1, y2 - y1);
	};
	p.intersects = function (rect) {
		return (rect.x <= this.x + this.width && this.x <= rect.x + rect.width && rect.y <= this.y + this.height && this.y <= rect.y + rect.height);
	};
	p.isEmpty = function () {
		return this.width <= 0 || this.height <= 0;
	};
	p.clone = function () {
		return new Rectangle(this.x, this.y, this.width, this.height);
	};
	p.toString = function () {
		return "[Rectangle (x=" + this.x + " y=" + this.y + " width=" + this.width + " height=" + this.height + ")]";
	};
	p.loadFromPoint = function (arr) {
		var minX = 10000;
		var minY = 10000;
		var maxX = -10000;
		var maxY = -10000;
		for (var i = 0; i < arr.length; i++) {
			if (arr[i].x < minX) {
				minX = arr[i].x;
			};
			if (arr[i].y < minY) {
				minY = arr[i].y;
			};
			if (arr[i].x > maxX) {
				maxX = arr[i].x;
			};
			if (arr[i].y > maxY) {
				maxY = arr[i].y;
			}
		}
		return new Rectangle(minX, minY, maxX - minX, maxY - minY);
	}
	createjs.Rectangle = Rectangle;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function ButtonHelper(target, outLabel, overLabel, downLabel, play, hitArea, hitLabel) {
		if (!target.addEventListener) { return; }
		this.target = target;
		this.overLabel = overLabel == null ? "over" : overLabel;
		this.outLabel = outLabel == null ? "out" : outLabel;
		this.downLabel = downLabel == null ? "down" : downLabel;
		this.play = play;
		this._isPressed = false;
		this._isOver = false;
		this._enabled = false;
		target.mouseChildren = false;
		this.enabled = true;
		this.handleEvent({});
		if (hitArea) {
			if (hitLabel) {
				hitArea.actionsEnabled = false;
				hitArea.gotoAndStop && hitArea.gotoAndStop(hitLabel);
			}
			target.hitArea = hitArea;
		}
	}
	var p = ButtonHelper.prototype;
	p._setEnabled = function (value) {
		if (value == this._enabled) { return; }
		var o = this.target;
		this._enabled = value;
		if (value) {
			o.cursor = "pointer";
			o.addEventListener("rollover", this);
			o.addEventListener("rollout", this);
			o.addEventListener("mousedown", this);
			o.addEventListener("pressup", this);
			if (o._reset) { o.__reset = o._reset; o._reset = this._reset; }
		} else {
			o.cursor = null;
			o.removeEventListener("rollover", this);
			o.removeEventListener("rollout", this);
			o.removeEventListener("mousedown", this);
			o.removeEventListener("pressup", this);
			if (o.__reset) { o._reset = o.__reset; delete (o.__reset); }
		}
	};
	p.setEnabled = createjs.deprecate(p._setEnabled, "ButtonHelper.setEnabled");
	p._getEnabled = function () {
		return this._enabled;
	};
	p.getEnabled = createjs.deprecate(p._getEnabled, "ButtonHelper.getEnabled");
	try {
		Object.defineProperties(p, {
			enabled: { get: p._getEnabled, set: p._setEnabled }
		});
	} catch (e) { }
	p.toString = function () {
		return "[ButtonHelper]";
	};
	p.handleEvent = function (evt) {
		var label, t = this.target, type = evt.type;
		if (type == "mousedown") {
			this._isPressed = true;
			label = this.downLabel;
		} else if (type == "pressup") {
			this._isPressed = false;
			label = this._isOver ? this.overLabel : this.outLabel;
		} else if (type == "rollover") {
			this._isOver = true;
			label = this._isPressed ? this.downLabel : this.overLabel;
		} else {
			this._isOver = false;
			label = this._isPressed ? this.overLabel : this.outLabel;
		}
		if (this.play) {
			t.gotoAndPlay && t.gotoAndPlay(label);
		} else {
			t.gotoAndStop && t.gotoAndStop(label);
		}
	};
	p._reset = function () {
		var p = this.paused;
		this.__reset();
		this.paused = p;
	};
	createjs.ButtonHelper = ButtonHelper;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Shadow(color, offsetX, offsetY, blur) {
		this.color = color || "black";
		this.offsetX = offsetX || 0;
		this.offsetY = offsetY || 0;
		this.blur = blur || 0;
	}
	var p = Shadow.prototype;
	Shadow.identity = new Shadow("transparent", 0, 0, 0);
	p.toString = function () {
		return "[Shadow]";
	};
	p.clone = function () {
		return new Shadow(this.color, this.offsetX, this.offsetY, this.blur);
	};
	createjs.Shadow = Shadow;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function SpriteSheet(data) {
		this.EventDispatcher_constructor();
		this.complete = true;
		this.framerate = 0;
		this._animations = null;
		this._frames = null;
		this._images = null;
		this._data = null;
		this._loadCount = 0;
		this._frameHeight = 0;
		this._frameWidth = 0;
		this._numFrames = 0;
		this._regX = 0;
		this._regY = 0;
		this._spacing = 0;
		this._margin = 0;
		this._parseData(data);
	}
	var p = createjs.extend(SpriteSheet, createjs.EventDispatcher);
	p._getAnimations = function () {
		return this._animations.slice();
	};
	p.getAnimations = createjs.deprecate(p._getAnimations, "SpriteSheet.getAnimations");
	try {
		Object.defineProperties(p, {
			animations: { get: p._getAnimations }
		});
	} catch (e) { }
	p.getNumFrames = function (animation) {
		if (animation == null) {
			return this._frames ? this._frames.length : this._numFrames || 0;
		} else {
			var data = this._data[animation];
			if (data == null) { return 0; }
			else { return data.frames.length; }
		}
	};
	p.getAnimation = function (name) {
		return this._data[name];
	};
	p.getFrame = function (frameIndex) {
		var frame;
		if (this._frames && (frame = this._frames[frameIndex])) { return frame; }
		return null;
	};
	p.getFrameBounds = function (frameIndex, rectangle) {
		var frame = this.getFrame(frameIndex);
		return frame ? (rectangle || new createjs.Rectangle()).setValues(-frame.regX, -frame.regY, frame.rect.width, frame.rect.height) : null;
	};
	p.toString = function () {
		return "[SpriteSheet]";
	};
	p.clone = function () {
		throw ("SpriteSheet cannot be cloned.")
	};
	p._parseData = function (data) {
		var i, l, o, a;
		if (data == null) { return; }
		this.framerate = data.framerate || 0;
		if (data.images && (l = data.images.length) > 0) {
			a = this._images = [];
			for (i = 0; i < l; i++) {
				var img = data.images[i];
				if (typeof img == "string") {
					var src = img;
					img = document.createElement("img");
					img.src = src;
				}
				a.push(img);
				if (!img.getContext && !img.naturalWidth) {
					this._loadCount++;
					this.complete = false;
					(function (o, src) { img.onload = function () { o._handleImageLoad(src); } })(this, src);
					(function (o, src) { img.onerror = function () { o._handleImageError(src); } })(this, src);
				}
			}
		}
		if (data.frames == null) {
		} else if (Array.isArray(data.frames)) {
			this._frames = [];
			a = data.frames;
			for (i = 0, l = a.length; i < l; i++) {
				var arr = a[i];
				this._frames.push({ image: this._images[arr[4] ? arr[4] : 0], rect: new createjs.Rectangle(arr[0], arr[1], arr[2], arr[3]), regX: arr[5] || 0, regY: arr[6] || 0 });
			}
		} else {
			o = data.frames;
			this._frameWidth = o.width;
			this._frameHeight = o.height;
			this._regX = o.regX || 0;
			this._regY = o.regY || 0;
			this._spacing = o.spacing || 0;
			this._margin = o.margin || 0;
			this._numFrames = o.count;
			if (this._loadCount == 0) { this._calculateFrames(); }
		}
		this._animations = [];
		if ((o = data.animations) != null) {
			this._data = {};
			var name;
			for (name in o) {
				var anim = { name: name };
				var obj = o[name];
				if (typeof obj == "number") {
					a = anim.frames = [obj];
				} else if (Array.isArray(obj)) {
					if (obj.length == 1) { anim.frames = [obj[0]]; }
					else {
						anim.speed = obj[3];
						anim.next = obj[2];
						a = anim.frames = [];
						for (i = obj[0]; i <= obj[1]; i++) {
							a.push(i);
						}
					}
				} else {
					anim.speed = obj.speed;
					anim.next = obj.next;
					var frames = obj.frames;
					a = anim.frames = (typeof frames == "number") ? [frames] : frames.slice(0);
				}
				if (anim.next === true || anim.next === undefined) { anim.next = name; }
				if (anim.next === false || (a.length < 2 && anim.next == name)) { anim.next = null; }
				if (!anim.speed) { anim.speed = 1; }
				this._animations.push(name);
				this._data[name] = anim;
			}
		}
	};
	p._handleImageLoad = function (src) {
		if (--this._loadCount == 0) {
			this._calculateFrames();
			this.complete = true;
			this.dispatchEvent("complete");
		}
	};
	p._handleImageError = function (src) {
		var errorEvent = new createjs.Event("error");
		errorEvent.src = src;
		this.dispatchEvent(errorEvent);
		if (--this._loadCount == 0) {
			this.dispatchEvent("complete");
		}
	};
	p._calculateFrames = function () {
		if (this._frames || this._frameWidth == 0) { return; }
		this._frames = [];
		var maxFrames = this._numFrames || 100000;
		var frameCount = 0, frameWidth = this._frameWidth, frameHeight = this._frameHeight;
		var spacing = this._spacing, margin = this._margin;
		imgLoop:
		for (var i = 0, imgs = this._images; i < imgs.length; i++) {
			var img = imgs[i], imgW = (img.width || img.naturalWidth), imgH = (img.height || img.naturalHeight);
			var y = margin;
			while (y <= imgH - margin - frameHeight) {
				var x = margin;
				while (x <= imgW - margin - frameWidth) {
					if (frameCount >= maxFrames) { break imgLoop; }
					frameCount++;
					this._frames.push({
						image: img,
						rect: new createjs.Rectangle(x, y, frameWidth, frameHeight),
						regX: this._regX,
						regY: this._regY
					});
					x += frameWidth + spacing;
				}
				y += frameHeight + spacing;
			}
		}
		this._numFrames = frameCount;
	};
	createjs.SpriteSheet = createjs.promote(SpriteSheet, "EventDispatcher");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Graphics() {
		this.command = null;
		this._stroke = null;
		this._strokeStyle = null;
		this._oldStrokeStyle = null;
		this._strokeDash = null;
		this._oldStrokeDash = null;
		this._strokeIgnoreScale = false;
		this._fill = null;
		this._instructions = [];
		this._commitIndex = 0;
		this._activeInstructions = [];
		this._dirty = false;
		this._storeIndex = 0;
		this.clear();
	}
	var p = Graphics.prototype;
	var G = Graphics;
	Graphics.getRGB = function (r, g, b, alpha) {
		if (r != null && b == null) {
			alpha = g;
			b = r & 0xFF;
			g = r >> 8 & 0xFF;
			r = r >> 16 & 0xFF;
		}
		if (alpha == null) {
			return "rgb(" + r + "," + g + "," + b + ")";
		} else {
			return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
		}
	};
	Graphics.getHSL = function (hue, saturation, lightness, alpha) {
		if (alpha == null) {
			return "hsl(" + (hue % 360) + "," + saturation + "%," + lightness + "%)";
		} else {
			return "hsla(" + (hue % 360) + "," + saturation + "%," + lightness + "%," + alpha + ")";
		}
	};
	Graphics.BASE_64 = { "A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6, "H": 7, "I": 8, "J": 9, "K": 10, "L": 11, "M": 12, "N": 13, "O": 14, "P": 15, "Q": 16, "R": 17, "S": 18, "T": 19, "U": 20, "V": 21, "W": 22, "X": 23, "Y": 24, "Z": 25, "a": 26, "b": 27, "c": 28, "d": 29, "e": 30, "f": 31, "g": 32, "h": 33, "i": 34, "j": 35, "k": 36, "l": 37, "m": 38, "n": 39, "o": 40, "p": 41, "q": 42, "r": 43, "s": 44, "t": 45, "u": 46, "v": 47, "w": 48, "x": 49, "y": 50, "z": 51, "0": 52, "1": 53, "2": 54, "3": 55, "4": 56, "5": 57, "6": 58, "7": 59, "8": 60, "9": 61, "+": 62, "/": 63 };
	Graphics.STROKE_CAPS_MAP = ["butt", "round", "square"];
	Graphics.STROKE_JOINTS_MAP = ["miter", "round", "bevel"];
	var canvas = (createjs.createCanvas ? createjs.createCanvas() : document.createElement("canvas"));
	if (canvas.getContext) {
		Graphics._ctx = canvas.getContext("2d");
		canvas.width = canvas.height = 1;
	}
	p._getInstructions = function () {
		this._updateInstructions();
		return this._instructions;
	};
	p.getInstructions = createjs.deprecate(p._getInstructions, "Graphics.getInstructions");
	try {
		Object.defineProperties(p, {
			instructions: { get: p._getInstructions }
		});
	} catch (e) { }
	p.isEmpty = function () {
		return !(this._instructions.length || this._activeInstructions.length);
	};
	p.draw = function (ctx, data) {
		this._updateInstructions();
		var instr = this._instructions;
		for (var i = this._storeIndex, l = instr.length; i < l; i++) {
			instr[i].exec(ctx, data);
		}
	};
	p.drawAsPath = function (ctx) {
		this._updateInstructions();
		var instr, instrs = this._instructions;
		for (var i = this._storeIndex, l = instrs.length; i < l; i++) {
			if ((instr = instrs[i]).path !== false) { instr.exec(ctx); }
		}
	};
	p.moveTo = function (x, y) {
		return this.append(new G.MoveTo(x, y), true);
	};
	p.lineTo = function (x, y) {
		return this.append(new G.LineTo(x, y));
	};
	p.arcTo = function (x1, y1, x2, y2, radius) {
		return this.append(new G.ArcTo(x1, y1, x2, y2, radius));
	};
	p.arc = function (x, y, radius, startAngle, endAngle, anticlockwise) {
		return this.append(new G.Arc(x, y, radius, startAngle, endAngle, anticlockwise));
	};
	p.quadraticCurveTo = function (cpx, cpy, x, y) {
		return this.append(new G.QuadraticCurveTo(cpx, cpy, x, y));
	};
	p.bezierCurveTo = function (cp1x, cp1y, cp2x, cp2y, x, y) {
		return this.append(new G.BezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y));
	};
	p.rect = function (x, y, w, h) {
		return this.append(new G.Rect(x, y, w, h));
	};
	p.closePath = function () {
		return this._activeInstructions.length ? this.append(new G.ClosePath()) : this;
	};
	p.clear = function () {
		this._instructions.length = this._activeInstructions.length = this._commitIndex = 0;
		this._strokeStyle = this._oldStrokeStyle = this._stroke = this._fill = this._strokeDash = this._oldStrokeDash = null;
		this._dirty = this._strokeIgnoreScale = false;
		return this;
	};
	p.beginFill = function (color) {
		return this._setFill(color ? new G.Fill(color) : null);
	};
	p.beginLinearGradientFill = function (colors, ratios, x0, y0, x1, y1) {
		return this._setFill(new G.Fill().linearGradient(colors, ratios, x0, y0, x1, y1));
	};
	p.beginRadialGradientFill = function (colors, ratios, x0, y0, r0, x1, y1, r1) {
		return this._setFill(new G.Fill().radialGradient(colors, ratios, x0, y0, r0, x1, y1, r1));
	};
	p.beginBitmapFill = function (image, repetition, matrix) {
		return this._setFill(new G.Fill(null, matrix).bitmap(image, repetition));
	};
	p.endFill = function () {
		return this.beginFill();
	};
	p.setStrokeStyle = function (thickness, caps, joints, miterLimit, ignoreScale) {
		this._updateInstructions(true);
		this._strokeStyle = this.command = new G.StrokeStyle(thickness, caps, joints, miterLimit, ignoreScale);
		if (this._stroke) { this._stroke.ignoreScale = ignoreScale; }
		this._strokeIgnoreScale = ignoreScale;
		return this;
	};
	p.setStrokeDash = function (segments, offset) {
		this._updateInstructions(true);
		this._strokeDash = this.command = new G.StrokeDash(segments, offset);
		return this;
	};
	p.beginStroke = function (color) {
		return this._setStroke(color ? new G.Stroke(color) : null);
	};
	p.beginLinearGradientStroke = function (colors, ratios, x0, y0, x1, y1) {
		return this._setStroke(new G.Stroke().linearGradient(colors, ratios, x0, y0, x1, y1));
	};
	p.beginRadialGradientStroke = function (colors, ratios, x0, y0, r0, x1, y1, r1) {
		return this._setStroke(new G.Stroke().radialGradient(colors, ratios, x0, y0, r0, x1, y1, r1));
	};
	p.beginBitmapStroke = function (image, repetition) {
		return this._setStroke(new G.Stroke().bitmap(image, repetition));
	};
	p.endStroke = function () {
		return this.beginStroke();
	};
	p.curveTo = p.quadraticCurveTo;
	p.drawRect = p.rect;
	p.drawRoundRect = function (x, y, w, h, radius) {
		return this.drawRoundRectComplex(x, y, w, h, radius, radius, radius, radius);
	};
	p.drawRoundRectComplex = function (x, y, w, h, radiusTL, radiusTR, radiusBR, radiusBL) {
		return this.append(new G.RoundRect(x, y, w, h, radiusTL, radiusTR, radiusBR, radiusBL));
	};
	p.drawCircle = function (x, y, radius) {
		return this.append(new G.Circle(x, y, radius));
	};
	p.drawEllipse = function (x, y, w, h) {
		return this.append(new G.Ellipse(x, y, w, h));
	};
	p.drawPolyStar = function (x, y, radius, sides, pointSize, angle) {
		return this.append(new G.PolyStar(x, y, radius, sides, pointSize, angle));
	};
	p.append = function (command, clean) {
		this._activeInstructions.push(command);
		this.command = command;
		if (!clean) { this._dirty = true; }
		return this;
	};
	p.decodePath = function (str) {
		var instructions = [this.moveTo, this.lineTo, this.quadraticCurveTo, this.bezierCurveTo, this.closePath];
		var paramCount = [2, 2, 4, 6, 0];
		var i = 0, l = str.length;
		var params = [];
		var x = 0, y = 0;
		var base64 = Graphics.BASE_64;
		while (i < l) {
			var c = str.charAt(i);
			var n = base64[c];
			var fi = n >> 3;
			var f = instructions[fi];
			if (!f || (n & 3)) { throw ("bad path data (@" + i + "): " + c); }
			var pl = paramCount[fi];
			if (!fi) { x = y = 0; }
			params.length = 0;
			i++;
			var charCount = (n >> 2 & 1) + 2;
			for (var p = 0; p < pl; p++) {
				var num = base64[str.charAt(i)];
				var sign = (num >> 5) ? -1 : 1;
				num = ((num & 31) << 6) | (base64[str.charAt(i + 1)]);
				if (charCount == 3) { num = (num << 6) | (base64[str.charAt(i + 2)]); }
				num = sign * num / 10;
				if (p % 2) { x = (num += x); }
				else { y = (num += y); }
				params[p] = num;
				i += charCount;
			}

			f.apply(this, params);
		}
		return this;
	};
	p.store = function () {
		this._updateInstructions(true);
		this._storeIndex = this._instructions.length;
		return this;
	};
	p.unstore = function () {
		this._storeIndex = 0;
		return this;
	};
	p.clone = function () {
		var o = new Graphics();
		o.command = this.command;
		o._stroke = this._stroke;
		o._strokeStyle = this._strokeStyle;
		o._strokeDash = this._strokeDash;
		o._strokeIgnoreScale = this._strokeIgnoreScale;
		o._fill = this._fill;
		o._instructions = this._instructions.slice();
		o._commitIndex = this._commitIndex;
		o._activeInstructions = this._activeInstructions.slice();
		o._dirty = this._dirty;
		o._storeIndex = this._storeIndex;
		return o;
	};
	p.toString = function () {
		return "[Graphics]";
	};
	p.mt = p.moveTo;
	p.lt = p.lineTo;
	p.at = p.arcTo;
	p.bt = p.bezierCurveTo;
	p.qt = p.quadraticCurveTo;
	p.a = p.arc;
	p.r = p.rect;
	p.cp = p.closePath;
	p.c = p.clear;
	p.f = p.beginFill;
	p.lf = p.beginLinearGradientFill;
	p.rf = p.beginRadialGradientFill;
	p.bf = p.beginBitmapFill;
	p.ef = p.endFill;
	p.ss = p.setStrokeStyle;
	p.sd = p.setStrokeDash;
	p.s = p.beginStroke;
	p.ls = p.beginLinearGradientStroke;
	p.rs = p.beginRadialGradientStroke;
	p.bs = p.beginBitmapStroke;
	p.es = p.endStroke;
	p.dr = p.drawRect;
	p.rr = p.drawRoundRect;
	p.rc = p.drawRoundRectComplex;
	p.dc = p.drawCircle;
	p.de = p.drawEllipse;
	p.dp = p.drawPolyStar;
	p.p = p.decodePath;
	p._updateInstructions = function (commit) {
		var instr = this._instructions, active = this._activeInstructions, commitIndex = this._commitIndex;
		if (this._dirty && active.length) {
			instr.length = commitIndex;
			instr.push(Graphics.beginCmd);
			var l = active.length, ll = instr.length;
			instr.length = ll + l;
			for (var i = 0; i < l; i++) { instr[i + ll] = active[i]; }
			if (this._fill) { instr.push(this._fill); }
			if (this._stroke) {
				if (this._strokeDash !== this._oldStrokeDash) {
					instr.push(this._strokeDash);
				}
				if (this._strokeStyle !== this._oldStrokeStyle) {
					instr.push(this._strokeStyle);
				}
				if (commit) {
					this._oldStrokeStyle = this._strokeStyle;
					this._oldStrokeDash = this._strokeDash;
				}
				instr.push(this._stroke);
			}
			this._dirty = false;
		}
		if (commit) {
			active.length = 0;
			this._commitIndex = instr.length;
		}
	};
	p._setFill = function (fill) {
		this._updateInstructions(true);
		this.command = this._fill = fill;
		return this;
	};
	p._setStroke = function (stroke) {
		this._updateInstructions(true);
		if (this.command = this._stroke = stroke) {
			stroke.ignoreScale = this._strokeIgnoreScale;
		}
		return this;
	};
	(G.LineTo = function (x, y) {
		this.x = x; this.y = y;
	}).prototype.exec = function (ctx) { ctx.lineTo(this.x, this.y); };
	(G.MoveTo = function (x, y) {
		this.x = x; this.y = y;
	}).prototype.exec = function (ctx) { ctx.moveTo(this.x, this.y); };
	(G.ArcTo = function (x1, y1, x2, y2, radius) {
		this.x1 = x1; this.y1 = y1;
		this.x2 = x2; this.y2 = y2;
		this.radius = radius;
	}).prototype.exec = function (ctx) { ctx.arcTo(this.x1, this.y1, this.x2, this.y2, this.radius); };
	(G.Arc = function (x, y, radius, startAngle, endAngle, anticlockwise) {
		this.x = x; this.y = y;
		this.radius = radius;
		this.startAngle = startAngle; this.endAngle = endAngle;
		this.anticlockwise = !!anticlockwise;
	}).prototype.exec = function (ctx) { ctx.arc(this.x, this.y, this.radius, this.startAngle, this.endAngle, this.anticlockwise); };
	(G.QuadraticCurveTo = function (cpx, cpy, x, y) {
		this.cpx = cpx; this.cpy = cpy;
		this.x = x; this.y = y;
	}).prototype.exec = function (ctx) { ctx.quadraticCurveTo(this.cpx, this.cpy, this.x, this.y); };
	(G.BezierCurveTo = function (cp1x, cp1y, cp2x, cp2y, x, y) {
		this.cp1x = cp1x; this.cp1y = cp1y;
		this.cp2x = cp2x; this.cp2y = cp2y;
		this.x = x; this.y = y;
	}).prototype.exec = function (ctx) { ctx.bezierCurveTo(this.cp1x, this.cp1y, this.cp2x, this.cp2y, this.x, this.y); };
	(G.Rect = function (x, y, w, h) {
		this.x = x; this.y = y;
		this.w = w; this.h = h;
	}).prototype.exec = function (ctx) { ctx.rect(this.x, this.y, this.w, this.h); };
	(G.ClosePath = function () {
	}).prototype.exec = function (ctx) { ctx.closePath(); };
	(G.BeginPath = function () {
	}).prototype.exec = function (ctx) { ctx.beginPath(); };
	p = (G.Fill = function (style, matrix) {
		this.style = style;
		this.matrix = matrix;
	}).prototype;
	p.exec = function (ctx) {
		if (!this.style) { return; }
		ctx.fillStyle = this.style;
		var mtx = this.matrix;
		if (mtx) { ctx.save(); ctx.transform(mtx.a, mtx.b, mtx.c, mtx.d, mtx.tx, mtx.ty); }
		ctx.fill();
		if (mtx) { ctx.restore(); }
	};
	p.linearGradient = function (colors, ratios, x0, y0, x1, y1) {
		var o = this.style = Graphics._ctx.createLinearGradient(x0, y0, x1, y1);
		for (var i = 0, l = colors.length; i < l; i++) { o.addColorStop(ratios[i], colors[i]); }
		o.props = { colors: colors, ratios: ratios, x0: x0, y0: y0, x1: x1, y1: y1, type: "linear" };
		return this;
	};
	p.radialGradient = function (colors, ratios, x0, y0, r0, x1, y1, r1) {
		var o = this.style = Graphics._ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
		for (var i = 0, l = colors.length; i < l; i++) { o.addColorStop(ratios[i], colors[i]); }
		o.props = { colors: colors, ratios: ratios, x0: x0, y0: y0, r0: r0, x1: x1, y1: y1, r1: r1, type: "radial" };
		return this;
	};
	p.bitmap = function (image, repetition) {
		if (image.naturalWidth || image.getContext || image.readyState >= 2) {
			var o = this.style = Graphics._ctx.createPattern(image, repetition || "");
			o.props = { image: image, repetition: repetition, type: "bitmap" };
		}
		return this;
	};
	p.path = false;
	p = (G.Stroke = function (style, ignoreScale) {
		this.style = style;
		this.ignoreScale = ignoreScale;
	}).prototype;
	p.exec = function (ctx) {
		if (!this.style) { return; }
		ctx.strokeStyle = this.style;
		if (this.ignoreScale) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
		ctx.stroke();
		if (this.ignoreScale) { ctx.restore(); }
	};
	p.linearGradient = G.Fill.prototype.linearGradient;
	p.radialGradient = G.Fill.prototype.radialGradient;
	p.bitmap = G.Fill.prototype.bitmap;
	p.path = false;
	p = (G.StrokeStyle = function (width, caps, joints, miterLimit, ignoreScale) {
		this.width = width;
		this.caps = caps;
		this.joints = joints;
		this.miterLimit = miterLimit;
		this.ignoreScale = ignoreScale;
	}).prototype;
	p.exec = function (ctx) {
		ctx.lineWidth = (this.width == null ? "1" : this.width);
		ctx.lineCap = (this.caps == null ? "butt" : (isNaN(this.caps) ? this.caps : Graphics.STROKE_CAPS_MAP[this.caps]));
		ctx.lineJoin = (this.joints == null ? "miter" : (isNaN(this.joints) ? this.joints : Graphics.STROKE_JOINTS_MAP[this.joints]));
		ctx.miterLimit = (this.miterLimit == null ? "10" : this.miterLimit);
		ctx.ignoreScale = (this.ignoreScale == null ? false : this.ignoreScale);
	};
	p.path = false;
	(G.StrokeDash = function (segments, offset) {
		this.segments = segments;
		this.offset = offset || 0;
	}).prototype.exec = function (ctx) {
		if (ctx.setLineDash) {
			ctx.setLineDash(this.segments || G.StrokeDash.EMPTY_SEGMENTS);
			ctx.lineDashOffset = this.offset || 0;
		}
	};
	G.StrokeDash.EMPTY_SEGMENTS = [];
	(G.RoundRect = function (x, y, w, h, radiusTL, radiusTR, radiusBR, radiusBL) {
		this.x = x; this.y = y;
		this.w = w; this.h = h;
		this.radiusTL = radiusTL; this.radiusTR = radiusTR;
		this.radiusBR = radiusBR; this.radiusBL = radiusBL;
	}).prototype.exec = function (ctx) {
		var max = (w < h ? w : h) / 2;
		var mTL = 0, mTR = 0, mBR = 0, mBL = 0;
		var x = this.x, y = this.y, w = this.w, h = this.h;
		var rTL = this.radiusTL, rTR = this.radiusTR, rBR = this.radiusBR, rBL = this.radiusBL;
		if (rTL < 0) { rTL *= (mTL = -1); }
		if (rTL > max) { rTL = max; }
		if (rTR < 0) { rTR *= (mTR = -1); }
		if (rTR > max) { rTR = max; }
		if (rBR < 0) { rBR *= (mBR = -1); }
		if (rBR > max) { rBR = max; }
		if (rBL < 0) { rBL *= (mBL = -1); }
		if (rBL > max) { rBL = max; }
		ctx.moveTo(x + w - rTR, y);
		ctx.arcTo(x + w + rTR * mTR, y - rTR * mTR, x + w, y + rTR, rTR);
		ctx.lineTo(x + w, y + h - rBR);
		ctx.arcTo(x + w + rBR * mBR, y + h + rBR * mBR, x + w - rBR, y + h, rBR);
		ctx.lineTo(x + rBL, y + h);
		ctx.arcTo(x - rBL * mBL, y + h + rBL * mBL, x, y + h - rBL, rBL);
		ctx.lineTo(x, y + rTL);
		ctx.arcTo(x - rTL * mTL, y - rTL * mTL, x + rTL, y, rTL);
		ctx.closePath();
	};
	(G.Circle = function (x, y, radius) {
		this.x = x; this.y = y;
		this.radius = radius;
	}).prototype.exec = function (ctx) { ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); };
	(G.Ellipse = function (x, y, w, h) {
		this.x = x; this.y = y;
		this.w = w; this.h = h;
	}).prototype.exec = function (ctx) {
		var x = this.x, y = this.y;
		var w = this.w, h = this.h;
		var k = 0.5522848;
		var ox = (w / 2) * k;
		var oy = (h / 2) * k;
		var xe = x + w;
		var ye = y + h;
		var xm = x + w / 2;
		var ym = y + h / 2;
		ctx.moveTo(x, ym);
		ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
		ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
		ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
		ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
	};
	(G.PolyStar = function (x, y, radius, sides, pointSize, angle) {
		this.x = x; this.y = y;
		this.radius = radius;
		this.sides = sides;
		this.pointSize = pointSize;
		this.angle = angle;
	}).prototype.exec = function (ctx) {
		var x = this.x, y = this.y;
		var radius = this.radius;
		var angle = (this.angle || 0) / 180 * Math.PI;
		var sides = this.sides;
		var ps = 1 - (this.pointSize || 0);
		var a = Math.PI / sides;
		ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
		for (var i = 0; i < sides; i++) {
			angle += a;
			if (ps != 1) {
				ctx.lineTo(x + Math.cos(angle) * radius * ps, y + Math.sin(angle) * radius * ps);
			}
			angle += a;
			ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
		}
		ctx.closePath();
	};
	Graphics.beginCmd = new G.BeginPath();
	createjs.Graphics = Graphics;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function DisplayObject() {
		this.EventDispatcher_constructor();
		this.alpha = 1;
		this.cacheCanvas = null;
		this.bitmapCache = null;
		this.id = createjs.UID.get();
		this.mouseEnabled = true;
		this.tickEnabled = true;
		this.name = null;
		this.parent = null;
		this.regX = 0;
		this.regY = 0;
		this.offsetX=0;
		this.offsetY=0;
		this.rotation = 0;
		this.scaleX = 1;
		this.scaleY = 1;
		this.skewX = 0;
		this.skewY = 0;
		this.shadow = null;
		this.visible = true;
		this.x = 0;
		this.y = 0;
		this.transformMatrix = null;
		this.compositeOperation = null;
		this.snapToPixel = true;
		this.filters = null;
		this.mask = null;
		this.hitArea = null;
		this.cursor = null;
		this._props = new createjs.DisplayProps();
		this._rectangle = new createjs.Rectangle();
		this._bounds = null;
		this._webGLRenderStyle = DisplayObject._StageGL_NONE;
	}
	var p = createjs.extend(DisplayObject, createjs.EventDispatcher);
	DisplayObject._MOUSE_EVENTS = ["click", "dblclick", "mousedown", "mouseout", "mouseover", "pressmove", "pressup", "rollout", "rollover"];
	DisplayObject.suppressCrossDomainErrors = false;
	DisplayObject._snapToPixelEnabled = false;
	DisplayObject._StageGL_NONE = 0;
	DisplayObject._StageGL_SPRITE = 1;
	DisplayObject._StageGL_BITMAP = 2;
	var canvas = createjs.createCanvas ? createjs.createCanvas() : document.createElement("canvas");
	if (canvas.getContext) {
		DisplayObject._hitTestCanvas = canvas;
		DisplayObject._hitTestContext = canvas.getContext("2d");
		canvas.width = canvas.height = 1;
	}
	p._getStage = function () {
		var o = this, _Stage = createjs["Stage"];
		while (o.parent) { o = o.parent; }
		if (o instanceof _Stage) { return o; }
		return null;
	};
	p.bindFunction = function (fn, ...args) {
		fn.call(this, ...args)
	};
	p.getStage = createjs.deprecate(p._getStage, "DisplayObject.getStage");
	try {
		Object.defineProperties(p, {
			stage: { get: p._getStage },
			cacheID: {
				get: function () { return this.bitmapCache && this.bitmapCache.cacheID },
				set: function (a) { this.bitmapCache && (this.bitmapCache.cacheID = a) }
			},
			scale: {
				get: function () { return this.scaleX; },
				set: function (scale) { this.scaleX = this.scaleY = scale; },
			}
		});
	} catch (e) { }
	p.isVisible = function () {
		return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0);
	};
	p.removeFromParent = function () {
		var p = this.parent;
		if (p) { p.removeChild(this); }
	};
	p.addTo = function (parent) {
		parent.addChild(this);
		return this;
	}
	p.draw = function (ctx, ignoreCache) {
		var cache = this.bitmapCache;
		if (cache && !ignoreCache) {
			return cache.draw(ctx);
		}
		return false;
	};
	p.updateContext = function (ctx) {
		var o = this, mask = o.mask, mtx = o._props.matrix;
		if (mask && mask.graphics && !mask.graphics.isEmpty()) {
			mask.getMatrix(mtx);
			ctx.transform(mtx.a, mtx.b, mtx.c, mtx.d, mtx.tx, mtx.ty);
			mask.graphics.drawAsPath(ctx);
			ctx.clip();
			mtx.invert();
			ctx.transform(mtx.a, mtx.b, mtx.c, mtx.d, mtx.tx, mtx.ty);
		}
		this.getMatrix(mtx);
		var tx = mtx.tx, ty = mtx.ty;
		if (DisplayObject._snapToPixelEnabled && o.snapToPixel) {
			tx = tx + (tx < 0 ? -0.5 : 0.5) | 0;
			ty = ty + (ty < 0 ? -0.5 : 0.5) | 0;
		}
		ctx.transform(mtx.a, mtx.b, mtx.c, mtx.d, tx, ty);
		ctx.globalAlpha *= o.alpha;
		if (o.compositeOperation) { ctx.globalCompositeOperation = o.compositeOperation; }
		if (o.shadow) { this._applyShadow(ctx, o.shadow); }
	};
	p.cache = function (x, y, width, height, scale, options) {
		if (!this.bitmapCache) {
			this.bitmapCache = new createjs.BitmapCache();
		}
		this.bitmapCache.define(this, x, y, width, height, scale, options);
	};
	p.updateCache = function (compositeOperation) {
		if (!this.bitmapCache) {
			throw "cache() must be called before updateCache()";
		}
		this.bitmapCache.update(compositeOperation);
	};
	p.uncache = function () {
		if (this.bitmapCache) {
			this.bitmapCache.release();
			this.bitmapCache = undefined;
		}
	};
	p.getCacheDataURL = function () {
		return this.bitmapCache ? this.bitmapCache.getDataURL() : null;
	};
	p.localToGlobal = function (x, y, pt) {
		return this.getConcatenatedMatrix(this._props.matrix).transformPoint(x, y, pt || new createjs.Point());
	};
	p.globalToLocal = function (x, y, pt) {
		return this.getConcatenatedMatrix(this._props.matrix).invert().transformPoint(x, y, pt || new createjs.Point());
	};
	p.localToLocal = function (x, y, target, pt) {
		pt = this.localToGlobal(x, y, pt);
		return target.globalToLocal(pt.x, pt.y, pt);
	};
	p.setTransform = function (x, y, scaleX, scaleY, rotation, skewX, skewY, regX, regY) {
		this.x = x || 0;
		this.y = y || 0;
		this.scaleX = scaleX == null ? 1 : scaleX;
		this.scaleY = scaleY == null ? 1 : scaleY;
		this.rotation = rotation || 0;
		this.skewX = skewX || 0;
		this.skewY = skewY || 0;
		this.regX = regX || 0;
		this.regY = regY || 0;
		return this;
	};
	p.getMatrix = function (matrix) {
		var o = this, mtx = matrix && matrix.identity() || new createjs.Matrix2D();
		return o.transformMatrix ? mtx.copy(o.transformMatrix) : mtx.appendTransform(o.x, o.y, o.scaleX, o.scaleY, o.rotation, o.skewX, o.skewY, o.regX, o.regY);
	};
	p.getConcatenatedMatrix = function (matrix) {
		var o = this, mtx = this.getMatrix(matrix);
		while (o = o.parent) {
			mtx.prependMatrix(o.getMatrix(o._props.matrix));
		}
		return mtx;
	};
	p.getConcatenatedDisplayProps = function (props) {
		props = props ? props.identity() : new createjs.DisplayProps();
		var o = this, mtx = o.getMatrix(props.matrix);
		do {
			props.prepend(o.visible, o.alpha, o.shadow, o.compositeOperation);
			if (o != this) { mtx.prependMatrix(o.getMatrix(o._props.matrix)); }
		} while (o = o.parent);
		return props;
	};
	p.hitTest = function (x, y) {
		var ctx = DisplayObject._hitTestContext;
		ctx.setTransform(1, 0, 0, 1, -x, -y);
		this.draw(ctx);
		var hit = this._testHit(ctx, x, y);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, 2, 2);
		return hit;
	};
	p.set = function (props) {
		for (var n in props) { this[n] = props[n]; }
		return this;
	};
	p.getBounds = function () {
		if (this._bounds) { return this._rectangle.copy(this._bounds); }
		var cacheCanvas = this.cacheCanvas;
		if (cacheCanvas) {
			var scale = this._cacheScale;
			return this._rectangle.setValues(this._cacheOffsetX, this._cacheOffsetY, cacheCanvas.width / scale, cacheCanvas.height / scale);
		}
		return null;
	};
	p.getTransformedBounds = function () {
		return this._getBounds();
	};
	p.setBounds = function (x, y, width, height) {
		if (x == null) { this._bounds = x; return; }
		this._bounds = (this._bounds || new createjs.Rectangle()).setValues(x, y, width, height);
	};
	p.clone = function () {
		return this._cloneProps(new DisplayObject());
	};
	p.toString = function () {
		return "[DisplayObject (name=" + this.name + ")]";
	};
	p._updateState = null;
	p._cloneProps = function (o) {
		o.alpha = this.alpha;
		o.mouseEnabled = this.mouseEnabled;
		o.tickEnabled = this.tickEnabled;
		o.name = this.name;
		o.regX = this.regX;
		o.regY = this.regY;
		o.rotation = this.rotation;
		o.scaleX = this.scaleX;
		o.scaleY = this.scaleY;
		o.shadow = this.shadow;
		o.skewX = this.skewX;
		o.skewY = this.skewY;
		o.visible = this.visible;
		o.x = this.x;
		o.y = this.y;
		o.compositeOperation = this.compositeOperation;
		o.snapToPixel = this.snapToPixel;
		o.filters = this.filters == null ? null : this.filters.slice(0);
		o.mask = this.mask;
		o.hitArea = this.hitArea;
		o.cursor = this.cursor;
		o._bounds = this._bounds;
		return o;
	};
	p._applyShadow = function (ctx, shadow) {
		shadow = shadow || Shadow.identity;
		ctx.shadowColor = shadow.color;
		ctx.shadowOffsetX = shadow.offsetX;
		ctx.shadowOffsetY = shadow.offsetY;
		ctx.shadowBlur = shadow.blur;
	};
	p._tick = function (evtObj) {
		var ls = this._listeners;
		if (ls && ls["tick"]) {
			evtObj.target = null;
			evtObj.propagationStopped = evtObj.immediatePropagationStopped = false;
			this.dispatchEvent(evtObj);
		}
		if (this.onUpdate) this.onUpdate()
	};
	p._testHit = function (ctx, x, y) {
		//		console.log(window.location.protocol === 'file:');
		//return this.hitTestPoint(x, y, true)
		try {
			var hit = ctx.getImageData(0, 0, 1, 1).data[3] > 1;
		} catch (e) {
			if (!DisplayObject.suppressCrossDomainErrors) {
				throw "An error has occurred. This is most likely due to security restrictions on reading canvas pixel data with local or cross-domain images.";
			}
		}
		return hit;
	};
	p._getBounds = function (matrix, ignoreTransform) {
		return this._transformBounds(this.getBounds(), matrix, ignoreTransform);
	};
	p._transformBounds = function (bounds, matrix, ignoreTransform) {
		if (!bounds) { return bounds; }
		var x = bounds.x, y = bounds.y, width = bounds.width, height = bounds.height, mtx = this._props.matrix;
		mtx = ignoreTransform ? mtx.identity() : this.getMatrix(mtx);
		if (x || y) { mtx.appendTransform(0, 0, 1, 1, 0, 0, 0, -x, -y); }
		if (matrix) { mtx.prependMatrix(matrix); }
		var x_a = width * mtx.a, x_b = width * mtx.b;
		var y_c = height * mtx.c, y_d = height * mtx.d;
		var tx = mtx.tx, ty = mtx.ty;
		var minX = tx, maxX = tx, minY = ty, maxY = ty;
		if ((x = x_a + tx) < minX) { minX = x; } else if (x > maxX) { maxX = x; }
		if ((x = x_a + y_c + tx) < minX) { minX = x; } else if (x > maxX) { maxX = x; }
		if ((x = y_c + tx) < minX) { minX = x; } else if (x > maxX) { maxX = x; }
		if ((y = x_b + ty) < minY) { minY = y; } else if (y > maxY) { maxY = y; }
		if ((y = x_b + y_d + ty) < minY) { minY = y; } else if (y > maxY) { maxY = y; }
		if ((y = y_d + ty) < minY) { minY = y; } else if (y > maxY) { maxY = y; }
		return bounds.setValues(minX, minY, maxX - minX, maxY - minY);
	};
	p._hasMouseEventListener = function () {
		var evts = DisplayObject._MOUSE_EVENTS;
		for (var i = 0, l = evts.length; i < l; i++) {
			if (this.hasEventListener(evts[i])) { return true; }
		}
		return !!this.cursor;
	};
	p.hitTestPoint = function (x, y, usePolyCollision) {
		var bound = this.getRectBounds(),
			hit = x >= bound.x && x <= bound.x + bound.width &&
				y >= bound.y && y <= bound.y + bound.height;

		if (hit && usePolyCollision) {
			hit = pointInPolygon(x, y, bound);
		}
		return hit;
	}
	p.hitTestObject = function (object, usePolyCollision) {
		var b1 = this.getRectBounds(),
			b2 = object.getRectBounds(),
			hit = b1.x <= b2.x + b2.width && b2.x <= b1.x + b1.width &&
				b1.y <= b2.y + b2.height && b2.y <= b1.y + b1.height ? {
				a: b1,
				b: b2
			} : false;;
		//		console.log(b2)
		if (hit && usePolyCollision) {
			var arr1 = [];
			var arr2 = [];
			isConcavePolygon(b1) && concavToConvex(b1, arr1);
			isConcavePolygon(b2) && concavToConvex(b2, arr2);
			arr1.length == 0 && arr1.push(b1);
			arr2.length == 0 && arr2.push(b2);
			for (var i = 0; i < arr1.length; i++) {
				for (var j = 0; j < arr2.length; j++) {
					if (polygonCollision(arr1[i], arr2[j])) {
						return true;
					}
				}
			}
			return false
			// hit = polygonCollision(b1, b2);
		}
		return hit;
	};
	function polygonCollision(poly1, poly2) {
		var result = doSATCheck(poly1, poly2, {
			overlap: -Infinity,
			normal: {
				x: 0,
				y: 0
			}
		});
		if (result)
			return doSATCheck(poly2, poly1, result);
		return false;
	}
	function doSATCheck(poly1, poly2, result) {
		var len1 = poly1.length,
			len2 = poly2.length,
			currentPoint,
			nextPoint,
			distance,
			min1,
			max1,
			min2,
			max2,
			dot,
			overlap,
			normal = {
				x: 0,
				y: 0
			};

		for (var i = 0; i < len1; i++) {
			currentPoint = poly1[i];
			nextPoint = poly1[(i < len1 - 1 ? i + 1 : 0)];

			normal.x = currentPoint.y - nextPoint.y;
			normal.y = nextPoint.x - currentPoint.x;

			distance = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
			normal.x /= distance;
			normal.y /= distance;

			min1 = max1 = poly1[0].x * normal.x + poly1[0].y * normal.y;
			for (var j = 1; j < len1; j++) {
				dot = poly1[j].x * normal.x + poly1[j].y * normal.y;
				if (dot > max1)
					max1 = dot;
				else if (dot < min1)
					min1 = dot;
			}

			min2 = max2 = poly2[0].x * normal.x + poly2[0].y * normal.y;
			for (j = 1; j < len2; j++) {
				dot = poly2[j].x * normal.x + poly2[j].y * normal.y;
				if (dot > max2)
					max2 = dot;
				else if (dot < min2)
					min2 = dot;
			}

			if (min1 < min2) {
				overlap = min2 - max1;
				normal.x = -normal.x;
				normal.y = -normal.y;
			} else {
				overlap = min1 - max2;
			}

			if (overlap >= 0) {
				return false;
			} else if (overlap > result.overlap) {
				result.overlap = overlap;
				result.normal.x = normal.x;
				result.normal.y = normal.y;
			}
		}

		return result;
	}
	function concavToConvex(vertices, output) {
		var points = filterOutUselessVertex(vertices);
		var total = points.length;
		var isClockwise = isClockwiseSquence(points);
		var concavPoint = null;
		var concavIndex = -1;
		for (var i = 0; i < total; i++) {
			var v1 = points[i];
			var v2 = getValidIndex(i + 1, total);
			var p = getValidIndex(i + 2, total);
			var curSide = getPointOnVectorSide(v1, points[v2], points[p]);
			if (isClockwise && curSide == ON_LEFT_SIDE) {
				concavPoint = points[v2];
				concavIndex = v2;
				break;
			} else if (!isClockwise && curSide == ON_RIGHT_SIDE) {
				concavPoint = points[v2];
				concavIndex = v2;
				break;
			}
		}
		if (concavPoint != null) {
			var index = concavIndex;
			var p2 = getValidIndex(index + 1, total);
			var p1 = getValidIndex(index - 1, total);
			var angle = getAngle(points[p1], points[index], points[p2]);
			var halfAngle = (Math.PI * 2 - angle) / 2;
			var minAngle = 100;
			var divideIndex;
			for (var i = 0; i < total; i++) {
				if (i == index || i == p1 || i == p2) {
					continue;
				}
				var side = getPointOnVectorSide(points[p1], points[index], points[i]);
				if ((isClockwise && side == ON_RIGHT_SIDE) ||
					(!isClockwise && side == ON_LEFT_SIDE) ||
					side == ON_LINE_OUT) {
					if (!isCrossWithEdges(points, p1, index, p2, i)) {
						var curAngle = getAngle(points[p1], points[index], points[i]);
						var delta = Math.abs(curAngle - halfAngle);
						if (delta < minAngle) {
							minAngle = delta;
							divideIndex = i;
						}
					}
				}
			}
			var arr = splitArray(points, index, divideIndex);
			concavToConvex(arr[0], output);
			concavToConvex(arr[1], output);
		} else {
			output.push(points);
		}
	};
	function splitArray(vertices, index1, index2) {
		var small = Math.min(index1, index2);
		var big = Math.max(index1, index2);
		var total = vertices.length;
		var v1 = vertices[small];
		var v2 = vertices[big];
		var start = small + 1;
		var numbersBetween = Math.abs(index1 - index2) - 1;
		var newSeries;
		var delta = start + numbersBetween - vertices.length;
		if (delta > 0) {
			for (var i = 0; i < delta; i++) {
				var item = vertices.shift();
				vertices.push(item);
				start--;
			}
		}
		newSeries = vertices.splice(start, numbersBetween);
		newSeries.push(v2, v1);
		return [newSeries, vertices];
	}
	function isCrossWithEdges(vertices, p1, index, p2, checkingIndex) {
		var q1 = getValidIndex(checkingIndex - 1, vertices.length);
		var q2 = getValidIndex(checkingIndex + 1, vertices.length);
		var needSkip1 = [p1, index, p2];
		var needSkip2 = [q1, checkingIndex, q2];
		for (var i = 0; i < vertices.length; i++) {
			var edgeIndex = (i + 1) % vertices.length;
			if (needSkip1.indexOf(i) >= 0 && needSkip1.indexOf(edgeIndex) >= 0) {
				continue;
			}
			if (needSkip2.indexOf(i) >= 0 && needSkip2.indexOf(edgeIndex) >= 0) {
				continue;
			}
			if (lineSegmentCross(vertices[i], vertices[edgeIndex], vertices[index], vertices[checkingIndex])) {
				return true;
			}
		}
		return false;
	}
	function lineSegmentCross(p1, p2, q1, q2) {
		p1 = new Vertex(p1.x, p1.y);
		p2 = new Vertex(p2.x, p2.y);
		q1 = new Vertex(q1.x, q1.y);
		q2 = new Vertex(q2.x, q2.y);
		if (p1.equals(q1) || p1.equals(q2) || p2.equals(q1) || p2.equals(q2)) {
			return true;
		}
		var cross = getCrossPoint2(p1, p2, q1, q2);
		if (cross == null) {
			//the two line is parallel
			if (getPointOnVectorSide(p1, p2, q1) == ON_LINE_IN || getPointOnVectorSide(p1, p2, q2) == ON_LINE_IN) {
				return true;
			}
			return false;
		}
		if (isBetween(cross.x, p1.x, p2.x) && isBetween(cross.x, q1.x, q2.x) &&
			isBetween(cross.y, p1.y, p2.y) && isBetween(cross.y, q1.y, q2.y)) {
			return true;
		}
		return false;
	}
	function getCrossPoint2(start1, end1, start2, end2) {
		var a1 = end1.y - start1.y;
		var b1 = start1.x - end1.x;
		var c1 = end1.x * start1.y - start1.x * end1.y;
		var a2 = end2.y - start2.y;
		var b2 = start2.x - end2.x;
		var c2 = end2.x * start2.y - start2.x * end2.y;
		var denominator = (a2 * b1 - a1 * b2);
		if (denominator == 0) {
			return null;
		}
		var x = (b2 * c1 - b1 * c2) / denominator;
		var y = (a1 * c2 - a2 * c1) / denominator;
		return new Vertex(x, y);
	}
	function Vertex(x, y) {
		this.x = x;
		this.y = y;
		this.id = "unknown";
		this.equals = function (other) {
			if (other == null) {
				return false;
			}
			if (other.x == this.x && other.y == this.y) {
				return true;
			}
			return false;
		}

		this.toString = function () {
			return "(" + parseInt(this.x) + " | " + parseInt(this.y) + ")";
		}

		this.init = function (str) {
			var str1 = str.substring(1, str.length - 1);
			var arr = str1.split("|");
			this.x = parseInt(arr[0]);
			this.y = parseInt(arr[1]);
		}
	}
	function getAngle(a, b, c) {
		var a1 = getAngleWithX_axis(b, a);
		var a2 = getAngleWithX_axis(b, c);
		var ret = a1 - a2;
		if (ret > Math.PI) {
			return Math.PI * 2 - ret;
		} else {
			return ret;
		}
	}
	function isClockwiseSquence(vertices) {
		var leftCount = 0;
		var rightCount = 0;
		for (var i = 0; i < vertices.length; i++) {
			var v2Index = getValidIndex(i + 1, vertices.length);
			var pIndex = getValidIndex(i + 2, vertices.length);
			var curSide = getPointOnVectorSide(vertices[i], vertices[v2Index], vertices[pIndex]);
			if (curSide == ON_LEFT_SIDE) {
				leftCount++;
			} else {
				rightCount++;
			}
		}
		if (rightCount > leftCount) {
			return true;
		} else if (rightCount < leftCount) {
			return false;
		} else {
			var arr = vertices;
			arr.pop();
			return isClockwiseSquence(arr);
		}
	}
	var ON_LEFT_SIDE = 1;
	var ON_RIGHT_SIDE = 2;
	var ON_LINE_IN = 3;
	var ON_LINE_OUT = 4;
	//return point p's position regards vector v1 to v2
	function getPointOnVectorSide(v1, v2, p) {
		var a1 = getAngleWithX_axis(v1, v2);
		var a2 = getAngleWithX_axis(v1, p);
		if (Math.abs(a1 - a2) < 0.001 || Math.abs(a1 - a2 - Math.PI) < 0.001) {
			if (isBetween(p.x, v1.x, v2.x) && isBetween(p.y, v1.y, v2.y)) {
				return ON_LINE_IN;
			}
			return ON_LINE_OUT;
		}
		if (a1 <= Math.PI) {
			if (a2 < a1 || a2 - a1 > Math.PI) {
				return ON_LEFT_SIDE;
			} else {
				return ON_RIGHT_SIDE;
			}
		} else {
			if (a2 > a1 || a1 - a2 > Math.PI) {
				return ON_RIGHT_SIDE;
			} else {
				return ON_LEFT_SIDE;
			}
		}
	}
	function isBetween(m, a, b) {
		if (m >= a && m <= b) {
			return true;
		}
		if (m >= b && m <= a) {
			return true;
		}
		return false;
	}
	function getAngleWithX_axis(v1, v2) {
		var distance = getDistance(v1, v2);
		var dx = v2.x - v1.x;
		var cosA = dx / distance;
		if (v2.y >= v1.y) {
			return Math.acos(cosA);
		} else {
			return 2 * Math.PI - Math.acos(cosA);
		}
	}
	function getDistance(v1, v2) {
		return Math.sqrt(getDistanceSquare(v1, v2));
	}
	function getDistanceSquare(v1, v2) {
		var dx = v2.x - v1.x;
		var dy = v2.y - v1.y;
		return dx * dx + dy * dy;
	}
	function getValidIndex(index, total) {
		if (index >= total) {
			return index % total;
		}
		if (index < 0) {
			return total + index % total;
		}
		return index;
	}
	function filterOutUselessVertex(vertices) {
		var ret = [];
		var k,
			firstK,
			lastK;
		for (var i = 0; i < vertices.length; i++) {
			if (i == 0) {
				var last = vertices[vertices.length - 1];
				if (!last) continue
				if (last.x == vertices[0].x) {
					k = "Infinity";
				} else {
					k = (last.y - vertices[0].y) / (last.x - vertices[0].x);
				}
				firstK = k;
				ret.push(last);
			} else {
				var curK;
				if (vertices[i - 1].x == vertices[i].x) {
					curK = "Infinity";
				} else {
					curK = (vertices[i - 1].y - vertices[i].y) / (vertices[i - 1].x - vertices[i].x)
				}
				if (k == curK || Math.abs(k - curK) < 0.001) {
					continue;
				} else {
					k = curK;
				}
				if (i == vertices.length - 1) {
					lastK = curK;
				}
				ret.push(vertices[i - 1]);
			}
		}
		if (firstK == lastK || Math.abs(firstK - lastK) < 0.001) {
			ret.shift();
		}
		return ret;
	}
	function isConcavePolygon(poly) {
		if (poly.length <= 3)
			return false;

		// 多边形相邻的两个顶点构成向量
		let vectors = [];
		for (let i = 0; i < poly.length; i++) {
			let p1 = poly[i];
			let p2 = poly[(i + 1) % poly.length];
			vectors.push([p1, p2]);
		}

		// 计算相邻两个向量的叉积
		let preValue = crossProduct(vectors[0], vectors[1]);
		for (let i = 1; i < vectors.length; i++) {
			let curValue = crossProduct(vectors[i], vectors[(i + 1) % vectors.length]);
			// 如果叉积异号（不相等）则为凹多边形
			if (preValue != curValue) {
				return true;
			}
			preValue = curValue;
		}

		return false;
	}
	function crossProduct(v1, v2) {
		let p1 = v1[0],
			p2 = v1[1];
		let q1 = v2[0],
			q2 = v2[1];

		let result = (p2.x - p1.x) * (q2.y - q1.y) - (q2.x - q1.x) * (p2.y - p1.y);
		return result >= 0 ? 1 : -1;
	}
	function pointInPolygon(x, y, poly) {
		var cross = 0, onBorder = false, minX, maxX, minY, maxY;

		for (var i = 0, len = poly.length; i < len; i++) {
			var p1 = poly[i], p2 = poly[(i + 1) % len];

			if (p1.y == p2.y && y == p1.y) {
				p1.x > p2.x ? (minX = p2.x, maxX = p1.x) : (minX = p1.x, maxX = p2.x);
				if (x >= minX && x <= maxX) {
					onBorder = true;
					continue;
				}
			}

			p1.y > p2.y ? (minY = p2.y, maxY = p1.y) : (minY = p1.y, maxY = p2.y);
			if (y < minY || y > maxY) continue;

			var nx = (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
			if (nx > x) cross++;
			else if (nx == x) onBorder = true;

			//当射线和多边形相交
			if (p1.x > x && p1.y == y) {
				var p0 = poly[(len + i - 1) % len];
				//当交点的两边在射线两旁
				if (p0.y < y && p2.y > y || p0.y > y && p2.y < y) {
					cross++;
				}
			}
		}

		return onBorder || (cross % 2 == 1);
	}
	p.getRectBounds = function () {
		if (this._boundsArea && (!this.boundsArea || this.boundsArr)) {
			this.boundsArea = []
			for (var i = 0; i < this._boundsArea.length; i += 2) {
				this.boundsArea.push({ x: this._boundsArea[i], y: this._boundsArea[i + 1] })
			}
		}
		var vertexs = [], point, x, y, minX, maxX, minY, maxY;
		var rect = this.getBounds();
		var _x = rect && rect.x || 0;
		var _y = rect && rect.y || 0;
		var w = rect && rect.width || 0;
		var h = rect && rect.height || 0;
		var mtx = this.getConcatenatedMatrix();
		var poly = this.boundsArea || [{
			x: 0,
			y: 0
		}, {
			x: w,
			y: 0
		}, {
			x: w,
			y: h
		}, {
			x: 0,
			y: h
		}
		];
		poly = JSON.parse(JSON.stringify(poly));
		vertexs = [],
			point,
			x,
			y,
			minX,
			maxX,
			minY,
			maxY;

		for (var i = 0, len = poly.length; i < len; i++) {
			poly[i].x += _x;
			poly[i].y += _y;
			point = mtx.transformBoundsPoint(poly[i], true, true);
			x = point.x;
			y = point.y;

			if (i == 0) {
				minX = maxX = x;
				minY = maxY = y;
			} else {
				if (minX > x) minX = x;
				else if (maxX < x) maxX = x;
				if (minY > y) minY = y;
				else if (maxY < y) maxY = y;
			}
			vertexs[i] = point;
		}

		vertexs.x = minX;
		vertexs.y = minY;
		vertexs.width = maxX - minX;
		vertexs.height = maxY - minY;
		return vertexs;
	};
	p.getConcatenatedMatrix = function (ancestor) {
		var mtx = new createjs.Matrix2D(1, 0, 0, 1, 0, 0);

		for (var o = this; o != ancestor && o.parent; o = o.parent) {
			var cos = 1, sin = 0,
				rotation = o.rotation % 360,
				regX = o.regX, regY = o.regY,
				scaleX = o.scaleX, scaleY = o.scaleY,
				transform = o.transform;

			if (transform) {
				mtx.concat(transform);
			}
			else {
				if (rotation) {
					var r = rotation * Math.PI / 180;
					cos = Math.cos(r);
					sin = Math.sin(r);
				}

				if (regX != 0) mtx.tx -= regX;
				if (regY != 0) mtx.ty -= regY;

				var pos = { x: o.x, y: o.y }//o.getAlignPosition();
				mtx.concat(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, pos.x, pos.y);
			}

		}
		return mtx;
	};
	createjs.DisplayObject = createjs.promote(DisplayObject, "EventDispatcher");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Container() {
		this.DisplayObject_constructor();
		this.children = [];
		this.mouseChildren = true;
		this.tickChildren = true;
	}
	var p = createjs.extend(Container, createjs.DisplayObject);
	p._getNumChildren = function () {
		return this.children.length;
	};
	p.getNumChildren = createjs.deprecate(p._getNumChildren, "Container.getNumChildren");
	try {
		Object.defineProperties(p, {
			numChildren: { get: p._getNumChildren }
		});
	} catch (e) { }
	p.initialize = Container;
	p.isVisible = function () {
		var hasContent = this.cacheCanvas || this.children.length;
		return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0 && hasContent);
	};
	p.draw = function (ctx, ignoreCache) {
		if (this.DisplayObject_draw(ctx, ignoreCache)) { return true; }
		var list = this.children.slice();
		for (var i = 0, l = list.length; i < l; i++) {
			var child = list[i];
			if (!child.isVisible()) { continue; }
			ctx.save();
			child.updateContext(ctx);
			child.draw(ctx);
			ctx.restore();
		}
		return true;
	};
	p.addChild = function (child) {
		if (child == null) { return child; }
		var l = arguments.length;
		if (l > 1) {
			for (var i = 0; i < l; i++) { this.addChild(arguments[i]); }
			return arguments[l - 1];
		}
		var par = child.parent, silent = par === this;
		par && par._removeChildAt(createjs.indexOf(par.children, child), silent);
		child.parent = this;
		this.children.push(child);
		if (!silent) { child.dispatchEvent("added"); }
		return child;
	};

	p.addChildAt = function (child, index) {
		var l = arguments.length;
		var indx = arguments[l - 1];
		if (indx < 0 || indx > this.children.length) { return arguments[l - 2]; }
		if (l > 2) {
			for (var i = 0; i < l - 1; i++) { this.addChildAt(arguments[i], indx + i); }
			return arguments[l - 2];
		}
		var par = child.parent, silent = par === this;
		par && par._removeChildAt(createjs.indexOf(par.children, child), silent);
		child.parent = this;
		this.children.splice(index, 0, child);
		if (!silent) { child.dispatchEvent("added"); }
		return child;
	};
	p.removeChild = function (child) {
		var l = arguments.length;
		if (l > 1) {
			var good = true;
			for (var i = 0; i < l; i++) { good = good && this.removeChild(arguments[i]); }
			return good;
		}
		return this._removeChildAt(createjs.indexOf(this.children, child));
	};
	p.removeChildAt = function (index) {
		var l = arguments.length;
		if (l > 1) {
			var a = [];
			for (var i = 0; i < l; i++) { a[i] = arguments[i]; }
			a.sort(function (a, b) { return b - a; });
			var good = true;
			for (var i = 0; i < l; i++) { good = good && this._removeChildAt(a[i]); }
			return good;
		}
		return this._removeChildAt(index);
	};
	p.removeAllChildren = function () {
		var kids = this.children;
		while (kids.length) { this._removeChildAt(0); }
	};
	p.getChildAt = function (index) {
		return this.children[index];
	};
	p.getChildByName = function (name) {
		var kids = this.children;
		for (var i = 0, l = kids.length; i < l; i++) {
			if (kids[i].name == name) { return kids[i]; }
		}
		return null;
	};
	p.sortChildren = function (sortFunction) {
		this.children.sort(sortFunction);
	};
	p.getChildIndex = function (child) {
		return createjs.indexOf(this.children, child);
	};
	p.swapChildrenAt = function (index1, index2) {
		var kids = this.children;
		var o1 = kids[index1];
		var o2 = kids[index2];
		if (!o1 || !o2) { return; }
		kids[index1] = o2;
		kids[index2] = o1;
	};
	p.swapChildren = function (child1, child2) {
		var kids = this.children;
		var index1, index2;
		for (var i = 0, l = kids.length; i < l; i++) {
			if (kids[i] == child1) { index1 = i; }
			if (kids[i] == child2) { index2 = i; }
			if (index1 != null && index2 != null) { break; }
		}
		if (i == l) { return; }
		kids[index1] = child2;
		kids[index2] = child1;
	};
	p.setChildIndex = function (child, index) {
		var kids = this.children, l = kids.length;
		index >= l ? index = l - 1 : index
		if (child.parent != this || index < 0) { return; }
		for (var i = 0; i < l; i++) {
			if (kids[i] == child) { break; }
		}
		if (i == l || i == index) { return; }
		kids.splice(i, 1);
		kids.splice(index, 0, child);
	};
	p.contains = function (child) {
		while (child) {
			if (child == this) { return true; }
			child = child.parent;
		}
		return false;
	};
	p.hitTest = function (x, y) {
		return (this.getObjectUnderPoint(x, y) != null);
	};
	p.getObjectsUnderPoint = function (x, y, mode) {
		var arr = [];
		var pt = this.localToGlobal(x, y);
		this._getObjectsUnderPoint(pt.x, pt.y, arr, mode > 0, mode == 1);
		return arr;
	};
	p.getObjectUnderPoint = function (x, y, mode) {
		var pt = this.localToGlobal(x, y);
		return this._getObjectsUnderPoint(pt.x, pt.y, null, mode > 0, mode == 1);
	};
	p.getBounds = function () {
		return this._getBounds(null, true);
	};

	p.getTransformedBounds = function () {
		return this._getBounds();
	};
	p.clone = function (recursive) {
		var o = this._cloneProps(new Container());
		if (recursive) { this._cloneChildren(o); }
		return o;
	};
	p.toString = function () {
		return "[Container (name=" + this.name + ")]";
	};
	p._tick = function (evtObj) {
		if (this.tickChildren) {
			for (var i = this.children.length - 1; i >= 0; i--) {
				var child = this.children[i];
				if (child.tickEnabled && child._tick) { child._tick(evtObj); }
			}
		}
		this.DisplayObject__tick(evtObj);
	};
	p._cloneChildren = function (o) {
		if (o.children.length) { o.removeAllChildren(); }
		var arr = o.children;
		for (var i = 0, l = this.children.length; i < l; i++) {
			var clone = this.children[i].clone(true);
			clone.parent = o;
			arr.push(clone);
		}
	};
	p._removeChildAt = function (index, silent) {
		if (index < 0 || index > this.children.length - 1) { return false; }
		var child = this.children[index];
		if (child) { child.parent = null; child.htmlElement && child.htmlElement.parentNode && child.htmlElement.parentNode.removeChild(child.htmlElement); }
		this.children.splice(index, 1);
		if (!silent) { child.dispatchEvent("removed"); }
		return true;
	};
	p._getObjectsUnderPoint = function (x, y, arr, mouse, activeListener, currentDepth) {
		currentDepth = currentDepth || 0;
		if (!currentDepth && !this._testMask(this, x, y)) { return null; }
		var mtx, ctx = createjs.DisplayObject._hitTestContext;
		activeListener = activeListener || (mouse && this._hasMouseEventListener());
		var children = this.children, l = children.length;
		var obj;
		for (var i = l - 1; i >= 0; i--) {
			var child = children[i];
			var hitArea = child._boundsArea;
			var hit = false;
			if (!child.visible || (!hitArea && !child.isVisible()) || (mouse && !child.mouseEnabled)) { continue; }
			if (!hitArea && !this._testMask(child, x, y)) { continue; }
			if (!hitArea && child instanceof Container && child.mouseChildren) {
				obj = child._getObjectsUnderPoint(x, y, arr, mouse, activeListener, currentDepth + 1);
				if (!obj) continue
			}
			if (obj) {
				return obj;
			} else if (child._testHit(ctx, x, y)) {
				return child;
			}
		}
		return null;
	};
	p._getObjectsUnderPoint = function(x, y, arr, mouse, activeListener, currentDepth) {
		currentDepth = currentDepth || 0;
		if (!currentDepth && !this._testMask(this, x, y)) { return null; }
		var mtx, ctx = createjs.DisplayObject._hitTestContext;
		activeListener = activeListener || (mouse&&this._hasMouseEventListener());

		// draw children one at a time, and check if we get a hit:
		var children = this.children, l = children.length;
		for (var i=l-1; i>=0; i--) {
			var child = children[i];
			var hitArea = child.hitArea;
			if (!child.visible || (!hitArea && !child.isVisible()) || (mouse && !child.mouseEnabled)) { continue; }
			if (!hitArea && !this._testMask(child, x, y)) { continue; }
			
			// if a child container has a hitArea then we only need to check its hitAre2a, so we can treat it as a normal DO:
			if (!hitArea && child instanceof Container) {
				var result = child._getObjectsUnderPoint(x, y, arr, mouse, activeListener, currentDepth+1);
				if (!arr && result) { return (mouse && !this.mouseChildren) ? this : result; }
			} else {
				if (mouse && !activeListener && !child._hasMouseEventListener()) { continue; }
				
				// TODO: can we pass displayProps forward, to avoid having to calculate this backwards every time? It's kind of a mixed bag. When we're only hunting for DOs with event listeners, it may not make sense.
				var props = child.getConcatenatedDisplayProps(child._props);
				mtx = props.matrix;
				
				if (hitArea) {
					mtx.appendMatrix(hitArea.getMatrix(hitArea._props.matrix));
					props.alpha = hitArea.alpha;
				}
				
				ctx.globalAlpha = props.alpha;
				ctx.setTransform(mtx.a,  mtx.b, mtx.c, mtx.d, mtx.tx-x, mtx.ty-y);
				(hitArea||child).draw(ctx);
				if (!this._testHit(ctx)) { continue; }
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, 2, 2);
				if (arr) { arr.push(child); }
				else { return (mouse && !this.mouseChildren) ? this : child; }
			}
		}
		return null;
	};
	p._testMask = function (target, x, y) {
		var mask = target.mask;
		if (!mask || !mask.graphics || mask.graphics.isEmpty()) { return true; }
		var mtx = this._props.matrix, parent = target.parent;
		mtx = parent ? parent.getConcatenatedMatrix(mtx) : mtx.identity();
		mtx = mask.getMatrix(mask._props.matrix).prependMatrix(mtx);
		var ctx = createjs.DisplayObject._hitTestContext;
		ctx.setTransform(mtx.a, mtx.b, mtx.c, mtx.d, mtx.tx - x, mtx.ty - y);
		mask.graphics.drawAsPath(ctx);
		ctx.fillStyle = "#000";
		ctx.fill();
		if (!mask._testHit(ctx, x, y)) { return false; }
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, 2, 2);
		return true;
	};
	p._getBounds = function (matrix, ignoreTransform) {
		var bounds = this.DisplayObject_getBounds();
		if (bounds) { return this._transformBounds(bounds, matrix, ignoreTransform); }
		var mtx = this._props.matrix;
		mtx = ignoreTransform ? mtx.identity() : this.getMatrix(mtx);
		if (matrix) { mtx.prependMatrix(matrix); }
		var l = this.children.length, rect = null;
		for (var i = 0; i < l; i++) {
			var child = this.children[i];
			if (!child.visible || !(bounds = child._getBounds(mtx))) { continue; }
			if (rect) { rect.extend(bounds.x, bounds.y, bounds.width, bounds.height); }
			else {
				rect = (bounds instanceof createjs.Rectangle) ? bounds.clone() : bounds;
			}
		}
		return rect;
	};
	p.getViewAtPoint = function (x, y, usePolyCollision, global, eventMode) {
		var result = global ? [] : null,
			children = this.children, child, obj;

		for (var i = children.length - 1; i >= 0; i--) {
			child = children[i];
			//skip child which is not shown or pointer enabled
			if (!child || !child.visible || child.alpha <= 0 || (eventMode && !child.mouseEnabled)) continue;
			//find child recursively
			if (child.children && child.children.length && !(eventMode && !child.mouseChildren)) {
				obj = child.getViewAtPoint(x, y, usePolyCollision, global, eventMode);
			}

			if (obj) {
				if (!global) return obj;
				else if (obj.length) result = result.concat(obj);
			} else if (child.hitTestPoint(x, y, usePolyCollision)) {
				if (!global) return child;
				else result.push(child);
			}
		}

		return global && result.length ? result : null;
	};




	createjs.Container = createjs.promote(Container, "DisplayObject");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Stage(canvas) {
		this.Container_constructor();
		this.autoClear = true;
		this.canvas = (typeof canvas == "string") ? document.getElementById(canvas) : canvas;
		this.mouseX = 0;
		this.mouseY = 0;
		this.drawRect = null;
		this.snapToPixelEnabled = false;
		this.mouseInBounds = false;
		this.tickOnUpdate = true;
		this.mouseMoveOutside = false;
		this.preventSelection = true;
		this._pointerData = {};
		this._pointerCount = 0;
		this._primaryPointerID = null;
		this._mouseOverIntervalID = null;
		this._nextStage = null;
		this._prevStage = null;
		this.enableDOMEvents(true);
	}
	var p = createjs.extend(Stage, createjs.Container);
	p._get_nextStage = function () {
		return this._nextStage;
	};
	p._set_nextStage = function (value) {
		if (this._nextStage) { this._nextStage._prevStage = null; }
		if (value) { value._prevStage = this; }
		this._nextStage = value;
	};
	try {
		Object.defineProperties(p, {
			nextStage: { get: p._get_nextStage, set: p._set_nextStage }
		});
	} catch (e) { }
	p.update = function (props) {
		if (!this.canvas) { return; }
		if (this.tickOnUpdate) { this.tick(props); }
		if (this.dispatchEvent("drawstart", false, true) === false) { return; }
		createjs.DisplayObject._snapToPixelEnabled = this.snapToPixelEnabled;
		var r = this.drawRect, ctx = this.canvas.getContext("2d");
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if (this.autoClear) {
			if (r) { ctx.clearRect(r.x, r.y, r.width, r.height); }
			else { ctx.clearRect(0, 0, this.canvas.width + 1, this.canvas.height + 1); }
		}
		ctx.save();
		if (this.drawRect) {
			ctx.beginPath();
			ctx.rect(r.x, r.y, r.width, r.height);
			ctx.clip();
		}
		this.updateContext(ctx);
		this.draw(ctx, false);
		ctx.restore();
		this.dispatchEvent("drawend");
	};
	p.tick = function (props) {
		if (!this.tickEnabled || this.dispatchEvent("tickstart", false, true) === false) { return; }
		var evtObj = new createjs.Event("tick");
		if (props) {
			for (var n in props) {
				if (props.hasOwnProperty(n)) { evtObj[n] = props[n]; }
			}
		}
		this._tick(evtObj);
		this.dispatchEvent("tickend");
	};
	p.handleEvent = function (evt) {
		if (evt.type == "tick") { this.update(evt); }
	};
	p.clear = function () {
		if (!this.canvas) { return; }
		var ctx = this.canvas.getContext("2d");
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.canvas.width + 1, this.canvas.height + 1);
	};
	p.toDataURL = function (backgroundColor, mimeType) {
		var data, ctx = this.canvas.getContext('2d'), w = this.canvas.width, h = this.canvas.height;
		if (backgroundColor) {
			data = ctx.getImageData(0, 0, w, h);
			var compositeOperation = ctx.globalCompositeOperation;
			ctx.globalCompositeOperation = "destination-over";
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(0, 0, w, h);
		}
		var dataURL = this.canvas.toDataURL(mimeType || "image/png");
		if (backgroundColor) {
			ctx.putImageData(data, 0, 0);
			ctx.globalCompositeOperation = compositeOperation;
		}
		return dataURL;
	};
	p.enableMouseOver = function (frequency) {
		if (this._mouseOverIntervalID) {
			clearInterval(this._mouseOverIntervalID);
			this._mouseOverIntervalID = null;
			if (frequency == 0) {
				this._testMouseOver(true);
			}
		}
		if (frequency == null) { frequency = 20; }
		else if (frequency <= 0) { return; }
		var o = this;
		this._mouseOverIntervalID = setInterval(function () { o._testMouseOver(); }, 1000 / Math.min(50, frequency));
	};
	p.enableDOMEvents = function (enable) {
		if (enable == null) { enable = true; }
		var n, o, ls = this._eventListeners;
		if (!enable && ls) {
			for (n in ls) {
				o = ls[n];
				o.t.removeEventListener(n, o.f, false);
			}
			this._eventListeners = null;
		} else if (enable && !ls && this.canvas) {
			var t = window.addEventListener ? window : document;
			var _this = this;
			ls = this._eventListeners = {};
			ls["mouseup"] = { t: t, f: function (e) { _this._handleMouseUp(e) } };
			ls["mousemove"] = { t: t, f: function (e) { _this._handleMouseMove(e) } };
			ls["dblclick"] = { t: this.canvas, f: function (e) { _this._handleDoubleClick(e) } };
			ls["mousedown"] = { t: this.canvas, f: function (e) { _this._handleMouseDown(e) } };
			for (n in ls) {
				o = ls[n];
				o.t.addEventListener(n, o.f, false);
			}
		}
	};
	p.clone = function () {
		throw ("Stage cannot be cloned.");
	};
	p.toString = function () {
		return "[Stage (name=" + this.name + ")]";
	};
	p._getElementRect = function (e) {
		var bounds;
		try { bounds = e.getBoundingClientRect(); }
		catch (err) { bounds = { top: e.offsetTop, left: e.offsetLeft, width: e.offsetWidth, height: e.offsetHeight }; }
		var offX = (window.pageXOffset || document.scrollLeft || 0) - (document.clientLeft || document.body.clientLeft || 0);
		var offY = (window.pageYOffset || document.scrollTop || 0) - (document.clientTop || document.body.clientTop || 0);
		var styles = window.getComputedStyle ? getComputedStyle(e, null) : e.currentStyle;
		var padL = parseInt(styles.paddingLeft) + parseInt(styles.borderLeftWidth);
		var padT = parseInt(styles.paddingTop) + parseInt(styles.borderTopWidth);
		var padR = parseInt(styles.paddingRight) + parseInt(styles.borderRightWidth);
		var padB = parseInt(styles.paddingBottom) + parseInt(styles.borderBottomWidth);
		return {
			left: bounds.left + offX + padL,
			right: bounds.right + offX - padR,
			top: bounds.top + offY + padT,
			bottom: bounds.bottom + offY - padB
		}
	};
	p._getPointerData = function (id) {
		var data = this._pointerData[id];
		if (!data) { data = this._pointerData[id] = { x: 0, y: 0 }; }
		return data;
	};
	p._handleMouseMove = function (e) {
		if (!e) { e = window.event; }
		this._handlePointerMove(-1, e, e.pageX, e.pageY);
	};
	p._handlePointerMove = function (id, e, pageX, pageY, owner) {
		return
		if (this._prevStage && owner === undefined) { return; }
		if (!this.canvas) { return; }
		var nextStage = this._nextStage, o = this._getPointerData(id);
		var inBounds = o.inBounds;
		this._updatePointerPosition(id, e, pageX, pageY);
		if (inBounds || o.inBounds || this.mouseMoveOutside) {
			if (id === -1 && o.inBounds == !inBounds) {
				this._dispatchMouseEvent(this, (inBounds ? "mouseleave" : "mouseenter"), false, id, o, e);
			}
			this._dispatchMouseEvent(this, "stagemousemove", false, id, o, e);
			this._dispatchMouseEvent(o.target, "pressmove", true, id, o, e);
		}
		nextStage && nextStage._handlePointerMove(id, e, pageX, pageY, null);
	};
	p._updatePointerPosition = function (id, e, pageX, pageY) {
		var rect = this._getElementRect(this.canvas);
		pageX -= rect.left;
		pageY -= rect.top;
		var w = this.canvas.width;
		var h = this.canvas.height;
		pageX /= (rect.right - rect.left) / w;
		pageY /= (rect.bottom - rect.top) / h;
		var o = this._getPointerData(id);
		if (o.inBounds = (pageX >= 0 && pageY >= 0 && pageX <= w - 1 && pageY <= h - 1)) {
			o.x = pageX;
			o.y = pageY;
		} else if (this.mouseMoveOutside) {
			o.x = pageX < 0 ? 0 : (pageX > w - 1 ? w - 1 : pageX);
			o.y = pageY < 0 ? 0 : (pageY > h - 1 ? h - 1 : pageY);
		}
		o.posEvtObj = e;
		o.rawX = pageX;
		o.rawY = pageY;
		if (id === this._primaryPointerID || id === -1) {
			this.mouseX = o.x;
			this.mouseY = o.y;
			this.mouseInBounds = o.inBounds;
			var obj = this._getObjectsUnderPoint(o.x, o.y, null, true);
			var cursor = (obj && obj.mouseEnabled && obj.cursor) ? 'pointer' : '';
			this.canvas.style.cursor = cursor;
		}
	};
	p._handleMouseUp = function (e) {
		this._handlePointerUp(-1, e, false);
	};
	p._handlePointerUp = function (id, e, clear, owner) {
		var nextStage = this._nextStage, o = this._getPointerData(id);
		if (this._prevStage && owner === undefined) { return; }
		var target = null, oTarget = o.target;
		if (!owner && (oTarget || nextStage)) { target = this._getObjectsUnderPoint(o.x, o.y, null, true); }
		if (o.down) { this._dispatchMouseEvent(this, "stagemouseup", false, id, o, e, target); o.down = false; }
		if (target == oTarget) { this._dispatchMouseEvent(oTarget, "click", true, id, o, e); }
		this._dispatchMouseEvent(oTarget, "pressup", true, id, o, e);
		if (clear) {
			if (id == this._primaryPointerID) { this._primaryPointerID = null; }
			delete (this._pointerData[id]);
		} else { o.target = null; }
		nextStage && nextStage._handlePointerUp(id, e, clear, owner || target && this);
	};
	p._handleMouseDown = function (e) {
		console.log("??")
		this._handlePointerDown(-1, e, e.pageX, e.pageY);
	};
	p._handlePointerDown = function (id, e, pageX, pageY, owner) {
		if (this.preventSelection) { e.preventDefault(); }
		if (this._primaryPointerID == null || id === -1) { this._primaryPointerID = id; }
		if (pageY != null) { this._updatePointerPosition(id, e, pageX, pageY); }
		var target = null, nextStage = this._nextStage, o = this._getPointerData(id);
		if (!owner) { target = o.target = this._getObjectsUnderPoint(o.x, o.y, null, true); }
		if (o.inBounds) { this._dispatchMouseEvent(this, "stagemousedown", false, id, o, e, target); o.down = true; }
		this._dispatchMouseEvent(target, "mousedown", true, id, o, e);
		nextStage && nextStage._handlePointerDown(id, e, pageX, pageY, owner || target && this);
	};
	p._testMouseOver = function (clear, owner, eventTarget) {
		if (this._prevStage && owner === undefined) { return; }
		var nextStage = this._nextStage;
		if (!this._mouseOverIntervalID) {
			nextStage && nextStage._testMouseOver(clear, owner, eventTarget);
			return;
		}
		var o = this._getPointerData(-1);
		if (!o || (!clear && this.mouseX == this._mouseOverX && this.mouseY == this._mouseOverY && this.mouseInBounds)) { return; }
		var e = o.posEvtObj;
		var isEventTarget = eventTarget || e && (e.target == this.canvas);
		var target = null, common = -1, cursor = "", t, i, l;
		if (!owner && (clear || this.mouseInBounds && isEventTarget)) {
			target = this._getObjectsUnderPoint(this.mouseX, this.mouseY, null, true);
			this._mouseOverX = this.mouseX;
			this._mouseOverY = this.mouseY;
		}
		var oldList = this._mouseOverTarget || [];
		var oldTarget = oldList[oldList.length - 1];
		var list = this._mouseOverTarget = [];
		t = target;
		while (t) {
			list.unshift(t);
			if (!cursor) { cursor = t.cursor; }
			t = t.parent;
		}
		this.canvas.style.cursor = cursor;
		if (!owner && eventTarget) { eventTarget.canvas.style.cursor = cursor; }
		for (i = 0, l = list.length; i < l; i++) {
			if (list[i] != oldList[i]) { break; }
			common = i;
		}
		if (oldTarget != target) {
			this._dispatchMouseEvent(oldTarget, "mouseout", true, -1, o, e, target);
		}
		for (i = oldList.length - 1; i > common; i--) {
			this._dispatchMouseEvent(oldList[i], "rollout", false, -1, o, e, target);
		}
		for (i = list.length - 1; i > common; i--) {
			this._dispatchMouseEvent(list[i], "rollover", false, -1, o, e, oldTarget);
		}
		if (oldTarget != target) {
			this._dispatchMouseEvent(target, "mouseover", true, -1, o, e, oldTarget);
		}
		nextStage && nextStage._testMouseOver(clear, owner || target && this, eventTarget || isEventTarget && this);
	};
	p._handleDoubleClick = function (e, owner) {
		var target = null, nextStage = this._nextStage, o = this._getPointerData(-1);
		if (!owner) {
			target = this._getObjectsUnderPoint(o.x, o.y, null, true);
			this._dispatchMouseEvent(target, "dblclick", true, -1, o, e);
		}
		nextStage && nextStage._handleDoubleClick(e, owner || target && this);
	};
	p._dispatchMouseEvent = function (target, type, bubbles, pointerId, o, nativeEvent, relatedTarget) {
		if (!target || (!bubbles && !target.hasEventListener(type))) { return; }
		var evt = new createjs.MouseEvent(type, bubbles, false, o.x, o.y, nativeEvent, pointerId, pointerId === this._primaryPointerID || pointerId === -1, o.rawX, o.rawY, relatedTarget);
		target.dispatchEvent(evt);
	};
	createjs.Stage = createjs.promote(Stage, "Container");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function StageGL(canvas, options) {
		this.Stage_constructor(canvas);
		if (options !== undefined) {
			if (typeof options !== "object") { throw ("Invalid options object"); }
			var premultiply = options.premultiply;
			var transparent = options.transparent;
			var antialias = options.antialias;
			var preserveBuffer = options.preserveBuffer;
			var autoPurge = options.autoPurge;
		}
		this.vocalDebug = false;
		this._preserveBuffer = preserveBuffer || false;
		this._antialias = antialias || false;
		this._transparent = transparent || false;
		this._premultiply = premultiply || false;
		this._autoPurge = undefined;
		this.autoPurge = autoPurge;	//getter/setter handles setting the real value and validating
		this._viewportWidth = 0;
		this._viewportHeight = 0;
		this._projectionMatrix = null;
		this._webGLContext = null;
		this._clearColor = { r: 0.50, g: 0.50, b: 0.50, a: 0.00 };
		this._maxCardsPerBatch = StageGL.DEFAULT_MAX_BATCH_SIZE;														//TODO: write getter/setters for this
		this._activeShader = null;
		this._vertices = null;
		this._vertexPositionBuffer = null;
		this._uvs = null;
		this._uvPositionBuffer = null;
		this._indices = null;
		this._textureIndexBuffer = null;
		this._alphas = null;
		this._alphaBuffer = null;
		this._textureDictionary = [];
		this._textureIDs = {};
		this._batchTextures = [];
		this._baseTextures = [];
		this._batchTextureCount = 8;
		this._lastTextureInsert = -1;
		this._batchID = 0;
		this._drawID = 0;
		this._slotBlacklist = [];
		this._isDrawing = 0;
		this._lastTrackedCanvas = 0;
		this.isCacheControlled = false;
		this._cacheContainer = new createjs.Container();
		this._initializeWebGL();
	}
	var p = createjs.extend(StageGL, createjs.Stage);
	StageGL.buildUVRects = function (spritesheet, target, onlyTarget) {
		if (!spritesheet || !spritesheet._frames) { return null; }
		if (target === undefined) { target = -1; }
		if (onlyTarget === undefined) { onlyTarget = false; }
		var start = (target != -1 && onlyTarget) ? (target) : (0);
		var end = (target != -1 && onlyTarget) ? (target + 1) : (spritesheet._frames.length);
		for (var i = start; i < end; i++) {
			var f = spritesheet._frames[i];
			if (f.uvRect || f.image.width <= 0 || f.image.height <= 0) { continue; }
			var r = f.rect;
			f.uvRect = {
				t: r.y / f.image.height,
				l: r.x / f.image.width,
				b: (r.y + r.height) / f.image.height,
				r: (r.x + r.width) / f.image.width
			};
		}
		return spritesheet._frames[(target != -1) ? target : 0].uvRect || { t: 0, l: 0, b: 1, r: 1 };
	};
	StageGL.isWebGLActive = function (ctx) {
		return ctx &&
			ctx instanceof WebGLRenderingContext &&
			typeof WebGLRenderingContext !== 'undefined';
	};
	StageGL.VERTEX_PROPERTY_COUNT = 6;
	StageGL.INDICIES_PER_CARD = 6;
	StageGL.DEFAULT_MAX_BATCH_SIZE = 10000;
	StageGL.WEBGL_MAX_INDEX_NUM = Math.pow(2, 16);
	StageGL.UV_RECT = { t: 0, l: 0, b: 1, r: 1 };
	try {
		StageGL.COVER_VERT = new Float32Array([
			-1, 1,		//TL
			1, 1,		//TR
			-1, -1,		//BL
			1, 1,		//TR
			1, -1,		//BR
			-1, -1		//BL
		]);
		StageGL.COVER_UV = new Float32Array([
			0, 0,		//TL
			1, 0,		//TR
			0, 1,		//BL
			1, 0,		//TR
			1, 1,		//BR
			0, 1		//BL
		]);
		StageGL.COVER_UV_FLIP = new Float32Array([
			0, 1,		//TL
			1, 1,		//TR
			0, 0,		//BL
			1, 1,		//TR
			1, 0,		//BR
			0, 0		//BL
		]);
	} catch (e) { }
	StageGL.REGULAR_VARYING_HEADER = (
		"precision mediump float;" +
		"varying vec2 vTextureCoord;" +
		"varying lowp float indexPicker;" +
		"varying lowp float alphaValue;"
	);
	StageGL.REGULAR_VERTEX_HEADER = (
		StageGL.REGULAR_VARYING_HEADER +
		"attribute vec2 vertexPosition;" +
		"attribute vec2 uvPosition;" +
		"attribute lowp float textureIndex;" +
		"attribute lowp float objectAlpha;" +
		"uniform mat4 pMatrix;"
	);
	StageGL.REGULAR_FRAGMENT_HEADER = (
		StageGL.REGULAR_VARYING_HEADER +
		"uniform sampler2D uSampler[{{count}}];"
	);
	StageGL.REGULAR_VERTEX_BODY = (
		"void main(void) {" +
		//DHG TODO: This doesn't work. Must be something wrong with the hand built matrix see js... bypass for now
		//vertexPosition, round if flag
		//"gl_Position = pMatrix * vec4(vertexPosition.x, vertexPosition.y, 0.0, 1.0);" +
		"gl_Position = vec4(" +
		"(vertexPosition.x * pMatrix[0][0]) + pMatrix[3][0]," +
		"(vertexPosition.y * pMatrix[1][1]) + pMatrix[3][1]," +
		"pMatrix[3][2]," +
		"1.0" +
		");" +
		"alphaValue = objectAlpha;" +
		"indexPicker = textureIndex;" +
		"vTextureCoord = uvPosition;" +
		"}"
	);
	StageGL.REGULAR_FRAGMENT_BODY = (
		"void main(void) {" +
		"vec4 color = vec4(1.0, 0.0, 0.0, 1.0);" +
		"if (indexPicker <= 0.5) {" +
		"color = texture2D(uSampler[0], vTextureCoord);" +
		"{{alternates}}" +
		"}" +
		"{{fragColor}}" +
		"}"
	);
	StageGL.REGULAR_FRAG_COLOR_NORMAL = (
		"gl_FragColor = vec4(color.rgb, color.a * alphaValue);"
	);
	StageGL.REGULAR_FRAG_COLOR_PREMULTIPLY = (
		"if(color.a > 0.0035) {" +
		"gl_FragColor = vec4(color.rgb/color.a, color.a * alphaValue);" +
		"} else {" +
		"gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);" +
		"}"
	);
	//TODO: DHG: a real particle shader
	StageGL.PARTICLE_VERTEX_BODY = (
		StageGL.REGULAR_VERTEX_BODY
	);
	StageGL.PARTICLE_FRAGMENT_BODY = (
		StageGL.REGULAR_FRAGMENT_BODY
	);
	StageGL.COVER_VARYING_HEADER = (
		"precision mediump float;" +
		"varying highp vec2 vRenderCoord;" +
		"varying highp vec2 vTextureCoord;"
	);
	StageGL.COVER_VERTEX_HEADER = (
		StageGL.COVER_VARYING_HEADER +
		"attribute vec2 vertexPosition;" +
		"attribute vec2 uvPosition;" +
		"uniform float uUpright;"
	);
	StageGL.COVER_FRAGMENT_HEADER = (
		StageGL.COVER_VARYING_HEADER +
		"uniform sampler2D uSampler;"
	);
	StageGL.COVER_VERTEX_BODY = (
		"void main(void) {" +
		"gl_Position = vec4(vertexPosition.x, vertexPosition.y, 0.0, 1.0);" +
		"vRenderCoord = uvPosition;" +
		"vTextureCoord = vec2(uvPosition.x, abs(uUpright - uvPosition.y));" +
		"}"
	);
	StageGL.COVER_FRAGMENT_BODY = (
		"void main(void) {" +
		"vec4 color = texture2D(uSampler, vRenderCoord);" +
		"gl_FragColor = color;" +
		"}"
	);
	p._get_isWebGL = function () {
		return !!this._webGLContext;
	};
	p._set_autoPurge = function (value) {
		value = isNaN(value) ? 1200 : value;
		if (value != -1) {
			value = value < 10 ? 10 : value;
		}
		this._autoPurge = value;
	};
	p._get_autoPurge = function () {
		return Number(this._autoPurge);
	};
	try {
		Object.defineProperties(p, {
			isWebGL: { get: p._get_isWebGL },
			autoPurge: { get: p._get_autoPurge, set: p._set_autoPurge }
		});
	} catch (e) { }
	p._initializeWebGL = function () {
		if (this.canvas) {
			if (!this._webGLContext || this._webGLContext.canvas !== this.canvas) {
				var options = {
					depth: false,
					alpha: this._transparent,
					stencil: true,
					antialias: this._antialias,
					premultipliedAlpha: this._premultiply,
					preserveDrawingBuffer: this._preserveBuffer
				};
				var gl = this._webGLContext = this._fetchWebGLContext(this.canvas, options);
				if (!gl) { return null; }
				this.updateSimultaneousTextureCount(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
				this._maxTextureSlots = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
				this._createBuffers(gl);
				this._initTextures(gl);
				gl.disable(gl.DEPTH_TEST);
				gl.enable(gl.BLEND);
				gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this._premultiply);
				//gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
				this._webGLContext.clearColor(this._clearColor.r, this._clearColor.g, this._clearColor.b, this._clearColor.a);
				this.updateViewport(this._viewportWidth || this.canvas.width, this._viewportHeight || this.canvas.height);
			}
		} else {
			this._webGLContext = null;
		}
		return this._webGLContext;
	};
	p.update = function (props) {
		if (!this.canvas) { return; }
		if (this.tickOnUpdate) { this.tick(props); }
		this.dispatchEvent("drawstart");
		if (this.autoClear) { this.clear(); }
		if (this._webGLContext) {
			this._batchDraw(this, this._webGLContext);
			if (this._autoPurge != -1 && !(this._drawID % ((this._autoPurge / 2) | 0))) {
				this.purgeTextures(this._autoPurge);
			}
		} else {
			var ctx = this.canvas.getContext("2d");
			ctx.save();
			this.updateContext(ctx);
			this.draw(ctx, false);
			ctx.restore();
		}
		this.dispatchEvent("drawend");
	};
	p.clear = function () {
		if (!this.canvas) { return; }
		if (StageGL.isWebGLActive(this._webGLContext)) {
			var gl = this._webGLContext;
			var cc = this._clearColor;
			var adjust = this._transparent ? cc.a : 1.0;
			this._webGLContext.clearColor(cc.r * adjust, cc.g * adjust, cc.b * adjust, adjust);
			gl.clear(gl.COLOR_BUFFER_BIT);
			this._webGLContext.clearColor(cc.r, cc.g, cc.b, cc.a);
		} else {
			this.Stage_clear();
		}
	};
	p.draw = function (context, ignoreCache) {
		if (context === this._webGLContext && StageGL.isWebGLActive(this._webGLContext)) {
			var gl = this._webGLContext;
			this._batchDraw(this, gl, ignoreCache);
			return true;
		} else {
			return this.Stage_draw(context, ignoreCache);
		}
	};
	p.cacheDraw = function (target, filters, manager) {
		if (StageGL.isWebGLActive(this._webGLContext)) {
			var gl = this._webGLContext;
			this._cacheDraw(gl, target, filters, manager);
			return true;
		} else {
			return false;
		}
	};
	p.protectTextureSlot = function (id, lock) {
		if (id > this._maxTextureSlots || id < 0) {
			throw "Slot outside of acceptable range";
		}
		this._slotBlacklist[id] = !!lock;
	};
	p.getTargetRenderTexture = function (target, w, h) {
		var result, toggle = false;
		var gl = this._webGLContext;
		if (target.__lastRT !== undefined && target.__lastRT === target.__rtA) { toggle = true; }
		if (!toggle) {
			if (target.__rtA === undefined) {
				target.__rtA = this.getRenderBufferTexture(w, h);
			} else {
				if (w != target.__rtA._width || h != target.__rtA._height) {
					this.resizeTexture(target.__rtA, w, h);
				}
				this.setTextureParams(gl);
			}
			result = target.__rtA;
		} else {
			if (target.__rtB === undefined) {
				target.__rtB = this.getRenderBufferTexture(w, h);
			} else {
				if (w != target.__rtB._width || h != target.__rtB._height) {
					this.resizeTexture(target.__rtB, w, h);
				}
				this.setTextureParams(gl);
			}
			result = target.__rtB;
		}
		if (!result) {
			throw "Problems creating render textures, known causes include using too much VRAM by not releasing WebGL texture instances";
		}
		target.__lastRT = result;
		return result;
	};
	p.releaseTexture = function (item) {
		var i, l;
		if (!item) { return; }
		if (item.children) {
			for (i = 0, l = item.children.length; i < l; i++) {
				this.releaseTexture(item.children[i]);
			}
		}
		if (item.cacheCanvas) {
			item.uncache();
		}
		var foundImage = undefined;
		if (item._storeID !== undefined) {
			if (item === this._textureDictionary[item._storeID]) {
				this._killTextureObject(item);
				item._storeID = undefined;
				return;
			}
			foundImage = item;
		} else if (item._webGLRenderStyle === 2) {
			foundImage = item.image;
		} else if (item._webGLRenderStyle === 1) {
			for (i = 0, l = item.spriteSheet._images.length; i < l; i++) {
				this.releaseTexture(item.spriteSheet._images[i]);
			}
			return;
		}
		if (foundImage === undefined) {
			if (this.vocalDebug) {
				console.log("No associated texture found on release");
			}
			return;
		}
		this._killTextureObject(this._textureDictionary[foundImage._storeID]);
		foundImage._storeID = undefined;
	};
	p.purgeTextures = function (count) {
		if (count == undefined) { count = 100; }
		var dict = this._textureDictionary;
		var l = dict.length;
		for (var i = 0; i < l; i++) {
			var item = dict[i];
			if (!item) { continue; }
			if (item._drawID + count <= this._drawID) {
				this._killTextureObject(item);
			}
		}
	};
	p.updateSimultaneousTextureCount = function (count) {
		var gl = this._webGLContext;
		var success = false;
		if (count < 1 || isNaN(count)) { count = 1; }
		this._batchTextureCount = count;
		while (!success) {
			try {
				this._activeShader = this._fetchShaderProgram(gl);
				success = true;
			} catch (e) {
				if (this._batchTextureCount == 1) {
					throw "Cannot compile shader " + e;
				}
				this._batchTextureCount -= 4;
				if (this._batchTextureCount < 1) { this._batchTextureCount = 1; }
				if (this.vocalDebug) {
					console.log("Reducing desired texture count due to errors: " + this._batchTextureCount);
				}
			}
		}
	};
	p.updateViewport = function (width, height) {
		this._viewportWidth = width | 0;
		this._viewportHeight = height | 0;
		var gl = this._webGLContext;
		if (gl) {
			gl.viewport(0, 0, this._viewportWidth, this._viewportHeight);
			this._projectionMatrix = new Float32Array([
				2 / this._viewportWidth, 0, 0, 0,
				0, -2 / this._viewportHeight, 1, 0,
				0, 0, 1, 0,
				-1, 1, 0.1, 0
			]);
			this._projectionMatrixFlip = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
			this._projectionMatrixFlip.set(this._projectionMatrix);
			this._projectionMatrixFlip[5] *= -1;
			this._projectionMatrixFlip[13] *= -1;
		}
	};
	p.getFilterShader = function (filter) {
		if (!filter) { filter = this; }
		var gl = this._webGLContext;
		var targetShader = this._activeShader;
		if (filter._builtShader) {
			targetShader = filter._builtShader;
			if (filter.shaderParamSetup) {
				gl.useProgram(targetShader);
				filter.shaderParamSetup(gl, this, targetShader);
			}
		} else {
			try {
				targetShader = this._fetchShaderProgram(
					gl, "filter",
					filter.VTX_SHADER_BODY, filter.FRAG_SHADER_BODY,
					filter.shaderParamSetup && filter.shaderParamSetup.bind(filter)
				);
				filter._builtShader = targetShader;
				targetShader._name = filter.toString();
			} catch (e) {
				console && console.log("SHADER SWITCH FAILURE", e);
			}
		}
		return targetShader;
	};
	p.getBaseTexture = function (w, h) {
		var width = Math.ceil(w > 0 ? w : 1) || 1;
		var height = Math.ceil(h > 0 ? h : 1) || 1;
		var gl = this._webGLContext;
		var texture = gl.createTexture();
		this.resizeTexture(texture, width, height);
		this.setTextureParams(gl, false);
		return texture;
	};
	p.resizeTexture = function (texture, width, height) {
		var gl = this._webGLContext;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			width, height, 0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null
		);
		texture.width = width;
		texture.height = height;
	};
	p.getRenderBufferTexture = function (w, h) {
		var gl = this._webGLContext;
		var renderTexture = this.getBaseTexture(w, h);
		if (!renderTexture) { return null; }
		var frameBuffer = gl.createFramebuffer();
		if (!frameBuffer) { return null; }
		renderTexture.width = w;
		renderTexture.height = h;
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);
		frameBuffer._renderTexture = renderTexture;
		renderTexture._frameBuffer = frameBuffer;
		renderTexture._storeID = this._textureDictionary.length;
		this._textureDictionary[renderTexture._storeID] = renderTexture;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		return renderTexture;
	};
	p.setTextureParams = function (gl, isPOT) {
		if (isPOT && this._antialias) {
			//non POT linear works in some devices, but performance is NOT good, investigate
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	};
	p.setClearColor = function (color) {
		var r, g, b, a, output;
		if (typeof color == "string") {
			if (color.indexOf("#") == 0) {
				if (color.length == 4) {
					color = "#" + color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2) + color.charAt(3) + color.charAt(3)
				}
				r = Number("0x" + color.slice(1, 3)) / 255;
				g = Number("0x" + color.slice(3, 5)) / 255;
				b = Number("0x" + color.slice(5, 7)) / 255;
				a = Number("0x" + color.slice(7, 9)) / 255;
			} else if (color.indexOf("rgba(") == 0) {
				output = color.slice(5, -1).split(",");
				r = Number(output[0]) / 255;
				g = Number(output[1]) / 255;
				b = Number(output[2]) / 255;
				a = Number(output[3]);
			}
		} else {
			r = ((color & 0xFF000000) >>> 24) / 255;
			g = ((color & 0x00FF0000) >>> 16) / 255;
			b = ((color & 0x0000FF00) >>> 8) / 255;
			a = (color & 0x000000FF) / 255;
		}
		this._clearColor.r = r || 0;
		this._clearColor.g = g || 0;
		this._clearColor.b = b || 0;
		this._clearColor.a = a || 0;
		if (!this._webGLContext) { return; }
		this._webGLContext.clearColor(this._clearColor.r, this._clearColor.g, this._clearColor.b, this._clearColor.a);
	};
	p.toString = function () {
		return "[StageGL (name=" + this.name + ")]";
	};
	p._fetchWebGLContext = function (canvas, options) {
		var gl;
		try {
			gl = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
		} catch (e) {
		}
		if (!gl) {
			var msg = "Could not initialize WebGL";
			console.error ? console.error(msg) : console.log(msg);
		} else {
			gl.viewportWidth = canvas.width;
			gl.viewportHeight = canvas.height;
		}
		return gl;
	};
	p._fetchShaderProgram = function (gl, shaderName, customVTX, customFRAG, shaderParamSetup) {
		gl.useProgram(null);
		var targetFrag, targetVtx;
		switch (shaderName) {
			case "filter":
				targetVtx = StageGL.COVER_VERTEX_HEADER + (customVTX || StageGL.COVER_VERTEX_BODY);
				targetFrag = StageGL.COVER_FRAGMENT_HEADER + (customFRAG || StageGL.COVER_FRAGMENT_BODY);
				break;
			case "particle": //TODO
				targetVtx = StageGL.REGULAR_VERTEX_HEADER + StageGL.PARTICLE_VERTEX_BODY;
				targetFrag = StageGL.REGULAR_FRAGMENT_HEADER + StageGL.PARTICLE_FRAGMENT_BODY;
				break;
			case "override":
				targetVtx = StageGL.REGULAR_VERTEX_HEADER + (customVTX || StageGL.REGULAR_VERTEX_BODY);
				targetFrag = StageGL.REGULAR_FRAGMENT_HEADER + (customFRAG || StageGL.REGULAR_FRAGMENT_BODY);
				break;
			case "regular":
			default:
				targetVtx = StageGL.REGULAR_VERTEX_HEADER + StageGL.REGULAR_VERTEX_BODY;
				targetFrag = StageGL.REGULAR_FRAGMENT_HEADER + StageGL.REGULAR_FRAGMENT_BODY;
				break;
		}
		var vertexShader = this._createShader(gl, gl.VERTEX_SHADER, targetVtx);
		var fragmentShader = this._createShader(gl, gl.FRAGMENT_SHADER, targetFrag);
		var shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);
		shaderProgram._type = shaderName;
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			gl.useProgram(this._activeShader);
			throw gl.getProgramInfoLog(shaderProgram);
		}
		gl.useProgram(shaderProgram);
		switch (shaderName) {
			case "filter":
				shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertexPosition");
				gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
				shaderProgram.uvPositionAttribute = gl.getAttribLocation(shaderProgram, "uvPosition");
				gl.enableVertexAttribArray(shaderProgram.uvPositionAttribute);
				shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
				gl.uniform1i(shaderProgram.samplerUniform, 0);
				shaderProgram.uprightUniform = gl.getUniformLocation(shaderProgram, "uUpright");
				gl.uniform1f(shaderProgram.uprightUniform, 0);
				if (shaderParamSetup) {
					shaderParamSetup(gl, this, shaderProgram);
				}
				break;
			case "override":
			case "particle":
			case "regular":
			default:
				shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertexPosition");
				gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
				shaderProgram.uvPositionAttribute = gl.getAttribLocation(shaderProgram, "uvPosition");
				gl.enableVertexAttribArray(shaderProgram.uvPositionAttribute);
				shaderProgram.textureIndexAttribute = gl.getAttribLocation(shaderProgram, "textureIndex");
				gl.enableVertexAttribArray(shaderProgram.textureIndexAttribute);
				shaderProgram.alphaAttribute = gl.getAttribLocation(shaderProgram, "objectAlpha");
				gl.enableVertexAttribArray(shaderProgram.alphaAttribute);
				var samplers = [];
				for (var i = 0; i < this._batchTextureCount; i++) {
					samplers[i] = i;
				}
				shaderProgram.samplerData = samplers;
				shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
				gl.uniform1iv(shaderProgram.samplerUniform, samplers);
				shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "pMatrix");
				break;
		}
		gl.useProgram(this._activeShader);
		return shaderProgram;
	};
	p._createShader = function (gl, type, str) {
		str = str.replace(/{{count}}/g, this._batchTextureCount);
		var insert = "";
		for (var i = 1; i < this._batchTextureCount; i++) {
			insert += "} else if (indexPicker <= " + i + ".5) { color = texture2D(uSampler[" + i + "], vTextureCoord);";
		}
		str = str.replace(/{{alternates}}/g, insert);
		str = str.replace(/{{fragColor}}/g, this._premultiply ? StageGL.REGULAR_FRAG_COLOR_PREMULTIPLY : StageGL.REGULAR_FRAG_COLOR_NORMAL);
		var shader = gl.createShader(type);
		gl.shaderSource(shader, str);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw gl.getShaderInfoLog(shader);
		}
		return shader;
	};
	p._createBuffers = function (gl) {
		var groupCount = this._maxCardsPerBatch * StageGL.INDICIES_PER_CARD;
		var groupSize, i, l;
		var vertexPositionBuffer = this._vertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		groupSize = 2;
		var vertices = this._vertices = new Float32Array(groupCount * groupSize);
		for (i = 0, l = vertices.length; i < l; i += groupSize) { vertices[i] = vertices[i + 1] = 0; }
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
		vertexPositionBuffer.itemSize = groupSize;
		vertexPositionBuffer.numItems = groupCount;
		var uvPositionBuffer = this._uvPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, uvPositionBuffer);
		groupSize = 2;
		var uvs = this._uvs = new Float32Array(groupCount * groupSize);
		for (i = 0, l = uvs.length; i < l; i += groupSize) { uvs[i] = uvs[i + 1] = 0; }
		gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
		uvPositionBuffer.itemSize = groupSize;
		uvPositionBuffer.numItems = groupCount;
		var textureIndexBuffer = this._textureIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, textureIndexBuffer);
		groupSize = 1;
		var indices = this._indices = new Float32Array(groupCount * groupSize);
		for (i = 0, l = indices.length; i < l; i++) { indices[i] = 0; }
		gl.bufferData(gl.ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
		textureIndexBuffer.itemSize = groupSize;
		textureIndexBuffer.numItems = groupCount;
		var alphaBuffer = this._alphaBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer);
		groupSize = 1;
		var alphas = this._alphas = new Float32Array(groupCount * groupSize);
		for (i = 0, l = alphas.length; i < l; i++) { alphas[i] = 1; }
		gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.DYNAMIC_DRAW);
		alphaBuffer.itemSize = groupSize;
		alphaBuffer.numItems = groupCount;
	};
	p._initTextures = function () {
		//TODO: DHG: add a cleanup routine in here in case this happens mid stream
		this._lastTextureInsert = -1;
		this._textureDictionary = [];
		this._textureIDs = {};
		this._baseTextures = [];
		this._batchTextures = [];
		for (var i = 0; i < this._batchTextureCount; i++) {
			var tex = this.getBaseTexture();
			this._baseTextures[i] = this._batchTextures[i] = tex;
			if (!tex) {
				throw "Problems creating basic textures, known causes include using too much VRAM by not releasing WebGL texture instances";
			}
		}
	};
	p._loadTextureImage = function (gl, image) {
		var src = image.src;
		if (!src) {
			image._isCanvas = true;
			src = image.src = "canvas_" + this._lastTrackedCanvas++;
		}
		var storeID = this._textureIDs[src];
		if (storeID === undefined) {
			storeID = this._textureIDs[src] = this._textureDictionary.length;
		}
		if (this._textureDictionary[storeID] === undefined) {
			this._textureDictionary[storeID] = this.getBaseTexture();
		}
		var texture = this._textureDictionary[storeID];
		if (texture) {
			texture._batchID = this._batchID;
			texture._storeID = storeID;
			texture._imageData = image;
			this._insertTextureInBatch(gl, texture);
			image._storeID = storeID;
			if (image.complete || image.naturalWidth || image._isCanvas) {
				this._updateTextureImageData(gl, image);
			} else {
				image.addEventListener("load", this._updateTextureImageData.bind(this, gl, image));
			}
		} else {
			var msg = "Problem creating desired texture, known causes include using too much VRAM by not releasing WebGL texture instances";
			(console.error && console.error(msg)) || console.log(msg);
			texture = this._baseTextures[0];
			texture._batchID = this._batchID;
			texture._storeID = -1;
			texture._imageData = texture;
			this._insertTextureInBatch(gl, texture);
		}
		return texture;
	};
	p._updateTextureImageData = function (gl, image) {
		var isNPOT = (image.width & image.width - 1) || (image.height & image.height - 1);
		var texture = this._textureDictionary[image._storeID];
		gl.activeTexture(gl.TEXTURE0 + texture._activeIndex);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		texture.isPOT = !isNPOT;
		this.setTextureParams(gl, texture.isPOT);
		try {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		} catch (e) {
			var errString = "\nAn error has occurred. This is most likely due to security restrictions on WebGL images with local or cross-domain origins";
			if (console.error) {
				//TODO: LM: I recommend putting this into a log function internally, since you do it so often, and each is implemented differently.
				console.error(errString);
				console.error(e);
			} else if (console) {
				console.log(errString);
				console.log(e);
			}
		}
		image._invalid = false;
		texture._w = image.width;
		texture._h = image.height;
		if (this.vocalDebug) {
			if (isNPOT) {
				console.warn("NPOT(Non Power of Two) Texture: " + image.src);
			}
			if (image.width > gl.MAX_TEXTURE_SIZE || image.height > gl.MAX_TEXTURE_SIZE) {
				console && console.error("Oversized Texture: " + image.width + "x" + image.height + " vs " + gl.MAX_TEXTURE_SIZE + "max");
			}
		}
	};
	p._insertTextureInBatch = function (gl, texture) {
		if (this._batchTextures[texture._activeIndex] !== texture) {
			var found = -1;
			var start = (this._lastTextureInsert + 1) % this._batchTextureCount;
			var look = start;
			do {
				if (this._batchTextures[look]._batchID != this._batchID && !this._slotBlacklist[look]) {
					found = look;
					break;
				}
				look = (look + 1) % this._batchTextureCount;
			} while (look !== start);
			if (found === -1) {
				this.batchReason = "textureOverflow";
				this._drawBuffers(gl);
				this.batchCardCount = 0;
				found = start;
			}
			this._batchTextures[found] = texture;
			texture._activeIndex = found;
			var image = texture._imageData;
			if (image && image._invalid && texture._drawID !== undefined) {
				this._updateTextureImageData(gl, image);
			} else {
				gl.activeTexture(gl.TEXTURE0 + found);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				this.setTextureParams(gl);
			}
			this._lastTextureInsert = found;
		} else {
			var image = texture._imageData;
			if (texture._storeID != undefined && image && image._invalid) {
				this._updateTextureImageData(gl, image);
			}
		}
		texture._drawID = this._drawID;
		texture._batchID = this._batchID;
	};
	p._killTextureObject = function (tex) {
		if (!tex) { return; }
		var gl = this._webGLContext;
		if (tex._storeID !== undefined && tex._storeID >= 0) {
			this._textureDictionary[tex._storeID] = undefined;
			for (var n in this._textureIDs) {
				if (this._textureIDs[n] == tex._storeID) { delete this._textureIDs[n]; }
			}
			if (tex._imageData) { tex._imageData._storeID = undefined; }
			tex._imageData = tex._storeID = undefined;
		}
		if (tex._activeIndex !== undefined && this._batchTextures[tex._activeIndex] === tex) {
			this._batchTextures[tex._activeIndex] = this._baseTextures[tex._activeIndex];
		}
		try {
			if (tex._frameBuffer) { gl.deleteFramebuffer(tex._frameBuffer); }
			tex._frameBuffer = undefined;
		} catch (e) {
			if (this.vocalDebug) { console.log(e); }
		}
		try {
			gl.deleteTexture(tex);
		} catch (e) {
			if (this.vocalDebug) { console.log(e); }
		}
	};
	p._backupBatchTextures = function (restore, target) {
		var gl = this._webGLContext;
		if (!this._backupTextures) { this._backupTextures = []; }
		if (target === undefined) { target = this._backupTextures; }
		for (var i = 0; i < this._batchTextureCount; i++) {
			gl.activeTexture(gl.TEXTURE0 + i);
			if (restore) {
				this._batchTextures[i] = target[i];
			} else {
				target[i] = this._batchTextures[i];
				this._batchTextures[i] = this._baseTextures[i];
			}
			gl.bindTexture(gl.TEXTURE_2D, this._batchTextures[i]);
			this.setTextureParams(gl, this._batchTextures[i].isPOT);
		}
		if (restore && target === this._backupTextures) { this._backupTextures = []; }
	};
	p._batchDraw = function (sceneGraph, gl, ignoreCache) {
		if (this._isDrawing > 0) {
			this._drawBuffers(gl);
		}
		this._isDrawing++;
		this._drawID++;
		this.batchCardCount = 0;
		this.depth = 0;
		this._appendToBatchGroup(sceneGraph, gl, new createjs.Matrix2D(), this.alpha, ignoreCache);
		this.batchReason = "drawFinish";
		this._drawBuffers(gl);
		this._isDrawing--;
	};
	p._cacheDraw = function (gl, target, filters, manager) {
		var renderTexture;
		var shaderBackup = this._activeShader;
		var blackListBackup = this._slotBlacklist;
		var lastTextureSlot = this._maxTextureSlots - 1;
		var wBackup = this._viewportWidth, hBackup = this._viewportHeight;
		this.protectTextureSlot(lastTextureSlot, true);
		var mtx = target.getMatrix();
		mtx = mtx.clone();
		mtx.scale(1 / manager.scale, 1 / manager.scale);
		mtx = mtx.invert();
		mtx.translate(-manager.offX / manager.scale * target.scaleX, -manager.offY / manager.scale * target.scaleY);
		var container = this._cacheContainer;
		container.children = [target];
		container.transformMatrix = mtx;
		this._backupBatchTextures(false);
		if (filters && filters.length) {
			this._drawFilters(target, filters, manager);
		} else {
			if (this.isCacheControlled) {
				gl.clear(gl.COLOR_BUFFER_BIT);
				this._batchDraw(container, gl, true);
			} else {
				gl.activeTexture(gl.TEXTURE0 + lastTextureSlot);
				target.cacheCanvas = this.getTargetRenderTexture(target, manager._drawWidth, manager._drawHeight);
				renderTexture = target.cacheCanvas;
				gl.bindFramebuffer(gl.FRAMEBUFFER, renderTexture._frameBuffer);
				this.updateViewport(manager._drawWidth, manager._drawHeight);
				this._projectionMatrix = this._projectionMatrixFlip;
				gl.clear(gl.COLOR_BUFFER_BIT);
				this._batchDraw(container, gl, true);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				this.updateViewport(wBackup, hBackup);
			}
		}
		this._backupBatchTextures(true);
		this.protectTextureSlot(lastTextureSlot, false);
		this._activeShader = shaderBackup;
		this._slotBlacklist = blackListBackup;
	};
	p._drawFilters = function (target, filters, manager) {
		var gl = this._webGLContext;
		var renderTexture;
		var lastTextureSlot = this._maxTextureSlots - 1;
		var wBackup = this._viewportWidth, hBackup = this._viewportHeight;
		var container = this._cacheContainer;
		var filterCount = filters.length;
		gl.activeTexture(gl.TEXTURE0 + lastTextureSlot);
		renderTexture = this.getTargetRenderTexture(target, manager._drawWidth, manager._drawHeight);
		gl.bindFramebuffer(gl.FRAMEBUFFER, renderTexture._frameBuffer);
		this.updateViewport(manager._drawWidth, manager._drawHeight);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this._batchDraw(container, gl, true);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, renderTexture);
		this.setTextureParams(gl);
		var flipY = false;
		var i = 0, filter = filters[i];
		do {
			this._activeShader = this.getFilterShader(filter);
			if (!this._activeShader) { continue; }
			gl.activeTexture(gl.TEXTURE0 + lastTextureSlot);
			renderTexture = this.getTargetRenderTexture(target, manager._drawWidth, manager._drawHeight);
			gl.bindFramebuffer(gl.FRAMEBUFFER, renderTexture._frameBuffer);
			gl.viewport(0, 0, manager._drawWidth, manager._drawHeight);
			gl.clear(gl.COLOR_BUFFER_BIT);
			this._drawCover(gl, flipY);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, renderTexture);
			this.setTextureParams(gl);
			if (filterCount > 1 || filters[0]._multiPass) {
				flipY = !flipY;
			}
			filter = filter._multiPass !== null ? filter._multiPass : filters[++i];
		} while (filter);
		if (this.isCacheControlled) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			this.updateViewport(wBackup, hBackup);
			this._activeShader = this.getFilterShader(this);
			gl.clear(gl.COLOR_BUFFER_BIT);
			this._drawCover(gl, flipY);
		} else {
			//TODO: DHG: this is less than ideal. A flipped initial render for this circumstance might help. Adjust the perspective matrix?
			if (flipY) {
				gl.activeTexture(gl.TEXTURE0 + lastTextureSlot);
				renderTexture = this.getTargetRenderTexture(target, manager._drawWidth, manager._drawHeight);
				gl.bindFramebuffer(gl.FRAMEBUFFER, renderTexture._frameBuffer);
				this._activeShader = this.getFilterShader(this);
				gl.viewport(0, 0, manager._drawWidth, manager._drawHeight);
				gl.clear(gl.COLOR_BUFFER_BIT);
				this._drawCover(gl, !flipY);
			}
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			this.updateViewport(wBackup, hBackup);
			target.cacheCanvas = renderTexture;
		}
	};
	p._appendToBatchGroup = function (container, gl, concatMtx, concatAlpha, ignoreCache) {
		if (!container._glMtx) { container._glMtx = new createjs.Matrix2D(); }
		var cMtx = container._glMtx;
		cMtx.copy(concatMtx);
		if (container.transformMatrix) {
			cMtx.appendMatrix(container.transformMatrix);
		} else {
			cMtx.appendTransform(
				container.x, container.y,
				container.scaleX, container.scaleY,
				container.rotation, container.skewX, container.skewY,
				container.regX, container.regY
			);
		}
		var subL, subT, subR, subB;
		var l = container.children.length;
		for (var i = 0; i < l; i++) {
			var item = container.children[i];
			if (!(item.visible && concatAlpha)) { continue; }
			if (!item.cacheCanvas || ignoreCache) {
				if (item._updateState) {
					item._updateState();
				}
				if (item.children) {
					this._appendToBatchGroup(item, gl, cMtx, item.alpha * concatAlpha);
					continue;
				}
			}
			if (this.batchCardCount + 1 > this._maxCardsPerBatch) {
				this.batchReason = "vertexOverflow";
				this._drawBuffers(gl);
				this.batchCardCount = 0;
			}
			if (!item._glMtx) { item._glMtx = new createjs.Matrix2D(); }
			var iMtx = item._glMtx;
			iMtx.copy(cMtx);
			if (item.transformMatrix) {
				iMtx.appendMatrix(item.transformMatrix);
			} else {
				iMtx.appendTransform(
					item.x, item.y,
					item.scaleX, item.scaleY,
					item.rotation, item.skewX, item.skewY,
					item.regX, item.regY
				);
			}
			var uvRect, texIndex, image, frame, texture, src;
			var useCache = item.cacheCanvas && !ignoreCache;
			if (item._webGLRenderStyle === 2 || useCache) {
				image = (ignoreCache ? false : item.cacheCanvas) || item.image;
			} else if (item._webGLRenderStyle === 1) {
				frame = item.spriteSheet.getFrame(item.currentFrame);	//TODO: Faster way?
				if (frame === null) { continue; }
				image = frame.image;
			} else {
				continue;
			}
			var uvs = this._uvs;
			var vertices = this._vertices;
			var texI = this._indices;
			var alphas = this._alphas;
			if (!image) { continue; }
			if (image._storeID === undefined) {
				texture = this._loadTextureImage(gl, image);
				this._insertTextureInBatch(gl, texture);
			} else {
				texture = this._textureDictionary[image._storeID];
				if (!texture) {
					if (this.vocalDebug) { console.log("Texture should not be looked up while not being stored."); }
					continue;
				}
				if (texture._batchID !== this._batchID) {
					this._insertTextureInBatch(gl, texture);
				}
			}
			texIndex = texture._activeIndex;
			if (item._webGLRenderStyle === 2 || useCache) {
				if (!useCache && item.sourceRect) {
					if (!item._uvRect) { item._uvRect = {}; }
					src = item.sourceRect;
					uvRect = item._uvRect;
					uvRect.t = (src.y) / image.height;
					uvRect.l = (src.x) / image.width;
					uvRect.b = (src.y + src.height) / image.height;
					uvRect.r = (src.x + src.width) / image.width;
					subL = 0; subT = 0;
					subR = src.width + subL; subB = src.height + subT;
				} else {
					uvRect = StageGL.UV_RECT;
					if (useCache) {
						src = item.bitmapCache;
						subL = src.x + (src._filterOffX / src.scale); subT = src.y + (src._filterOffY / src.scale);
						subR = (src._drawWidth / src.scale) + subL; subB = (src._drawHeight / src.scale) + subT;
					} else {
						subL = 0; subT = 0;
						subR = image.width + subL; subB = image.height + subT;
					}
				}
			} else if (item._webGLRenderStyle === 1) {
				var rect = frame.rect;
				uvRect = frame.uvRect;
				if (!uvRect) {
					uvRect = StageGL.buildUVRects(item.spriteSheet, item.currentFrame, false);
				}
				subL = -frame.regX; subT = -frame.regY;
				subR = rect.width - frame.regX; subB = rect.height - frame.regY;
			}
			var offV1 = this.batchCardCount * StageGL.INDICIES_PER_CARD;
			var offV2 = offV1 * 2;
			//DHG: See Matrix2D.transformPoint for why this math specifically
			vertices[offV2] = subL * iMtx.a + subT * iMtx.c + iMtx.tx; vertices[offV2 + 1] = subL * iMtx.b + subT * iMtx.d + iMtx.ty;
			vertices[offV2 + 2] = subL * iMtx.a + subB * iMtx.c + iMtx.tx; vertices[offV2 + 3] = subL * iMtx.b + subB * iMtx.d + iMtx.ty;
			vertices[offV2 + 4] = subR * iMtx.a + subT * iMtx.c + iMtx.tx; vertices[offV2 + 5] = subR * iMtx.b + subT * iMtx.d + iMtx.ty;
			vertices[offV2 + 6] = vertices[offV2 + 2]; vertices[offV2 + 7] = vertices[offV2 + 3];
			vertices[offV2 + 8] = vertices[offV2 + 4]; vertices[offV2 + 9] = vertices[offV2 + 5];
			vertices[offV2 + 10] = subR * iMtx.a + subB * iMtx.c + iMtx.tx; vertices[offV2 + 11] = subR * iMtx.b + subB * iMtx.d + iMtx.ty;
			uvs[offV2] = uvRect.l; uvs[offV2 + 1] = uvRect.t;
			uvs[offV2 + 2] = uvRect.l; uvs[offV2 + 3] = uvRect.b;
			uvs[offV2 + 4] = uvRect.r; uvs[offV2 + 5] = uvRect.t;
			uvs[offV2 + 6] = uvRect.l; uvs[offV2 + 7] = uvRect.b;
			uvs[offV2 + 8] = uvRect.r; uvs[offV2 + 9] = uvRect.t;
			uvs[offV2 + 10] = uvRect.r; uvs[offV2 + 11] = uvRect.b;
			texI[offV1] = texI[offV1 + 1] = texI[offV1 + 2] = texI[offV1 + 3] = texI[offV1 + 4] = texI[offV1 + 5] = texIndex;
			alphas[offV1] = alphas[offV1 + 1] = alphas[offV1 + 2] = alphas[offV1 + 3] = alphas[offV1 + 4] = alphas[offV1 + 5] = item.alpha * concatAlpha;
			this.batchCardCount++;
		}
	};
	p._drawBuffers = function (gl) {
		if (this.batchCardCount <= 0) { return; }
		if (this.vocalDebug) {
			console.log("Draw[" + this._drawID + ":" + this._batchID + "] : " + this.batchReason);
		}
		var shaderProgram = this._activeShader;
		var vertexPositionBuffer = this._vertexPositionBuffer;
		var textureIndexBuffer = this._textureIndexBuffer;
		var uvPositionBuffer = this._uvPositionBuffer;
		var alphaBuffer = this._alphaBuffer;
		gl.useProgram(shaderProgram);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertices);
		gl.bindBuffer(gl.ARRAY_BUFFER, textureIndexBuffer);
		gl.vertexAttribPointer(shaderProgram.textureIndexAttribute, textureIndexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._indices);
		gl.bindBuffer(gl.ARRAY_BUFFER, uvPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.uvPositionAttribute, uvPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._uvs);
		gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer);
		gl.vertexAttribPointer(shaderProgram.alphaAttribute, alphaBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._alphas);
		gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, gl.FALSE, this._projectionMatrix);
		for (var i = 0; i < this._batchTextureCount; i++) {
			var texture = this._batchTextures[i];
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			this.setTextureParams(gl, texture.isPOT);
		}
		gl.drawArrays(gl.TRIANGLES, 0, this.batchCardCount * StageGL.INDICIES_PER_CARD);
		this._batchID++;
	};
	p._drawCover = function (gl, flipY) {
		if (this._isDrawing > 0) {
			this._drawBuffers(gl);
		}
		if (this.vocalDebug) {
			console.log("Draw[" + this._drawID + ":" + this._batchID + "] : " + "Cover");
		}
		var shaderProgram = this._activeShader;
		var vertexPositionBuffer = this._vertexPositionBuffer;
		var uvPositionBuffer = this._uvPositionBuffer;
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(shaderProgram);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, StageGL.COVER_VERT);
		gl.bindBuffer(gl.ARRAY_BUFFER, uvPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.uvPositionAttribute, uvPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, flipY ? StageGL.COVER_UV_FLIP : StageGL.COVER_UV);
		gl.uniform1i(shaderProgram.samplerUniform, 0);
		gl.uniform1f(shaderProgram.uprightUniform, flipY ? 0 : 1);
		gl.drawArrays(gl.TRIANGLES, 0, StageGL.INDICIES_PER_CARD);
	};
	createjs.StageGL = createjs.promote(StageGL, "Stage");
}());
//##############################################################################
//##############################################################################
(function () {
	function Bitmap(imageOrUri) {
		this.DisplayObject_constructor();
		if (typeof imageOrUri == "string") {
			this.image = document.createElement("img");
			this.image.src = imageOrUri;
		} else {
			this.image = imageOrUri;
		}
		this.sourceRect = null;
		this._webGLRenderStyle = createjs.DisplayObject._StageGL_BITMAP;
	}
	var p = createjs.extend(Bitmap, createjs.DisplayObject);
	p.initialize = Bitmap;
	p.isVisible = function () {
		var image = this.image;
		var hasContent = this.cacheCanvas || (image && (image.naturalWidth || image.getContext || image.readyState >= 2));
		return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0 && hasContent);
	};
	p.draw = function (ctx, ignoreCache) {
		if (this.DisplayObject_draw(ctx, ignoreCache)) { return true; }
		var img = this.image, rect = this.sourceRect;
		if (img.getImage) { img = img.getImage(); }
		if (!img) { return true; }
		if (rect) {
			var x1 = rect.x, y1 = rect.y, x2 = x1 + rect.width, y2 = y1 + rect.height, x = 0, y = 0, w = img.width, h = img.height;
			if (x1 < 0) { x -= x1; x1 = 0; }
			if (x2 > w) { x2 = w; }
			if (y1 < 0) { y -= y1; y1 = 0; }
			if (y2 > h) { y2 = h; }
			ctx.drawImage(img, x1, y1, x2 - x1, y2 - y1, x, y, x2 - x1, y2 - y1);
		} else {
			ctx.drawImage(img, 0, 0);
		}
		return true;
	};
	//Note, the doc sections below document using the specified APIs (from DisplayObject)  from
	//Bitmap. This is why they have no method implementations.
	p.getBounds = function () {
		var rect = this.DisplayObject_getBounds();
		if (rect) { return rect; }
		var image = this.image, o = this.sourceRect || image;
		var hasContent = (image && (image.naturalWidth || image.getContext || image.readyState >= 2));
		return hasContent ? this._rectangle.setValues(0, 0, o.width, o.height) : null;
	};
	p.clone = function (node) {
		var image = this.image;
		if (image && node) { image = image.cloneNode(); }
		var o = new Bitmap(image);
		if (this.sourceRect) { o.sourceRect = this.sourceRect.clone(); }
		this._cloneProps(o);
		return o;
	};
	p.toString = function () {
		return "[Bitmap (name=" + this.name + ")]";
	};
	createjs.Bitmap = createjs.promote(Bitmap, "DisplayObject");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Sprite(spriteSheet, frameOrAnimation) {
		this.DisplayObject_constructor();
		this.currentFrame = 0;
		this.currentAnimation = null;
		this.paused = true;
		this.spriteSheet = spriteSheet;
		this.currentAnimationFrame = 0;
		this.framerate = 0;
		this._animation = null;
		this._currentFrame = null;
		this._skipAdvance = false;
		this._webGLRenderStyle = createjs.DisplayObject._StageGL_SPRITE;
		if (frameOrAnimation != null) { this.gotoAndPlay(frameOrAnimation); }
	}
	var p = createjs.extend(Sprite, createjs.DisplayObject);
	p.initialize = Sprite;
	p.isVisible = function () {
		var hasContent = this.cacheCanvas || this.spriteSheet.complete;
		return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0 && hasContent);
	};
	p.draw = function (ctx, ignoreCache) {
		if (this.DisplayObject_draw(ctx, ignoreCache)) { return true; }
		this._normalizeFrame();
		var o = this.spriteSheet.getFrame(this._currentFrame | 0);
		if (!o) { return false; }
		var rect = o.rect;
		if (rect.width && rect.height) { ctx.drawImage(o.image, rect.x, rect.y, rect.width, rect.height, -o.regX, -o.regY, rect.width, rect.height); }
		return true;
	};
	//Note, the doc sections below document using the specified APIs (from DisplayObject)  from
	//Bitmap. This is why they have no method implementations.
	p.play = function () {
		this.paused = false;
	};
	p.stop = function () {
		this.paused = true;
	};
	p.gotoAndPlay = function (frameOrAnimation) {
		this.paused = false;
		this._skipAdvance = true;
		this._goto(frameOrAnimation);
	};
	p.gotoAndStop = function (frameOrAnimation) {
		this.paused = true;
		this._goto(frameOrAnimation);
	};
	p.advance = function (time) {
		var fps = this.framerate || this.spriteSheet.framerate;
		var t = (fps && time != null) ? time / (1000 / fps) : 1;
		this._normalizeFrame(t);
	};
	p.getBounds = function () {
		return this.DisplayObject_getBounds() || this.spriteSheet.getFrameBounds(this.currentFrame, this._rectangle);
	};
	p.clone = function () {
		return this._cloneProps(new Sprite(this.spriteSheet));
	};
	p.toString = function () {
		return "[Sprite (name=" + this.name + ")]";
	};
	p._cloneProps = function (o) {
		this.DisplayObject__cloneProps(o);
		o.currentFrame = this.currentFrame;
		o.currentAnimation = this.currentAnimation;
		o.paused = this.paused;
		o.currentAnimationFrame = this.currentAnimationFrame;
		o.framerate = this.framerate;
		o._animation = this._animation;
		o._currentFrame = this._currentFrame;
		o._skipAdvance = this._skipAdvance;
		return o;
	};
	p._tick = function (evtObj) {
		if (!this.paused) {
			if (!this._skipAdvance) { this.advance(evtObj && evtObj.delta); }
			this._skipAdvance = false;
		}
		this.DisplayObject__tick(evtObj);
	};
	p._normalizeFrame = function (frameDelta) {
		frameDelta = frameDelta || 0;
		var animation = this._animation;
		var paused = this.paused;
		var frame = this._currentFrame;
		var l;
		if (animation) {
			var speed = animation.speed || 1;
			var animFrame = this.currentAnimationFrame;
			l = animation.frames.length;
			if (animFrame + frameDelta * speed >= l) {
				var next = animation.next;
				if (this._dispatchAnimationEnd(animation, frame, paused, next, l - 1)) {
					return;
				} else if (next) {
					return this._goto(next, frameDelta - (l - animFrame) / speed);
				} else {
					this.paused = true;
					animFrame = animation.frames.length - 1;
				}
			} else {
				animFrame += frameDelta * speed;
			}
			this.currentAnimationFrame = animFrame;
			this._currentFrame = animation.frames[animFrame | 0]
		} else {
			frame = (this._currentFrame += frameDelta);
			l = this.spriteSheet.getNumFrames();
			if (frame >= l && l > 0) {
				if (!this._dispatchAnimationEnd(animation, frame, paused, l - 1)) {
					if ((this._currentFrame -= l) >= l) { return this._normalizeFrame(); }
				}
			}
		}
		frame = this._currentFrame | 0;
		if (this.currentFrame != frame) {
			this.currentFrame = frame;
			this.dispatchEvent("change");
		}
	};
	p._dispatchAnimationEnd = function (animation, frame, paused, next, end) {
		var name = animation ? animation.name : null;
		if (this.hasEventListener("animationend")) {
			var evt = new createjs.Event("animationend");
			evt.name = name;
			evt.next = next;
			this.dispatchEvent(evt);
		}
		var changed = (this._animation != animation || this._currentFrame != frame);
		if (!changed && !paused && this.paused) { this.currentAnimationFrame = end; changed = true; }
		return changed;
	};
	p._goto = function (frameOrAnimation, frame) {
		this.currentAnimationFrame = 0;
		if (isNaN(frameOrAnimation)) {
			var data = this.spriteSheet.getAnimation(frameOrAnimation);
			if (data) {
				this._animation = data;
				this.currentAnimation = frameOrAnimation;
				this._normalizeFrame(frame);
			}
		} else {
			this.currentAnimation = this._animation = null;
			this._currentFrame = frameOrAnimation;
			this._normalizeFrame();
		}
	};
	createjs.Sprite = createjs.promote(Sprite, "DisplayObject");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Shape(graphics) {
		this.DisplayObject_constructor();
		this.graphics = graphics ? graphics : new createjs.Graphics();
	}
	var p = createjs.extend(Shape, createjs.DisplayObject);
	p.isVisible = function () {
		var hasContent = this.cacheCanvas || (this.graphics && !this.graphics.isEmpty());
		return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0 && hasContent);
	};
	p.draw = function (ctx, ignoreCache) {
		if (this.DisplayObject_draw(ctx, ignoreCache)) { return true; }
		this.graphics.draw(ctx, this);
		return true;
	};
	p.clone = function (recursive) {
		var g = (recursive && this.graphics) ? this.graphics.clone() : this.graphics;
		return this._cloneProps(new Shape(g));
	};
	p.toString = function () {
		return "[Shape (name=" + this.name + ")]";
	};
	createjs.Shape = createjs.promote(Shape, "DisplayObject");
}());
//##############################################################################
//##############################################################################
(function() {
	"use strict";


// constructor:
	/**
	 * Display one or more lines of dynamic text (not user editable) in the display list. Line wrapping support (using the
	 * lineWidth) is very basic, wrapping on spaces and tabs only. Note that as an alternative to Text, you can position HTML
	 * text above or below the canvas relative to items in the display list using the {{#crossLink "DisplayObject/localToGlobal"}}{{/crossLink}}
	 * method, or using {{#crossLink "DOMElement"}}{{/crossLink}}.
	 *
	 * <b>Please note that Text does not support HTML text, and can only display one font style at a time.</b> To use
	 * multiple font styles, you will need to create multiple text instances, and position them manually.
	 *
	 * <h4>Example</h4>
	 *
	 *      var text = new createjs.Text("Hello World", "20px Arial", "#ff7700");
	 *      text.x = 100;
	 *      text.textBaseline = "alphabetic";
	 *
	 * CreateJS Text supports web fonts (the same rules as Canvas). The font must be loaded and supported by the browser
	 * before it can be displayed.
	 *
	 * <strong>Note:</strong> Text can be expensive to generate, so cache instances where possible. Be aware that not all
	 * browsers will render Text exactly the same.
	 * @class Text
	 * @extends DisplayObject
	 * @constructor
	 * @param {String} [text] The text to display.
	 * @param {String} [font] The font style to use. Any valid value for the CSS font attribute is acceptable (ex. "bold
	 * 36px Arial").
	 * @param {String} [color] The color to draw the text in. Any valid value for the CSS color attribute is acceptable (ex.
	 * "#F00", "red", or "#FF0000").
	 **/
	function Text(text, font, color) {
		this.DisplayObject_constructor();
		
		
	// public properties:
		/**
		 * The text to display.
		 * @property text
		 * @type String
		 **/
		this.text = text;
	
		/**
		 * The font style to use. Any valid value for the CSS font attribute is acceptable (ex. "bold 36px Arial").
		 * @property font
		 * @type String
		 **/
		this.font = font;
	
		/**
		 * The color to draw the text in. Any valid value for the CSS color attribute is acceptable (ex. "#F00"). Default is "#000".
		 * It will also accept valid canvas fillStyle values.
		 * @property color
		 * @type String
		 **/
		this.color = color;
	
		/**
		 * The horizontal text alignment. Any of "start", "end", "left", "right", and "center". For detailed
		 * information view the
		 * <a href="http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#text-styles">
		 * whatwg spec</a>. Default is "left".
		 * @property textAlign
		 * @type String
		 **/
		this.textAlign = "left";
	
		/**
		 * The vertical alignment point on the font. Any of "top", "hanging", "middle", "alphabetic", "ideographic", or
		 * "bottom". For detailed information view the <a href="http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#text-styles">
		 * whatwg spec</a>. Default is "top".
		 * @property textBaseline
		 * @type String
		*/
		this.textBaseline = "top";
	
		/**
		 * The maximum width to draw the text. If maxWidth is specified (not null), the text will be condensed or
		 * shrunk to make it fit in this width. For detailed information view the
		 * <a href="http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#text-styles">
		 * whatwg spec</a>.
		 * @property maxWidth
		 * @type Number
		*/
		this.maxWidth = null;
	
		/**
		 * If greater than 0, the text will be drawn as a stroke (outline) of the specified width.
		 * @property outline
		 * @type Number
		 **/
		this.outline = 0;
	
		/**
		 * Indicates the line height (vertical distance between baselines) for multi-line text. If null or 0,
		 * the value of getMeasuredLineHeight is used.
		 * @property lineHeight
		 * @type Number
		 **/
		this.lineHeight = 0;
	
		/**
		 * Indicates the maximum width for a line of text before it is wrapped to multiple lines. If null,
		 * the text will not be wrapped.
		 * @property lineWidth
		 * @type Number
		 **/
		this.lineWidth = null;
	}
	var p = createjs.extend(Text, createjs.DisplayObject);

	// TODO: deprecated
	// p.initialize = function() {}; // searchable for devs wondering where it is. REMOVED. See docs for details.

	
// static properties:
	/**
	 * @property _workingContext
	 * @type CanvasRenderingContext2D
	 * @private
	 **/
	var canvas = (createjs.createCanvas?createjs.createCanvas():document.createElement("canvas"));
	if (canvas.getContext) { Text._workingContext = canvas.getContext("2d"); canvas.width = canvas.height = 1; }
	
	
// constants:
	/**
	 * Lookup table for the ratio to offset bounds x calculations based on the textAlign property.
	 * @property H_OFFSETS
	 * @type Object
	 * @protected
	 * @static
	 **/
	Text.H_OFFSETS = {start: 0, left: 0, center: -0.5, end: -1, right: -1};
	
	/**
	 * Lookup table for the ratio to offset bounds y calculations based on the textBaseline property.
	 * @property H_OFFSETS
	 * @type Object
	 * @protected
	 * @static
	 **/
	Text.V_OFFSETS = {top: 0, hanging: -0.01, middle: -0.4, alphabetic: -0.8, ideographic: -0.85, bottom: -1};


// public methods:
	/**
	 * Returns true or false indicating whether the display object would be visible if drawn to a canvas.
	 * This does not account for whether it would be visible within the boundaries of the stage.
	 * NOTE: This method is mainly for internal use, though it may be useful for advanced uses.
	 * @method isVisible
	 * @return {Boolean} Whether the display object would be visible if drawn to a canvas
	 **/
	p.isVisible = function() {
		var hasContent = this.cacheCanvas || (this.text != null && this.text !== "");
		return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0 && hasContent);
	};

	/**
	 * Draws the Text into the specified context ignoring its visible, alpha, shadow, and transform.
	 * Returns true if the draw was handled (useful for overriding functionality).
	 * NOTE: This method is mainly for internal use, though it may be useful for advanced uses.
	 * @method draw
	 * @param {CanvasRenderingContext2D} ctx The canvas 2D context object to draw into.
	 * @param {Boolean} ignoreCache Indicates whether the draw operation should ignore any current cache.
	 * For example, used for drawing the cache (to prevent it from simply drawing an existing cache back
	 * into itself).
	 **/
	p.draw = function(ctx, ignoreCache) {
		if (this.DisplayObject_draw(ctx, ignoreCache)) { return true; }

		var col = this.color || "#000";
		if (this.outline) { ctx.strokeStyle = col; ctx.lineWidth = this.outline*1; }
		else { ctx.fillStyle = col; }
		
		this._drawText(this._prepContext(ctx));
		return true;
	};

	/**
	 * Returns the measured, untransformed width of the text without wrapping. Use getBounds for a more robust value.
	 * @method getMeasuredWidth
	 * @return {Number} The measured, untransformed width of the text.
	 **/
	p.getMeasuredWidth = function() {
		return this._getMeasuredWidth(this.text);
	};

	/**
	 * Returns an approximate line height of the text, ignoring the lineHeight property. This is based on the measured
	 * width of a "M" character multiplied by 1.2, which provides an approximate line height for most fonts.
	 * @method getMeasuredLineHeight
	 * @return {Number} an approximate line height of the text, ignoring the lineHeight property. This is
	 * based on the measured width of a "M" character multiplied by 1.2, which approximates em for most fonts.
	 **/
	p.getMeasuredLineHeight = function() {
		return this._getMeasuredWidth("M")*1.2;
	};

	/**
	 * Returns the approximate height of multi-line text by multiplying the number of lines against either the
	 * <code>lineHeight</code> (if specified) or {{#crossLink "Text/getMeasuredLineHeight"}}{{/crossLink}}. Note that
	 * this operation requires the text flowing logic to run, which has an associated CPU cost.
	 * @method getMeasuredHeight
	 * @return {Number} The approximate height of the untransformed multi-line text.
	 **/
	p.getMeasuredHeight = function() {
		return this._drawText(null,{}).height;
	};

	/**
	 * Docced in superclass.
	 */
	p.getBounds = function() {
		var rect = this.DisplayObject_getBounds();
		if (rect) { return rect; }
		if (this.text == null || this.text === "") { return null; }
		var o = this._drawText(null, {});
		var w = (this.maxWidth && this.maxWidth < o.width) ? this.maxWidth : o.width;
		var x = w * Text.H_OFFSETS[this.textAlign||"left"];
		var lineHeight = this.lineHeight||this.getMeasuredLineHeight();
		var y = lineHeight * Text.V_OFFSETS[this.textBaseline||"top"];
		return this._rectangle.setValues(x, y, w, o.height);
	};
	
	/**
	 * Returns an object with width, height, and lines properties. The width and height are the visual width and height
	 * of the drawn text. The lines property contains an array of strings, one for
	 * each line of text that will be drawn, accounting for line breaks and wrapping. These strings have trailing
	 * whitespace removed.
	 * @method getMetrics
	 * @return {Object} An object with width, height, and lines properties.
	 **/
	p.getMetrics = function() {
		var o = {lines:[]};
		o.lineHeight = this.lineHeight || this.getMeasuredLineHeight();
		o.vOffset = o.lineHeight * Text.V_OFFSETS[this.textBaseline||"top"];
		return this._drawText(null, o, o.lines);
	};

	/**
	 * Returns a clone of the Text instance.
	 * @method clone
	 * @return {Text} a clone of the Text instance.
	 **/
	p.clone = function() {
		return this._cloneProps(new Text(this.text, this.font, this.color));
	};

	/**
	 * Returns a string representation of this object.
	 * @method toString
	 * @return {String} a string representation of the instance.
	 **/
	p.toString = function() {
		return "[Text (text="+  (this.text.length > 20 ? this.text.substr(0, 17)+"..." : this.text) +")]";
	};


// private methods:
	/**
	 * @method _cloneProps
	 * @param {Text} o
	 * @protected
	 * @return {Text} o
	 **/
	p._cloneProps = function(o) {
		this.DisplayObject__cloneProps(o);
		o.textAlign = this.textAlign;
		o.textBaseline = this.textBaseline;
		o.maxWidth = this.maxWidth;
		o.outline = this.outline;
		o.lineHeight = this.lineHeight;
		o.lineWidth = this.lineWidth;
		return o;
	};

	/**
	 * @method _getWorkingContext
	 * @param {CanvasRenderingContext2D} ctx
	 * @return {CanvasRenderingContext2D}
	 * @protected
	 **/
	p._prepContext = function(ctx) {
		ctx.font = this.font||"10px sans-serif";
		ctx.textAlign = this.textAlign||"left";
		ctx.textBaseline = this.textBaseline||"top";
		ctx.lineJoin = "miter";
		ctx.miterLimit = 2.5;
		return ctx;
	};

	/**
	 * Draws multiline text.
	 * @method _drawText
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Object} o
	 * @param {Array} lines
	 * @return {Object}
	 * @protected
	 **/
	p._drawText = function(ctx, o, lines) {
		var paint = !!ctx;
		if (!paint) {
			ctx = Text._workingContext;
			ctx.save();
			this._prepContext(ctx);
		}
		var lineHeight = this.lineHeight||this.getMeasuredLineHeight();
		
		var maxW = 0, count = 0;
		var hardLines = String(this.text).split(/(?:\r\n|\r|\n)/);
		for (var i=0, l=hardLines.length; i<l; i++) {
			var str = hardLines[i];
			var w = null;
			
			if (this.lineWidth != null && (w = ctx.measureText(str).width) > this.lineWidth) {
				// text wrapping:
				var words = str.split(/(\s)/);
				str = words[0];
				w = ctx.measureText(str).width;
				
				for (var j=1, jl=words.length; j<jl; j+=2) {
					// Line needs to wrap:
					var wordW = ctx.measureText(words[j] + words[j+1]).width;
					if (w + wordW > this.lineWidth) {
						if (paint) { this._drawTextLine(ctx, str, count*lineHeight); }
						if (lines) { lines.push(str); }
						if (w > maxW) { maxW = w; }
						str = words[j+1];
						w = ctx.measureText(str).width;
						count++;
					} else {
						str += words[j] + words[j+1];
						w += wordW;
					}
				}
			}
			
			if (paint) { this._drawTextLine(ctx, str, count*lineHeight); }
			if (lines) { lines.push(str); }
			if (o && w == null) { w = ctx.measureText(str).width; }
			if (w > maxW) { maxW = w; }
			count++;
		}
		
		if (o) {
			o.width = maxW;
			o.height = count*lineHeight;
		}
		if (!paint) { ctx.restore(); }
		return o;
	};

	/**
	 * @method _drawTextLine
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {String} text
	 * @param {Number} y
	 * @protected
	 **/
	p._drawTextLine = function(ctx, text, y) {
		// Chrome 17 will fail to draw the text if the last param is included but null, so we feed it a large value instead:
		if (this.outline) { ctx.strokeText(text, 0, y, this.maxWidth||0xFFFF); }
		else { ctx.fillText(text, 0, y, this.maxWidth||0xFFFF); }
	};
	
	
	/**
	 * @method _getMeasuredWidth
	 * @param {String} text
	 * @protected
	 **/
	p._getMeasuredWidth = function(text) {
		var ctx = Text._workingContext;
		ctx.save();
		var w = this._prepContext(ctx).measureText(text).width;
		ctx.restore();
		return w;
	};


	createjs.Text = createjs.promote(Text, "DisplayObject");
}());

//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function BitmapText(text, spriteSheet) {
		this.Container_constructor();
		this.text = text || "";
		this.spriteSheet = spriteSheet;
		this.lineHeight = 0;
		this.letterSpacing = 0;
		this.spaceWidth = 0;
		this._oldProps = { text: 0, spriteSheet: 0, lineHeight: 0, letterSpacing: 0, spaceWidth: 0 };
		this._oldStage = null;
		this._drawAction = null;
	}
	var p = createjs.extend(BitmapText, createjs.Container);
	BitmapText.maxPoolSize = 100;
	BitmapText._spritePool = [];
	p.draw = function (ctx, ignoreCache) {
		if (this.DisplayObject_draw(ctx, ignoreCache)) { return; }
		this._updateState();
		this.Container_draw(ctx, ignoreCache);
	};
	p.getBounds = function () {
		this._updateText();
		return this.Container_getBounds();
	};
	p.isVisible = function () {
		var hasContent = this.cacheCanvas || (this.spriteSheet && this.spriteSheet.complete && this.text);
		return !!(this.visible && this.alpha > 0 && this.scaleX !== 0 && this.scaleY !== 0 && hasContent);
	};
	p.clone = function () {
		return this._cloneProps(new BitmapText(this.text, this.spriteSheet));
	};
	p.addChild = p.addChildAt = p.removeChild = p.removeChildAt = p.removeAllChildren = function () { };
	p._updateState = function () {
		this._updateText();
	};
	p._cloneProps = function (o) {
		this.Container__cloneProps(o);
		o.lineHeight = this.lineHeight;
		o.letterSpacing = this.letterSpacing;
		o.spaceWidth = this.spaceWidth;
		return o;
	};
	p._getFrameIndex = function (character, spriteSheet) {
		var c, o = spriteSheet.getAnimation(character);
		if (!o) {
			(character != (c = character.toUpperCase())) || (character != (c = character.toLowerCase())) || (c = null);
			if (c) { o = spriteSheet.getAnimation(c); }
		}
		return o && o.frames[0];
	};
	p._getFrame = function (character, spriteSheet) {
		var index = this._getFrameIndex(character, spriteSheet);
		return index == null ? index : spriteSheet.getFrame(index);
	};
	p._getLineHeight = function (ss) {
		var frame = this._getFrame("1", ss) || this._getFrame("T", ss) || this._getFrame("L", ss) || ss.getFrame(0);
		return frame ? frame.rect.height : 1;
	};
	p._getSpaceWidth = function (ss) {
		var frame = this._getFrame("1", ss) || this._getFrame("l", ss) || this._getFrame("e", ss) || this._getFrame("a", ss) || ss.getFrame(0);
		return frame ? frame.rect.width : 1;
	};
	p._updateText = function () {
		var x = 0, y = 0, o = this._oldProps, change = false, spaceW = this.spaceWidth, lineH = this.lineHeight, ss = this.spriteSheet;
		var pool = BitmapText._spritePool, kids = this.children, childIndex = 0, numKids = kids.length, sprite;
		var text_width = 0;
		for (var n in o) {
			if (o[n] != this[n]) {
				o[n] = this[n];
				change = true;
			}
		}
		if (!change) { return; }
		var hasSpace = !!this._getFrame(" ", ss);
		if (!hasSpace && !spaceW) { spaceW = this._getSpaceWidth(ss); }
		if (!lineH) { lineH = this._getLineHeight(ss); }
		for (var i = 0, l = this.text.length; i < l; i++) {
			var character = this.text.charAt(i);
			if (character == " " && !hasSpace) {
				x += spaceW;
				continue;
			} else if (character == "\n" || character == "\r") {
				if (character == "\r" && this.text.charAt(i + 1) == "\n") { i++; }
				x = 0;
				y += lineH;
				continue;
			}
			var index = this._getFrameIndex(character, ss);
			if (index == null) { continue; }
			if (childIndex < numKids) {
				sprite = kids[childIndex];
			} else {
				kids.push(sprite = pool.length ? pool.pop() : new createjs.Sprite());
				sprite.parent = this;
				numKids++;
			}
			sprite.spriteSheet = ss;
			sprite.gotoAndStop(index);
			sprite.x = x;
			sprite.y = y;
			childIndex++;

			x += sprite.getBounds().width + this.letterSpacing;

		}
		kids.forEach(function (el) {
			el.x -= x / 2;
		})
		while (numKids > childIndex) {
			pool.push(sprite = kids.pop());
			sprite.parent = null;
			numKids--;
		}
		if (pool.length > BitmapText.maxPoolSize) { pool.length = BitmapText.maxPoolSize; }
	};
	createjs.BitmapText = createjs.promote(BitmapText, "Container");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function MovieClip(props) {
		this.Container_constructor();
		!MovieClip.inited && MovieClip.init();
		var mode, startPosition, loop, labels;
		if (props instanceof String || arguments.length > 1) {
			mode = props;
			startPosition = arguments[1];
			loop = arguments[2];
			labels = arguments[3];
			if (loop == null) { loop = -1; }
			props = null;
		} else if (props) {
			mode = props.mode;
			startPosition = props.startPosition;
			loop = props.loop;
			labels = props.labels;
		}
		if (!props) { props = { labels: labels }; }
		this.mode = mode || MovieClip.INDEPENDENT;
		this.startPosition = startPosition || 0;
		this.loop = loop === true ? -1 : (loop || 0);
		this.currentFrame = 0;
		this.paused = props.paused || false;
		this.actionsEnabled = true;
		this.autoReset = true;
		this.frameBounds = this.frameBounds || props.frameBounds;
		this.framerate = null;
		props.useTicks = props.paused = true;
		this.timeline = new createjs.Timeline(props);
		this._synchOffset = 0;
		this._rawPosition = -1;
		this._bound_resolveState = this._resolveState.bind(this);
		this._t = 0;
		this._managed = {};
	}
	var p = createjs.extend(MovieClip, createjs.Container);
	MovieClip.INDEPENDENT = "independent";
	MovieClip.SINGLE_FRAME = "single";
	MovieClip.SYNCHED = "synched";
	MovieClip.inited = false;
	MovieClip.init = function () {
		if (MovieClip.inited) { return; }
		MovieClipPlugin.install();
		MovieClip.inited = true;
	};
	p._getLabels = function () {
		return this.timeline.getLabels();
	};
	p.getLabels = createjs.deprecate(p._getLabels, "MovieClip.getLabels");
	p._getCurrentLabel = function () {
		return this.timeline.currentLabel;
	};
	p.getCurrentLabel = createjs.deprecate(p._getCurrentLabel, "MovieClip.getCurrentLabel");
	p._getDuration = function () {
		return this.timeline.duration;
	};
	p.getDuration = createjs.deprecate(p._getDuration, "MovieClip.getDuration");
	try {
		Object.defineProperties(p, {
			labels: { get: p._getLabels },
			currentLabel: { get: p._getCurrentLabel },
			totalFrames: { get: p._getDuration },
			duration: { get: p._getDuration }
		});
	} catch (e) { }
	p.initialize = MovieClip;
	p.isVisible = function () {
		return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0);
	};
	p.draw = function (ctx, ignoreCache) {
		if (this.DisplayObject_draw(ctx, ignoreCache)) { return true; }
		this._updateState();
		this.Container_draw(ctx, ignoreCache);
		return true;
	};
	p.play = function () {
		this.paused = false;
	};
	p.stop = function () {
		this.paused = true;
	};
	p.gotoAndPlay = function (positionOrLabel) {
		this.paused = false;
		this._goto(positionOrLabel);
	};
	p.gotoAndStop = function (positionOrLabel) {
		this.paused = true;
		this._goto(positionOrLabel);
	};
	p.advance = function (time) {
		var independent = MovieClip.INDEPENDENT;
		if (this.mode !== independent) { return; }
		var o = this, fps = o.framerate;
		while ((o = o.parent) && fps === null) { if (o.mode === independent) { fps = o._framerate; } }
		this._framerate = fps;
		if (this.paused) { return; }

		var t = (fps !== null && fps !== -1 && time !== null) ? time / (1000 / fps) + this._t : 1;
		var frames = t | 0;
		this._t = t - frames;
		while (frames--) { this._updateTimeline(this._rawPosition + 1, false); }
	};
	p.clone = function () {
		throw ("MovieClip cannot be cloned.");
	};
	p.toString = function () {
		return "[MovieClip (name=" + this.name + ")]";
	};
	p._updateState = function () {
		if (this._rawPosition === -1 || this.mode !== MovieClip.INDEPENDENT) { this._updateTimeline(-1); }
	};
	p._tick = function (evtObj) {
		this.advance(evtObj && evtObj.delta);
		this.Container__tick(evtObj);
	};
	p._goto = function (positionOrLabel) {
		var pos = this.timeline.resolve(positionOrLabel);
		if (pos == null) { return; }
		this._t = 0;
		this._updateTimeline(pos, true);
	};
	p._reset = function () {
		this._rawPosition = -1;
		this._t = this.currentFrame = 0;
		this.paused = false;
	};
	p._updateTimeline = function (rawPosition, jump) {

		var synced = this.mode !== MovieClip.INDEPENDENT, tl = this.timeline;
		if (synced) { rawPosition = this.startPosition + (this.mode === MovieClip.SINGLE_FRAME ? 0 : this._synchOffset); }
		if (rawPosition < 0) { rawPosition = 0; }
		if (this._rawPosition === rawPosition && !synced) { return; }
		this._rawPosition = rawPosition;
		tl.loop = this.loop;
		tl.setPosition(rawPosition, synced || !this.actionsEnabled, jump, this._bound_resolveState);

	};
	p._renderFirstFrame = function () {
		var tl = this.timeline, pos = tl.rawPosition;
		tl.setPosition(0, true, true, this._bound_resolveState);
		tl.rawPosition = pos;
	};
	p._resolveState = function () {
		var tl = this.timeline;
		this.currentFrame = tl.position;
		for (var n in this._managed) { this._managed[n] = 1; }
		var tweens = tl.tweens;
		for (var i = 0, l = tweens.length; i < l; i++) {
			var tween = tweens[i], target = tween.target;
			if (target === this || tween.passive) { continue; }
			var offset = tween._stepPosition;
			if (target instanceof createjs.DisplayObject) {
				this._addManagedChild(target, offset);
			} else {
				this._setState(target.state, offset);
			}
		}
		var kids = this.children;
		for (i = kids.length - 1; i >= 0; i--) {
			var id = kids[i].id;
			if (this._managed[id] === 1) {
				this.removeChildAt(i);
				delete (this._managed[id]);
			}
		}
	};
	p._setState = function (state, offset) {
		if (!state) { return; }
		for (var i = state.length - 1; i >= 0; i--) {
			var o = state[i];
			var target = o.t;
			var props = o.p;
			for (var n in props) { target[n] = props[n]; }
			this._addManagedChild(target, offset);
		}
	};
	p._addManagedChild = function (child, offset) {
		if (child._off) { return; }
		this.addChildAt(child, 0);
		if (child instanceof MovieClip) {
			child._synchOffset = offset;
			if (child.mode === MovieClip.INDEPENDENT && child.autoReset && (!this._managed[child.id])) { child._reset(); }
		}
		this._managed[child.id] = 2;
	};
	p._getBounds = function (matrix, ignoreTransform) {
		var bounds = this.DisplayObject_getBounds();
		if (!bounds) {
			if (this.frameBounds) { bounds = this._rectangle.copy(this.frameBounds[this.currentFrame]); }
		}
		if (bounds) { return this._transformBounds(bounds, matrix, ignoreTransform); }
		return this.Container__getBounds(matrix, ignoreTransform);
	};
	createjs.MovieClip = createjs.promote(MovieClip, "Container");
	function MovieClipPlugin() {
		throw ("MovieClipPlugin cannot be instantiated.")
	}
	MovieClipPlugin.priority = 100;
	MovieClipPlugin.ID = "MovieClip";
	MovieClipPlugin.install = function () {
		createjs.Tween._installPlugin(MovieClipPlugin);
	};
	MovieClipPlugin.init = function (tween, prop, value) {
		if (prop === "startPosition" && tween.target instanceof MovieClip) { tween._addPlugin(MovieClipPlugin); }
	};
	MovieClipPlugin.step = function (tween, step, props) { };
	MovieClipPlugin.change = function (tween, step, prop, value, ratio, end) {
		if (prop === "startPosition") { return (ratio === 1 ? step.props[prop] : step.prev.props[prop]); }
	};
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function SpriteSheetUtils() {
		throw "SpriteSheetUtils cannot be instantiated";
	}
	var canvas = (createjs.createCanvas ? createjs.createCanvas() : document.createElement("canvas"));
	if (canvas.getContext) {
		SpriteSheetUtils._workingCanvas = canvas;
		SpriteSheetUtils._workingContext = canvas.getContext("2d");
		canvas.width = canvas.height = 1;
	}
	SpriteSheetUtils.extractFrame = function (spriteSheet, frameOrAnimation) {
		if (isNaN(frameOrAnimation)) {
			frameOrAnimation = spriteSheet.getAnimation(frameOrAnimation).frames[0];
		}
		var data = spriteSheet.getFrame(frameOrAnimation);
		if (!data) { return null; }
		var r = data.rect;
		var canvas = SpriteSheetUtils._workingCanvas;
		canvas.width = r.width;
		canvas.height = r.height;
		SpriteSheetUtils._workingContext.drawImage(data.image, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
		var img = document.createElement("img");
		img.src = canvas.toDataURL("image/png");
		return img;
	};
	SpriteSheetUtils.addFlippedFrames = createjs.deprecate(null, "SpriteSheetUtils.addFlippedFrames");
	SpriteSheetUtils.mergeAlpha = createjs.deprecate(null, "SpriteSheetUtils.mergeAlpha");
	SpriteSheetUtils._flip = function (spriteSheet, count, h, v) {
		var imgs = spriteSheet._images;
		var canvas = SpriteSheetUtils._workingCanvas;
		var ctx = SpriteSheetUtils._workingContext;
		var il = imgs.length / count;
		for (var i = 0; i < il; i++) {
			var src = imgs[i];
			src.__tmp = i;
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width + 1, canvas.height + 1);
			canvas.width = src.width;
			canvas.height = src.height;
			ctx.setTransform(h ? -1 : 1, 0, 0, v ? -1 : 1, h ? src.width : 0, v ? src.height : 0);
			ctx.drawImage(src, 0, 0);
			var img = document.createElement("img");
			img.src = canvas.toDataURL("image/png");
			img.width = (src.width || src.naturalWidth);
			img.height = (src.height || src.naturalHeight);
			imgs.push(img);
		}
		var frames = spriteSheet._frames;
		var fl = frames.length / count;
		for (i = 0; i < fl; i++) {
			src = frames[i];
			var rect = src.rect.clone();
			img = imgs[src.image.__tmp + il * count];
			var frame = { image: img, rect: rect, regX: src.regX, regY: src.regY };
			if (h) {
				rect.x = (img.width || img.naturalWidth) - rect.x - rect.width;
				frame.regX = rect.width - src.regX;
			}
			if (v) {
				rect.y = (img.height || img.naturalHeight) - rect.y - rect.height;
				frame.regY = rect.height - src.regY;
			}
			frames.push(frame);
		}
		var sfx = "_" + (h ? "h" : "") + (v ? "v" : "");
		var names = spriteSheet._animations;
		var data = spriteSheet._data;
		var al = names.length / count;
		for (i = 0; i < al; i++) {
			var name = names[i];
			src = data[name];
			var anim = { name: name + sfx, speed: src.speed, next: src.next, frames: [] };
			if (src.next) { anim.next += sfx; }
			frames = src.frames;
			for (var j = 0, l = frames.length; j < l; j++) {
				anim.frames.push(frames[j] + fl * count);
			}
			data[anim.name] = anim;
			names.push(anim.name);
		}
	};
	createjs.SpriteSheetUtils = SpriteSheetUtils;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function SpriteSheetBuilder(framerate) {
		this.EventDispatcher_constructor();
		this.maxWidth = 2048;
		this.maxHeight = 2048;
		this.spriteSheet = null;
		this.scale = 1;
		this.padding = 1;
		this.timeSlice = 0.3;
		this.progress = -1;
		this.framerate = framerate || 0;
		this._frames = [];
		this._animations = {};
		this._data = null;
		this._nextFrameIndex = 0;
		this._index = 0;
		this._timerID = null;
		this._scale = 1;
	}
	var p = createjs.extend(SpriteSheetBuilder, createjs.EventDispatcher);
	SpriteSheetBuilder.ERR_DIMENSIONS = "frame dimensions exceed max spritesheet dimensions";
	SpriteSheetBuilder.ERR_RUNNING = "a build is already running";
	p.addFrame = function (source, sourceRect, scale, setupFunction, setupData) {
		if (this._data) { throw SpriteSheetBuilder.ERR_RUNNING; }
		var rect = sourceRect || source.bounds || source.nominalBounds;
		if (!rect && source.getBounds) { rect = source.getBounds(); }
		if (!rect) { return null; }
		scale = scale || 1;
		return this._frames.push({ source: source, sourceRect: rect, scale: scale, funct: setupFunction, data: setupData, index: this._frames.length, height: rect.height * scale }) - 1;
	};
	p.addAnimation = function (name, frames, next, speed) {
		if (this._data) { throw SpriteSheetBuilder.ERR_RUNNING; }
		this._animations[name] = { frames: frames, next: next, speed: speed };
	};
	p.addMovieClip = function (source, sourceRect, scale, setupFunction, setupData, labelFunction) {
		if (this._data) { throw SpriteSheetBuilder.ERR_RUNNING; }
		var rects = source.frameBounds;
		var rect = sourceRect || source.bounds || source.nominalBounds;
		if (!rect && source.getBounds) { rect = source.getBounds(); }
		if (!rect && !rects) { return; }
		var i, l, baseFrameIndex = this._frames.length;
		var duration = source.timeline.duration;
		for (i = 0; i < duration; i++) {
			var r = (rects && rects[i]) ? rects[i] : rect;
			this.addFrame(source, r, scale, this._setupMovieClipFrame, { i: i, f: setupFunction, d: setupData });
		}
		var labels = source.timeline._labels;
		var lbls = [];
		for (var n in labels) {
			lbls.push({ index: labels[n], label: n });
		}
		if (lbls.length) {
			lbls.sort(function (a, b) { return a.index - b.index; });
			for (i = 0, l = lbls.length; i < l; i++) {
				var label = lbls[i].label;
				var start = baseFrameIndex + lbls[i].index;
				var end = baseFrameIndex + ((i == l - 1) ? duration : lbls[i + 1].index);
				var frames = [];
				for (var j = start; j < end; j++) { frames.push(j); }
				if (labelFunction) {
					label = labelFunction(label, source, start, end);
					if (!label) { continue; }
				}
				this.addAnimation(label, frames, true);
			}
		}
	};
	p.build = function () {
		if (this._data) { throw SpriteSheetBuilder.ERR_RUNNING; }
		this._startBuild();
		while (this._drawNext()) { }
		this._endBuild();
		return this.spriteSheet;
	};
	p.buildAsync = function (timeSlice) {
		if (this._data) { throw SpriteSheetBuilder.ERR_RUNNING; }
		this.timeSlice = timeSlice;
		this._startBuild();
		var _this = this;
		this._timerID = setTimeout(function () { _this._run(); }, 50 - Math.max(0.01, Math.min(0.99, this.timeSlice || 0.3)) * 50);
	};
	p.stopAsync = function () {
		clearTimeout(this._timerID);
		this._data = null;
	};
	p.clone = function () {
		throw ("SpriteSheetBuilder cannot be cloned.");
	};
	p.toString = function () {
		return "[SpriteSheetBuilder]";
	};
	p._startBuild = function () {
		var pad = this.padding || 0;
		this.progress = 0;
		this.spriteSheet = null;
		this._index = 0;
		this._scale = this.scale;
		var dataFrames = [];
		this._data = {
			images: [],
			frames: dataFrames,
			framerate: this.framerate,
			animations: this._animations
		};
		var frames = this._frames.slice();
		frames.sort(function (a, b) { return (a.height <= b.height) ? -1 : 1; });
		if (frames[frames.length - 1].height + pad * 2 > this.maxHeight) { throw SpriteSheetBuilder.ERR_DIMENSIONS; }
		var y = 0, x = 0;
		var img = 0;
		while (frames.length) {
			var o = this._fillRow(frames, y, img, dataFrames, pad);
			if (o.w > x) { x = o.w; }
			y += o.h;
			if (!o.h || !frames.length) {
				var canvas = createjs.createCanvas ? createjs.createCanvas() : document.createElement("canvas");
				canvas.width = this._getSize(x, this.maxWidth);
				canvas.height = this._getSize(y, this.maxHeight);
				this._data.images[img] = canvas;
				if (!o.h) {
					x = y = 0;
					img++;
				}
			}
		}
	};
	p._setupMovieClipFrame = function (source, data) {
		var ae = source.actionsEnabled;
		source.actionsEnabled = false;
		source.gotoAndStop(data.i);
		source.actionsEnabled = ae;
		data.f && data.f(source, data.d, data.i);
	};
	p._getSize = function (size, max) {
		var pow = 4;
		while (Math.pow(2, ++pow) < size) { }
		return Math.min(max, Math.pow(2, pow));
	};
	p._fillRow = function (frames, y, img, dataFrames, pad) {
		var w = this.maxWidth;
		var maxH = this.maxHeight;
		y += pad;
		var h = maxH - y;
		var x = pad;
		var height = 0;
		for (var i = frames.length - 1; i >= 0; i--) {
			var frame = frames[i];
			var sc = this._scale * frame.scale;
			var rect = frame.sourceRect;
			var source = frame.source;
			var rx = Math.floor(sc * rect.x - pad);
			var ry = Math.floor(sc * rect.y - pad);
			var rh = Math.ceil(sc * rect.height + pad * 2);
			var rw = Math.ceil(sc * rect.width + pad * 2);
			if (rw > w) { throw SpriteSheetBuilder.ERR_DIMENSIONS; }
			if (rh > h || x + rw > w) { continue; }
			frame.img = img;
			frame.rect = new createjs.Rectangle(x, y, rw, rh);
			height = height || rh;
			frames.splice(i, 1);
			dataFrames[frame.index] = [x, y, rw, rh, img, Math.round(-rx + sc * source.regX - pad), Math.round(-ry + sc * source.regY - pad)];
			x += rw;
		}
		return { w: x, h: height };
	};
	p._endBuild = function () {
		this.spriteSheet = new createjs.SpriteSheet(this._data);
		this._data = null;
		this.progress = 1;
		this.dispatchEvent("complete");
	};
	p._run = function () {
		var ts = Math.max(0.01, Math.min(0.99, this.timeSlice || 0.3)) * 50;
		var t = (new Date()).getTime() + ts;
		var complete = false;
		while (t > (new Date()).getTime()) {
			if (!this._drawNext()) { complete = true; break; }
		}
		if (complete) {
			this._endBuild();
		} else {
			var _this = this;
			this._timerID = setTimeout(function () { _this._run(); }, 50 - ts);
		}
		var p = this.progress = this._index / this._frames.length;
		if (this.hasEventListener("progress")) {
			var evt = new createjs.Event("progress");
			evt.progress = p;
			this.dispatchEvent(evt);
		}
	};
	p._drawNext = function () {
		var frame = this._frames[this._index];
		var sc = frame.scale * this._scale;
		var rect = frame.rect;
		var sourceRect = frame.sourceRect;
		var canvas = this._data.images[frame.img];
		var ctx = canvas.getContext("2d");
		frame.funct && frame.funct(frame.source, frame.data);
		ctx.save();
		ctx.beginPath();
		ctx.rect(rect.x, rect.y, rect.width, rect.height);
		ctx.clip();
		ctx.translate(Math.ceil(rect.x - sourceRect.x * sc), Math.ceil(rect.y - sourceRect.y * sc));
		ctx.scale(sc, sc);
		frame.source.draw(ctx);
		ctx.restore();
		return (++this._index) < this._frames.length;
	};
	createjs.SpriteSheetBuilder = createjs.promote(SpriteSheetBuilder, "EventDispatcher");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function DOMElement(htmlElement) {
		this.DisplayObject_constructor();
		if (typeof (htmlElement) == "string") { htmlElement = document.getElementById(htmlElement); }
		this.mouseEnabled = false;
		var style = htmlElement.style;
		style.position = "absolute";
		style.transformOrigin = style.WebkitTransformOrigin = style.msTransformOrigin = style.MozTransformOrigin = style.OTransformOrigin = "0% 0%";
		this.htmlElement = htmlElement;
		this._oldProps = null;
		this._oldStage = null;
		this._drawAction = null;
	}
	var p = createjs.extend(DOMElement, createjs.DisplayObject);
	p.isVisible = function () {
		return this.htmlElement != null;
	};
	p.draw = function (ctx, ignoreCache) {
		return true;
	};
	p.cache = function () { };
	p.uncache = function () { };
	p.updateCache = function () { };
	p.hitTest = function () { };
	p.localToGlobal = function () { };
	p.globalToLocal = function () { };
	p.localToLocal = function () { };
	p.clone = function () {
		throw ("DOMElement cannot be cloned.")
	};
	p.toString = function () {
		return "[DOMElement (name=" + this.name + ")]";
	};
	p._tick = function (evtObj) {
		var stage = this.stage;
		if (stage && stage !== this._oldStage) {
			this._drawAction && stage.off("drawend", this._drawAction);
			this._drawAction = stage.on("drawend", this._handleDrawEnd, this);
			this._oldStage = stage;
		}
		this.DisplayObject__tick(evtObj);
	};
	p._handleDrawEnd = function (evt) {
		var o = this.htmlElement;
		if (!o) { return; }
		var style = o.style;
		var props = this.getConcatenatedDisplayProps(this._props), mtx = props.matrix;
		var visibility = props.visible ? "visible" : "hidden";
		if (visibility != style.visibility) { style.visibility = visibility; }
		if (!props.visible) { return; }
		var oldProps = this._oldProps, oldMtx = oldProps && oldProps.matrix;
		var n = 10000;
		if (!oldMtx || !oldMtx.equals(mtx)) {
			var str = "matrix(" + (mtx.a * n | 0) / n + "," + (mtx.b * n | 0) / n + "," + (mtx.c * n | 0) / n + "," + (mtx.d * n | 0) / n + "," + (mtx.tx + 0.5 | 0);
			style.transform = style.WebkitTransform = style.OTransform = style.msTransform = str + "," + (mtx.ty + 0.5 | 0) + ")";
			style.MozTransform = str + "px," + (mtx.ty + 0.5 | 0) + "px)";
			if (!oldProps) { oldProps = this._oldProps = new createjs.DisplayProps(true, null); }
			oldProps.matrix.copy(mtx);
		}
		if (oldProps.alpha != props.alpha) {
			style.opacity = "" + (props.alpha * n | 0) / n;
			oldProps.alpha = props.alpha;
		}
	};
	createjs.DOMElement = createjs.promote(DOMElement, "DisplayObject");
}());
/* (function () {
	"use strict";
	function Text(text) {
		this.DisplayObject_constructor();
		var htmlElement=document.createElement("div");
		if (typeof (htmlElement) == "string") { htmlElement = document.getElementById(htmlElement); }
		this.mouseEnabled = false;
		var style = htmlElement.style;
		style.position = "absolute";
		style.transformOrigin = style.WebkitTransformOrigin = style.msTransformOrigin = style.MozTransformOrigin = style.OTransformOrigin = "0% 0%";
		this.htmlElement = htmlElement;
		this.htmlElement.className="gamenumber";
		this._oldProps = null;
		this._oldStage = null;
		this._drawAction = null;
		this._text="";
		gameContainer.appendChild(this.htmlElement);
		this.__defineGetter__("text", function(){
			return this._text;
		});
		this.__defineSetter__("text", function(val=""){
			val=val.toString()
			if(val.indexOf("d_")>-1)val=languageData[val][languageUI.languageInt]
			this.htmlElement.innerHTML=val;
			this._text=val;
		})
		this.text=text;
	}
	var p = createjs.extend(Text, createjs.DisplayObject);
	p.isVisible = function () {
		return this.htmlElement != null;
	};
	
	p.draw = function (ctx, ignoreCache) {
		return true;
	};
	p.cache = function () { };
	p.uncache = function () { };
	p.updateCache = function () { };
	p.hitTest = function () { };
	p.localToGlobal = function () { };
	p.globalToLocal = function () { };
	p.localToLocal = function () { };
	p.clone = function () {
		throw ("Text cannot be cloned.")
	};
	p.toString = function () {
		return "[Text (name=" + this.name + ")]";
	};
	p._tick = function (evtObj) {
		var stage = this.stage;
		if (stage && stage !== this._oldStage) {
			this._drawAction && stage.off("drawend", this._drawAction);
			this._drawAction = stage.on("drawend", this._handleDrawEnd, this);
			this._oldStage = stage;
		}
		this.DisplayObject__tick(evtObj);
	};
	p._handleDrawEnd = function (evt) {
		var o = this.htmlElement;
		if (!o) { return; }
		var style = o.style;
		var props = this.getConcatenatedDisplayProps(this._props), mtx = props.matrix;
		var visibility = props.visible ? "visible" : "hidden";
		if (visibility != style.visibility) { style.visibility = visibility; }
		if (!props.visible) { return; }
		var oldProps = this._oldProps, oldMtx = oldProps && oldProps.matrix;
		var n = 10000;
		mtx.tx/=2;
		mtx.ty/=2;
		if (!oldMtx || !oldMtx.equals(mtx)) {
			var str = "matrix(" + (mtx.a * n | 0) / n + "," + (mtx.b * n | 0) / n + "," + (mtx.c * n | 0) / n + "," + (mtx.d * n | 0) / n + "," + (mtx.tx + 0.5 | 0);
			style.transform = style.WebkitTransform = style.OTransform = style.msTransform = str + "," + (mtx.ty + 0.5 | 0) + ")";
			style.MozTransform = str + "px," + (mtx.ty + 0.5 | 0) + "px)";
			if (!oldProps) { oldProps = this._oldProps = new createjs.DisplayProps(true, null); }
			oldProps.matrix.copy(mtx);
		}
		if (oldProps.alpha != props.alpha) {
			style.opacity = "" + (props.alpha * n | 0) / n;
			oldProps.alpha = props.alpha;
		}
	};
	createjs.Text = createjs.promote(Text, "DisplayObject");
}()); */

//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Filter() {
		this.usesContext = false;
		this._multiPass = null;
		this.VTX_SHADER_BODY = null;
		this.FRAG_SHADER_BODY = null;
	}
	var p = Filter.prototype;
	p.getBounds = function (rect) {
		return rect;
	};
	p.shaderParamSetup = function (gl, stage, shaderProgram) { };
	p.applyFilter = function (ctx, x, y, width, height, targetCtx, targetX, targetY) {
		targetCtx = targetCtx || ctx;
		if (targetX == null) { targetX = x; }
		if (targetY == null) { targetY = y; }
		try {
			var imageData = ctx.getImageData(x, y, width, height);
		} catch (e) {
			return false;
		}
		if (this._applyFilter(imageData)) {
			targetCtx.putImageData(imageData, targetX, targetY);
			return true;
		}
		return false;
	};
	p.toString = function () {
		return "[Filter]";
	};
	p.clone = function () {
		return new Filter();
	};
	p._applyFilter = function (imageData) { return true; };
	createjs.Filter = Filter;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function BitmapCache() {
		this.width = undefined;
		this.height = undefined;
		this.x = undefined;
		this.y = undefined;
		this.scale = 1;
		this.offX = 0;
		this.offY = 0;
		this.cacheID = 0;
		this._filterOffX = 0;
		this._filterOffY = 0;
		this._cacheDataURLID = 0;
		this._cacheDataURL = null;
		this._drawWidth = 0;
		this._drawHeight = 0;
	}
	var p = BitmapCache.prototype;
	BitmapCache.getFilterBounds = function (target, output) {
		if (!output) { output = new createjs.Rectangle(); }
		var filters = target.filters;
		var filterCount = filters && filters.length;
		if (!!filterCount <= 0) { return output; }
		for (var i = 0; i < filterCount; i++) {
			var f = filters[i];
			if (!f || !f.getBounds) { continue; }
			var test = f.getBounds();
			if (!test) { continue; }
			if (i == 0) {
				output.setValues(test.x, test.y, test.width, test.height);
			} else {
				output.extend(test.x, test.y, test.width, test.height);
			}
		}
		return output;
	};
	p.toString = function () {
		return "[BitmapCache]";
	};
	p.define = function (target, x, y, width, height, scale, options) {
		if (!target) { throw "No symbol to cache"; }
		this._options = options;
		this.target = target;
		this.width = width >= 1 ? width : 1;
		this.height = height >= 1 ? height : 1;
		this.x = x || 0;
		this.y = y || 0;
		this.scale = scale || 1;
		this.update();
	};
	p.update = function (compositeOperation) {
		if (!this.target) { throw "define() must be called before update()"; }
		var filterBounds = BitmapCache.getFilterBounds(this.target);
		var surface = this.target.cacheCanvas;
		this._drawWidth = Math.ceil(this.width * this.scale) + filterBounds.width;
		this._drawHeight = Math.ceil(this.height * this.scale) + filterBounds.height;
		if (!surface || this._drawWidth != surface.width || this._drawHeight != surface.height) {
			this._updateSurface();
		}
		this._filterOffX = filterBounds.x;
		this._filterOffY = filterBounds.y;
		this.offX = this.x * this.scale + this._filterOffX;
		this.offY = this.y * this.scale + this._filterOffY;
		this._drawToCache(compositeOperation);
		this.cacheID = this.cacheID ? this.cacheID + 1 : 1;
	};
	p.release = function () {
		if (this._webGLCache) {
			if (!this._webGLCache.isCacheControlled) {
				if (this.__lastRT) { this.__lastRT = undefined; }
				if (this.__rtA) { this._webGLCache._killTextureObject(this.__rtA); }
				if (this.__rtB) { this._webGLCache._killTextureObject(this.__rtB); }
				if (this.target && this.target.cacheCanvas) { this._webGLCache._killTextureObject(this.target.cacheCanvas); }
			}
			this._webGLCache = false;
		} else {
			var stage = this.target.stage;
			if (stage instanceof createjs.StageGL) {
				stage.releaseTexture(this.target.cacheCanvas);
			}
		}
		this.target = this.target.cacheCanvas = null;
		this.cacheID = this._cacheDataURLID = this._cacheDataURL = undefined;
		this.width = this.height = this.x = this.y = this.offX = this.offY = 0;
		this.scale = 1;
	};
	p.getCacheDataURL = function () {
		var cacheCanvas = this.target && this.target.cacheCanvas;
		if (!cacheCanvas) { return null; }
		if (this.cacheID != this._cacheDataURLID) {
			this._cacheDataURLID = this.cacheID;
			this._cacheDataURL = cacheCanvas.toDataURL ? cacheCanvas.toDataURL() : null;
		}
		return this._cacheDataURL;
	};
	p.draw = function (ctx) {
		if (!this.target) { return false; }
		ctx.drawImage(this.target.cacheCanvas,
			this.x + (this._filterOffX / this.scale), this.y + (this._filterOffY / this.scale),
			this._drawWidth / this.scale, this._drawHeight / this.scale
		);
		return true;
	};
	p._updateSurface = function () {
		if (!this._options || !this._options.useGL) {
			var surface = this.target.cacheCanvas;
			if (!surface) {
				surface = this.target.cacheCanvas = createjs.createCanvas ? createjs.createCanvas() : document.createElement("canvas");
			}
			surface.width = this._drawWidth;
			surface.height = this._drawHeight;
			return;
		}
		if (!this._webGLCache) {
			if (this._options.useGL === "stage") {
				if (!(this.target.stage && this.target.stage.isWebGL)) {
					var error = "Cannot use 'stage' for cache because the object's parent stage is ";
					error += this.target.stage ? "non WebGL." : "not set, please addChild to the correct stage.";
					throw error;
				}
				this.target.cacheCanvas = true;
				this._webGLCache = this.target.stage;
			} else if (this._options.useGL === "new") {
				this.target.cacheCanvas = document.createElement("canvas");
				this._webGLCache = new createjs.StageGL(this.target.cacheCanvas, { antialias: true, transparent: true, autoPurge: -1 });
				this._webGLCache.isCacheControlled = true;
			} else if (this._options.useGL instanceof createjs.StageGL) {
				this.target.cacheCanvas = true;
				this._webGLCache = this._options.useGL;
				this._webGLCache.isCacheControlled = true;
			} else {
				throw "Invalid option provided to useGL, expected ['stage', 'new', StageGL, undefined], got " + this._options.useGL;
			}
		}
		var surface = this.target.cacheCanvas;
		var stageGL = this._webGLCache;
		if (stageGL.isCacheControlled) {
			surface.width = this._drawWidth;
			surface.height = this._drawHeight;
			stageGL.updateViewport(this._drawWidth, this._drawHeight);
		}
		if (this.target.filters) {
			stageGL.getTargetRenderTexture(this.target, this._drawWidth, this._drawHeight);
			stageGL.getTargetRenderTexture(this.target, this._drawWidth, this._drawHeight);
		} else {
			if (!stageGL.isCacheControlled) {
				stageGL.getTargetRenderTexture(this.target, this._drawWidth, this._drawHeight);
			}
		}
	};
	p._drawToCache = function (compositeOperation) {
		var surface = this.target.cacheCanvas;
		var target = this.target;
		var webGL = this._webGLCache;
		if (webGL) {
			//TODO: auto split blur into an x/y pass
			webGL.cacheDraw(target, target.filters, this);
			surface = this.target.cacheCanvas;
			surface.width = this._drawWidth;
			surface.height = this._drawHeight;
		} else {
			var ctx = surface.getContext("2d");
			if (!compositeOperation) {
				ctx.clearRect(0, 0, this._drawWidth + 1, this._drawHeight + 1);
			}
			ctx.save();
			ctx.globalCompositeOperation = compositeOperation;
			ctx.setTransform(this.scale, 0, 0, this.scale, -this._filterOffX, -this._filterOffY);
			ctx.translate(-this.x, -this.y);
			target.draw(ctx, true);
			ctx.restore();
			if (target.filters && target.filters.length) {
				this._applyFilters(ctx);
			}
		}
		surface._invalid = true;
	};
	p._applyFilters = function (ctx) {
		var filters = this.target.filters;
		var w = this._drawWidth;
		var h = this._drawHeight;
		var data;
		var i = 0, filter = filters[i];
		do {
			if (filter.usesContext) {
				if (data) {
					ctx.putImageData(data, 0, 0);
					data = null;
				}
				filter.applyFilter(ctx, 0, 0, w, h);
			} else {
				if (!data) {
					data = ctx.getImageData(0, 0, w, h);
				}
				filter._applyFilter(data);
			}
			filter = filter._multiPass !== null ? filter._multiPass : filters[++i];
		} while (filter);
		//done
		if (data) {
			ctx.putImageData(data, 0, 0);
		}
	};
	createjs.BitmapCache = BitmapCache;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function BlurFilter(blurX, blurY, quality) {
		this.Filter_constructor();
		this._blurX = blurX;
		this._blurXTable = [];
		this._lastBlurX = null;
		this._blurY = blurY;
		this._blurYTable = [];
		this._lastBlurY = null;
		this._quality;
		this._lastQuality = null;
		this.FRAG_SHADER_TEMPLATE = (
			"uniform float xWeight[{{blurX}}];" +
			"uniform float yWeight[{{blurY}}];" +
			"uniform vec2 textureOffset;" +
			"void main(void) {" +
			"vec4 color = vec4(0.0);" +
			"float xAdj = ({{blurX}}.0-1.0)/2.0;" +
			"float yAdj = ({{blurY}}.0-1.0)/2.0;" +
			"vec2 sampleOffset;" +
			"for(int i=0; i<{{blurX}}; i++) {" +
			"for(int j=0; j<{{blurY}}; j++) {" +
			"sampleOffset = vRenderCoord + (textureOffset * vec2(float(i)-xAdj, float(j)-yAdj));" +
			"color += texture2D(uSampler, sampleOffset) * (xWeight[i] * yWeight[j]);" +
			"}" +
			"}" +
			"gl_FragColor = color.rgba;" +
			"}"
		);
		if (isNaN(quality) || quality < 1) { quality = 1; }
		this.setQuality(quality | 0);
	}
	var p = createjs.extend(BlurFilter, createjs.Filter);
	p.getBlurX = function () { return this._blurX; };
	p.getBlurY = function () { return this._blurY; };
	p.setBlurX = function (value) {
		if (isNaN(value) || value < 0) { value = 0; }
		this._blurX = value;
	};
	p.setBlurY = function (value) {
		if (isNaN(value) || value < 0) { value = 0; }
		this._blurY = value;
	};
	p.getQuality = function () { return this._quality; };
	p.setQuality = function (value) {
		if (isNaN(value) || value < 0) { value = 0; }
		this._quality = value | 0;
	};
	p._getShader = function () {
		var xChange = this._lastBlurX !== this._blurX;
		var yChange = this._lastBlurY !== this._blurY;
		var qChange = this._lastQuality !== this._quality;
		if (xChange || yChange || qChange) {
			if (xChange || qChange) { this._blurXTable = this._getTable(this._blurX * this._quality); }
			if (yChange || qChange) { this._blurYTable = this._getTable(this._blurY * this._quality); }
			this._updateShader();
			this._lastBlurX = this._blurX;
			this._lastBlurY = this._blurY;
			this._lastQuality = this._quality;
			return undefined;
		}
		return this._compiledShader;
	};
	p._setShader = function () { this._compiledShader; };
	try {
		Object.defineProperties(p, {
			blurX: { get: p.getBlurX, set: p.setBlurX },
			blurY: { get: p.getBlurY, set: p.setBlurY },
			quality: { get: p.getQuality, set: p.setQuality },
			_builtShader: { get: p._getShader, set: p._setShader }
		});
	} catch (e) { console.log(e); }
	p._getTable = function (spread) {
		var EDGE = 4.2;
		if (spread <= 1) { return [1]; }
		var result = [];
		var count = Math.ceil(spread * 2);
		count += (count % 2) ? 0 : 1;
		var adjust = (count / 2) | 0;
		for (var i = -adjust; i <= adjust; i++) {
			var x = (i / adjust) * EDGE;
			result.push(1 / Math.sqrt(2 * Math.PI) * Math.pow(Math.E, -(Math.pow(x, 2) / 4)));
		}
		var factor = result.reduce(function (a, b) { return a + b; });
		return result.map(function (currentValue, index, array) { return currentValue / factor; });
	};
	p._updateShader = function () {
		if (this._blurX === undefined || this._blurY === undefined) { return; }
		var result = this.FRAG_SHADER_TEMPLATE;
		result = result.replace(/\{\{blurX\}\}/g, (this._blurXTable.length).toFixed(0));
		result = result.replace(/\{\{blurY\}\}/g, (this._blurYTable.length).toFixed(0));
		this.FRAG_SHADER_BODY = result;
	};
	p.shaderParamSetup = function (gl, stage, shaderProgram) {
		gl.uniform1fv(
			gl.getUniformLocation(shaderProgram, "xWeight"),
			this._blurXTable
		);
		gl.uniform1fv(
			gl.getUniformLocation(shaderProgram, "yWeight"),
			this._blurYTable
		);
		gl.uniform2f(
			gl.getUniformLocation(shaderProgram, "textureOffset"),
			2 / (stage._viewportWidth * this._quality), 2 / (stage._viewportHeight * this._quality)
		);
	};
	BlurFilter.MUL_TABLE = [1, 171, 205, 293, 57, 373, 79, 137, 241, 27, 391, 357, 41, 19, 283, 265, 497, 469, 443, 421, 25, 191, 365, 349, 335, 161, 155, 149, 9, 278, 269, 261, 505, 245, 475, 231, 449, 437, 213, 415, 405, 395, 193, 377, 369, 361, 353, 345, 169, 331, 325, 319, 313, 307, 301, 37, 145, 285, 281, 69, 271, 267, 263, 259, 509, 501, 493, 243, 479, 118, 465, 459, 113, 446, 55, 435, 429, 423, 209, 413, 51, 403, 199, 393, 97, 3, 379, 375, 371, 367, 363, 359, 355, 351, 347, 43, 85, 337, 333, 165, 327, 323, 5, 317, 157, 311, 77, 305, 303, 75, 297, 294, 73, 289, 287, 71, 141, 279, 277, 275, 68, 135, 67, 133, 33, 262, 260, 129, 511, 507, 503, 499, 495, 491, 61, 121, 481, 477, 237, 235, 467, 232, 115, 457, 227, 451, 7, 445, 221, 439, 218, 433, 215, 427, 425, 211, 419, 417, 207, 411, 409, 203, 202, 401, 399, 396, 197, 49, 389, 387, 385, 383, 95, 189, 47, 187, 93, 185, 23, 183, 91, 181, 45, 179, 89, 177, 11, 175, 87, 173, 345, 343, 341, 339, 337, 21, 167, 83, 331, 329, 327, 163, 81, 323, 321, 319, 159, 79, 315, 313, 39, 155, 309, 307, 153, 305, 303, 151, 75, 299, 149, 37, 295, 147, 73, 291, 145, 289, 287, 143, 285, 71, 141, 281, 35, 279, 139, 69, 275, 137, 273, 17, 271, 135, 269, 267, 133, 265, 33, 263, 131, 261, 130, 259, 129, 257, 1];
	BlurFilter.SHG_TABLE = [0, 9, 10, 11, 9, 12, 10, 11, 12, 9, 13, 13, 10, 9, 13, 13, 14, 14, 14, 14, 10, 13, 14, 14, 14, 13, 13, 13, 9, 14, 14, 14, 15, 14, 15, 14, 15, 15, 14, 15, 15, 15, 14, 15, 15, 15, 15, 15, 14, 15, 15, 15, 15, 15, 15, 12, 14, 15, 15, 13, 15, 15, 15, 15, 16, 16, 16, 15, 16, 14, 16, 16, 14, 16, 13, 16, 16, 16, 15, 16, 13, 16, 15, 16, 14, 9, 16, 16, 16, 16, 16, 16, 16, 16, 16, 13, 14, 16, 16, 15, 16, 16, 10, 16, 15, 16, 14, 16, 16, 14, 16, 16, 14, 16, 16, 14, 15, 16, 16, 16, 14, 15, 14, 15, 13, 16, 16, 15, 17, 17, 17, 17, 17, 17, 14, 15, 17, 17, 16, 16, 17, 16, 15, 17, 16, 17, 11, 17, 16, 17, 16, 17, 16, 17, 17, 16, 17, 17, 16, 17, 17, 16, 16, 17, 17, 17, 16, 14, 17, 17, 17, 17, 15, 16, 14, 16, 15, 16, 13, 16, 15, 16, 14, 16, 15, 16, 12, 16, 15, 16, 17, 17, 17, 17, 17, 13, 16, 15, 17, 17, 17, 16, 15, 17, 17, 17, 16, 15, 17, 17, 14, 16, 17, 17, 16, 17, 17, 16, 15, 17, 16, 14, 17, 16, 15, 17, 16, 17, 17, 16, 17, 15, 16, 17, 14, 17, 16, 15, 17, 16, 17, 13, 17, 16, 17, 17, 16, 17, 14, 17, 16, 17, 16, 17, 16, 17, 9];
	p.getBounds = function (rect) {
		var x = this.blurX | 0, y = this.blurY | 0;
		if (x <= 0 && y <= 0) { return rect; }
		var q = Math.pow(this.quality, 0.2);
		return (rect || new createjs.Rectangle()).pad(y * q + 1, x * q + 1, y * q + 1, x * q + 1);
	};
	p.clone = function () {
		return new BlurFilter(this.blurX, this.blurY, this.quality);
	};
	p.toString = function () {
		return "[BlurFilter]";
	};
	p._applyFilter = function (imageData) {
		var radiusX = this._blurX >> 1;
		if (isNaN(radiusX) || radiusX < 0) return false;
		var radiusY = this._blurY >> 1;
		if (isNaN(radiusY) || radiusY < 0) return false;
		if (radiusX == 0 && radiusY == 0) return false;
		var iterations = this.quality;
		if (isNaN(iterations) || iterations < 1) iterations = 1;
		iterations |= 0;
		if (iterations > 3) iterations = 3;
		if (iterations < 1) iterations = 1;
		var px = imageData.data;
		var x = 0, y = 0, i = 0, p = 0, yp = 0, yi = 0, yw = 0, r = 0, g = 0, b = 0, a = 0, pr = 0, pg = 0, pb = 0, pa = 0;
		var divx = (radiusX + radiusX + 1) | 0;
		var divy = (radiusY + radiusY + 1) | 0;
		var w = imageData.width | 0;
		var h = imageData.height | 0;
		var w1 = (w - 1) | 0;
		var h1 = (h - 1) | 0;
		var rxp1 = (radiusX + 1) | 0;
		var ryp1 = (radiusY + 1) | 0;
		var ssx = { r: 0, b: 0, g: 0, a: 0 };
		var sx = ssx;
		for (i = 1; i < divx; i++) {
			sx = sx.n = { r: 0, b: 0, g: 0, a: 0 };
		}
		sx.n = ssx;
		var ssy = { r: 0, b: 0, g: 0, a: 0 };
		var sy = ssy;
		for (i = 1; i < divy; i++) {
			sy = sy.n = { r: 0, b: 0, g: 0, a: 0 };
		}
		sy.n = ssy;
		var si = null;
		var mtx = BlurFilter.MUL_TABLE[radiusX] | 0;
		var stx = BlurFilter.SHG_TABLE[radiusX] | 0;
		var mty = BlurFilter.MUL_TABLE[radiusY] | 0;
		var sty = BlurFilter.SHG_TABLE[radiusY] | 0;
		while (iterations-- > 0) {
			yw = yi = 0;
			var ms = mtx;
			var ss = stx;
			for (y = h; --y > -1;) {
				r = rxp1 * (pr = px[(yi) | 0]);
				g = rxp1 * (pg = px[(yi + 1) | 0]);
				b = rxp1 * (pb = px[(yi + 2) | 0]);
				a = rxp1 * (pa = px[(yi + 3) | 0]);
				sx = ssx;
				for (i = rxp1; --i > -1;) {
					sx.r = pr;
					sx.g = pg;
					sx.b = pb;
					sx.a = pa;
					sx = sx.n;
				}
				for (i = 1; i < rxp1; i++) {
					p = (yi + ((w1 < i ? w1 : i) << 2)) | 0;
					r += (sx.r = px[p]);
					g += (sx.g = px[p + 1]);
					b += (sx.b = px[p + 2]);
					a += (sx.a = px[p + 3]);
					sx = sx.n;
				}
				si = ssx;
				for (x = 0; x < w; x++) {
					px[yi++] = (r * ms) >>> ss;
					px[yi++] = (g * ms) >>> ss;
					px[yi++] = (b * ms) >>> ss;
					px[yi++] = (a * ms) >>> ss;
					p = ((yw + ((p = x + radiusX + 1) < w1 ? p : w1)) << 2);
					r -= si.r - (si.r = px[p]);
					g -= si.g - (si.g = px[p + 1]);
					b -= si.b - (si.b = px[p + 2]);
					a -= si.a - (si.a = px[p + 3]);
					si = si.n;
				}
				yw += w;
			}
			ms = mty;
			ss = sty;
			for (x = 0; x < w; x++) {
				yi = (x << 2) | 0;
				r = (ryp1 * (pr = px[yi])) | 0;
				g = (ryp1 * (pg = px[(yi + 1) | 0])) | 0;
				b = (ryp1 * (pb = px[(yi + 2) | 0])) | 0;
				a = (ryp1 * (pa = px[(yi + 3) | 0])) | 0;
				sy = ssy;
				for (i = 0; i < ryp1; i++) {
					sy.r = pr;
					sy.g = pg;
					sy.b = pb;
					sy.a = pa;
					sy = sy.n;
				}
				yp = w;
				for (i = 1; i <= radiusY; i++) {
					yi = (yp + x) << 2;
					r += (sy.r = px[yi]);
					g += (sy.g = px[yi + 1]);
					b += (sy.b = px[yi + 2]);
					a += (sy.a = px[yi + 3]);
					sy = sy.n;
					if (i < h1) {
						yp += w;
					}
				}
				yi = x;
				si = ssy;
				if (iterations > 0) {
					for (y = 0; y < h; y++) {
						p = yi << 2;
						px[p + 3] = pa = (a * ms) >>> ss;
						if (pa > 0) {
							px[p] = ((r * ms) >>> ss);
							px[p + 1] = ((g * ms) >>> ss);
							px[p + 2] = ((b * ms) >>> ss);
						} else {
							px[p] = px[p + 1] = px[p + 2] = 0
						}
						p = (x + (((p = y + ryp1) < h1 ? p : h1) * w)) << 2;
						r -= si.r - (si.r = px[p]);
						g -= si.g - (si.g = px[p + 1]);
						b -= si.b - (si.b = px[p + 2]);
						a -= si.a - (si.a = px[p + 3]);
						si = si.n;
						yi += w;
					}
				} else {
					for (y = 0; y < h; y++) {
						p = yi << 2;
						px[p + 3] = pa = (a * ms) >>> ss;
						if (pa > 0) {
							pa = 255 / pa;
							px[p] = ((r * ms) >>> ss) * pa;
							px[p + 1] = ((g * ms) >>> ss) * pa;
							px[p + 2] = ((b * ms) >>> ss) * pa;
						} else {
							px[p] = px[p + 1] = px[p + 2] = 0
						}
						p = (x + (((p = y + ryp1) < h1 ? p : h1) * w)) << 2;
						r -= si.r - (si.r = px[p]);
						g -= si.g - (si.g = px[p + 1]);
						b -= si.b - (si.b = px[p + 2]);
						a -= si.a - (si.a = px[p + 3]);
						si = si.n;
						yi += w;
					}
				}
			}
		}
		return true;
	};
	createjs.BlurFilter = createjs.promote(BlurFilter, "Filter");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function AlphaMapFilter(alphaMap) {
		this.Filter_constructor();
		this.alphaMap = alphaMap;
		this._alphaMap = null;
		this._mapData = null;
		this._mapTexture = null;
		this.FRAG_SHADER_BODY = (
			"uniform sampler2D uAlphaSampler;" +
			"void main(void) {" +
			"vec4 color = texture2D(uSampler, vRenderCoord);" +
			"vec4 alphaMap = texture2D(uAlphaSampler, vTextureCoord);" +
			"gl_FragColor = vec4(color.rgb, color.a * (alphaMap.r * ceil(alphaMap.a)));" +
			"}"
		);
	}
	var p = createjs.extend(AlphaMapFilter, createjs.Filter);
	p.shaderParamSetup = function (gl, stage, shaderProgram) {
		if (!this._mapTexture) { this._mapTexture = gl.createTexture(); }
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this._mapTexture);
		stage.setTextureParams(gl);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.alphaMap);
		gl.uniform1i(
			gl.getUniformLocation(shaderProgram, "uAlphaSampler"),
			1
		);
	};
	p.clone = function () {
		var o = new AlphaMapFilter(this.alphaMap);
		o._alphaMap = this._alphaMap;
		o._mapData = this._mapData;
		return o;
	};
	p.toString = function () {
		return "[AlphaMapFilter]";
	};
	p._applyFilter = function (imageData) {
		if (!this.alphaMap) { return true; }
		if (!this._prepAlphaMap()) { return false; }
		var data = imageData.data;
		var map = this._mapData;
		for (var i = 0, l = data.length; i < l; i += 4) { data[i + 3] = map[i] || 0; }
		return true;
	};
	p._prepAlphaMap = function () {
		if (!this.alphaMap) { return false; }
		if (this.alphaMap == this._alphaMap && this._mapData) { return true; }
		this._mapData = null;
		var map = this._alphaMap = this.alphaMap;
		var canvas = map;
		var ctx;
		if (map instanceof HTMLCanvasElement) {
			ctx = canvas.getContext("2d");
		} else {
			canvas = createjs.createCanvas ? createjs.createCanvas() : document.createElement("canvas");
			canvas.width = map.width;
			canvas.height = map.height;
			ctx = canvas.getContext("2d");
			ctx.drawImage(map, 0, 0);
		}
		try {
			var imgData = ctx.getImageData(0, 0, map.width, map.height);
		} catch (e) {
			//if (!this.suppressCrossDomainErrors) throw new Error("unable to access local image data: " + e);
			return false;
		}
		this._mapData = imgData.data;
		return true;
	};
	createjs.AlphaMapFilter = createjs.promote(AlphaMapFilter, "Filter");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function AlphaMaskFilter(mask) {
		this.Filter_constructor();
		this.mask = mask;
		this.usesContext = true;
		this.FRAG_SHADER_BODY = (
			"uniform sampler2D uAlphaSampler;" +
			"void main(void) {" +
			"vec4 color = texture2D(uSampler, vRenderCoord);" +
			"vec4 alphaMap = texture2D(uAlphaSampler, vTextureCoord);" +
			"gl_FragColor = vec4(color.rgb, color.a * alphaMap.a);" +
			"}"
		);
	}
	var p = createjs.extend(AlphaMaskFilter, createjs.Filter);
	p.shaderParamSetup = function (gl, stage, shaderProgram) {
		if (!this._mapTexture) { this._mapTexture = gl.createTexture(); }
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this._mapTexture);
		stage.setTextureParams(gl);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.mask);
		gl.uniform1i(
			gl.getUniformLocation(shaderProgram, "uAlphaSampler"),
			1
		);
	};
	p.applyFilter = function (ctx, x, y, width, height, targetCtx, targetX, targetY) {
		if (!this.mask) { return true; }
		targetCtx = targetCtx || ctx;
		if (targetX == null) { targetX = x; }
		if (targetY == null) { targetY = y; }
		targetCtx.save();
		if (ctx != targetCtx) {
			return false;
		}
		targetCtx.globalCompositeOperation = "destination-in";
		targetCtx.drawImage(this.mask, targetX, targetY);
		targetCtx.restore();
		return true;
	};
	p.clone = function () {
		return new AlphaMaskFilter(this.mask);
	};
	p.toString = function () {
		return "[AlphaMaskFilter]";
	};
	createjs.AlphaMaskFilter = createjs.promote(AlphaMaskFilter, "Filter");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function ColorFilter(redMultiplier, greenMultiplier, blueMultiplier, alphaMultiplier, redOffset, greenOffset, blueOffset, alphaOffset) {
		this.Filter_constructor();
		this.redMultiplier = redMultiplier != null ? redMultiplier : 1;
		this.greenMultiplier = greenMultiplier != null ? greenMultiplier : 1;
		this.blueMultiplier = blueMultiplier != null ? blueMultiplier : 1;
		this.alphaMultiplier = alphaMultiplier != null ? alphaMultiplier : 1;
		this.redOffset = redOffset || 0;
		this.greenOffset = greenOffset || 0;
		this.blueOffset = blueOffset || 0;
		this.alphaOffset = alphaOffset || 0;
		this.FRAG_SHADER_BODY = (
			"uniform vec4 uColorMultiplier;" +
			"uniform vec4 uColorOffset;" +
			"void main(void) {" +
			"vec4 color = texture2D(uSampler, vRenderCoord);" +
			"gl_FragColor = (color * uColorMultiplier) + uColorOffset;" +
			"}"
		);
	}
	var p = createjs.extend(ColorFilter, createjs.Filter);
	p.shaderParamSetup = function (gl, stage, shaderProgram) {
		gl.uniform4f(
			gl.getUniformLocation(shaderProgram, "uColorMultiplier"),
			this.redMultiplier, this.greenMultiplier, this.blueMultiplier, this.alphaMultiplier
		);
		gl.uniform4f(
			gl.getUniformLocation(shaderProgram, "uColorOffset"),
			this.redOffset / 255, this.greenOffset / 255, this.blueOffset / 255, this.alphaOffset / 255
		);
	};
	p.toString = function () {
		return "[ColorFilter]";
	};
	p.clone = function () {
		return new ColorFilter(
			this.redMultiplier, this.greenMultiplier, this.blueMultiplier, this.alphaMultiplier,
			this.redOffset, this.greenOffset, this.blueOffset, this.alphaOffset
		);
	};
	p._applyFilter = function (imageData) {
		var data = imageData.data;
		var l = data.length;
		for (var i = 0; i < l; i += 4) {
			data[i] = data[i] * this.redMultiplier + this.redOffset;
			data[i + 1] = data[i + 1] * this.greenMultiplier + this.greenOffset;
			data[i + 2] = data[i + 2] * this.blueMultiplier + this.blueOffset;
			data[i + 3] = data[i + 3] * this.alphaMultiplier + this.alphaOffset;
		}
		return true;
	};
	createjs.ColorFilter = createjs.promote(ColorFilter, "Filter");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function ColorMatrix(brightness, contrast, saturation, hue) {
		this.setColor(brightness, contrast, saturation, hue);
	}
	var p = ColorMatrix.prototype;
	ColorMatrix.DELTA_INDEX = [
		0, 0.01, 0.02, 0.04, 0.05, 0.06, 0.07, 0.08, 0.1, 0.11,
		0.12, 0.14, 0.15, 0.16, 0.17, 0.18, 0.20, 0.21, 0.22, 0.24,
		0.25, 0.27, 0.28, 0.30, 0.32, 0.34, 0.36, 0.38, 0.40, 0.42,
		0.44, 0.46, 0.48, 0.5, 0.53, 0.56, 0.59, 0.62, 0.65, 0.68,
		0.71, 0.74, 0.77, 0.80, 0.83, 0.86, 0.89, 0.92, 0.95, 0.98,
		1.0, 1.06, 1.12, 1.18, 1.24, 1.30, 1.36, 1.42, 1.48, 1.54,
		1.60, 1.66, 1.72, 1.78, 1.84, 1.90, 1.96, 2.0, 2.12, 2.25,
		2.37, 2.50, 2.62, 2.75, 2.87, 3.0, 3.2, 3.4, 3.6, 3.8,
		4.0, 4.3, 4.7, 4.9, 5.0, 5.5, 6.0, 6.5, 6.8, 7.0,
		7.3, 7.5, 7.8, 8.0, 8.4, 8.7, 9.0, 9.4, 9.6, 9.8,
		10.0
	];
	ColorMatrix.IDENTITY_MATRIX = [
		1, 0, 0, 0, 0,
		0, 1, 0, 0, 0,
		0, 0, 1, 0, 0,
		0, 0, 0, 1, 0,
		0, 0, 0, 0, 1
	];
	ColorMatrix.LENGTH = ColorMatrix.IDENTITY_MATRIX.length;
	p.setColor = function (brightness, contrast, saturation, hue) {
		return this.reset().adjustColor(brightness, contrast, saturation, hue);
	};
	p.reset = function () {
		return this.copy(ColorMatrix.IDENTITY_MATRIX);
	};
	p.adjustColor = function (brightness, contrast, saturation, hue) {
		this.adjustHue(hue);
		this.adjustContrast(contrast);
		this.adjustBrightness(brightness);
		return this.adjustSaturation(saturation);
	};
	p.adjustBrightness = function (value) {
		if (value == 0 || isNaN(value)) { return this; }
		value = this._cleanValue(value, 255);
		this._multiplyMatrix([
			1, 0, 0, 0, value,
			0, 1, 0, 0, value,
			0, 0, 1, 0, value,
			0, 0, 0, 1, 0,
			0, 0, 0, 0, 1
		]);
		return this;
	};
	p.adjustContrast = function (value) {
		if (value == 0 || isNaN(value)) { return this; }
		value = this._cleanValue(value, 100);
		var x;
		if (value < 0) {
			x = 127 + value / 100 * 127;
		} else {
			x = value % 1;
			if (x == 0) {
				x = ColorMatrix.DELTA_INDEX[value];
			} else {
				x = ColorMatrix.DELTA_INDEX[(value << 0)] * (1 - x) + ColorMatrix.DELTA_INDEX[(value << 0) + 1] * x;
			}
			x = x * 127 + 127;
		}
		this._multiplyMatrix([
			x / 127, 0, 0, 0, 0.5 * (127 - x),
			0, x / 127, 0, 0, 0.5 * (127 - x),
			0, 0, x / 127, 0, 0.5 * (127 - x),
			0, 0, 0, 1, 0,
			0, 0, 0, 0, 1
		]);
		return this;
	};
	p.adjustSaturation = function (value) {
		if (value == 0 || isNaN(value)) { return this; }
		value = this._cleanValue(value, 100);
		var x = 1 + ((value > 0) ? 3 * value / 100 : value / 100);
		var lumR = 0.3086;
		var lumG = 0.6094;
		var lumB = 0.0820;
		this._multiplyMatrix([
			lumR * (1 - x) + x, lumG * (1 - x), lumB * (1 - x), 0, 0,
			lumR * (1 - x), lumG * (1 - x) + x, lumB * (1 - x), 0, 0,
			lumR * (1 - x), lumG * (1 - x), lumB * (1 - x) + x, 0, 0,
			0, 0, 0, 1, 0,
			0, 0, 0, 0, 1
		]);
		return this;
	};
	p.adjustHue = function (value) {
		if (value == 0 || isNaN(value)) { return this; }
		value = this._cleanValue(value, 180) / 180 * Math.PI;
		var cosVal = Math.cos(value);
		var sinVal = Math.sin(value);
		var lumR = 0.213;
		var lumG = 0.715;
		var lumB = 0.072;
		this._multiplyMatrix([
			lumR + cosVal * (1 - lumR) + sinVal * (-lumR), lumG + cosVal * (-lumG) + sinVal * (-lumG), lumB + cosVal * (-lumB) + sinVal * (1 - lumB), 0, 0,
			lumR + cosVal * (-lumR) + sinVal * (0.143), lumG + cosVal * (1 - lumG) + sinVal * (0.140), lumB + cosVal * (-lumB) + sinVal * (-0.283), 0, 0,
			lumR + cosVal * (-lumR) + sinVal * (-(1 - lumR)), lumG + cosVal * (-lumG) + sinVal * (lumG), lumB + cosVal * (1 - lumB) + sinVal * (lumB), 0, 0,
			0, 0, 0, 1, 0,
			0, 0, 0, 0, 1
		]);
		return this;
	};
	p.concat = function (matrix) {
		matrix = this._fixMatrix(matrix);
		if (matrix.length != ColorMatrix.LENGTH) { return this; }
		this._multiplyMatrix(matrix);
		return this;
	};
	p.clone = function () {
		return (new ColorMatrix()).copy(this);
	};
	p.toArray = function () {
		var arr = [];
		for (var i = 0, l = ColorMatrix.LENGTH; i < l; i++) {
			arr[i] = this[i];
		}
		return arr;
	};
	p.copy = function (matrix) {
		var l = ColorMatrix.LENGTH;
		for (var i = 0; i < l; i++) {
			this[i] = matrix[i];
		}
		return this;
	};
	p.toString = function () {
		return "[ColorMatrix]";
	};
	p._multiplyMatrix = function (matrix) {
		var i, j, k, col = [];
		for (i = 0; i < 5; i++) {
			for (j = 0; j < 5; j++) {
				col[j] = this[j + i * 5];
			}
			for (j = 0; j < 5; j++) {
				var val = 0;
				for (k = 0; k < 5; k++) {
					val += matrix[j + k * 5] * col[k];
				}
				this[j + i * 5] = val;
			}
		}
	};
	p._cleanValue = function (value, limit) {
		return Math.min(limit, Math.max(-limit, value));
	};
	p._fixMatrix = function (matrix) {
		if (matrix instanceof ColorMatrix) { matrix = matrix.toArray(); }
		if (matrix.length < ColorMatrix.LENGTH) {
			matrix = matrix.slice(0, matrix.length).concat(ColorMatrix.IDENTITY_MATRIX.slice(matrix.length, ColorMatrix.LENGTH));
		} else if (matrix.length > ColorMatrix.LENGTH) {
			matrix = matrix.slice(0, ColorMatrix.LENGTH);
		}
		return matrix;
	};
	createjs.ColorMatrix = ColorMatrix;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function ColorMatrixFilter(matrix) {
		this.Filter_constructor();
		this.matrix = matrix;
		this.FRAG_SHADER_BODY = (
			"uniform mat4 uColorMatrix;" +
			"uniform vec4 uColorMatrixOffset;" +
			"void main(void) {" +
			"vec4 color = texture2D(uSampler, vRenderCoord);" +
			"mat4 m = uColorMatrix;" +
			"vec4 newColor = vec4(0,0,0,0);" +
			"newColor.r = color.r*m[0][0] + color.g*m[0][1] + color.b*m[0][2] + color.a*m[0][3];" +
			"newColor.g = color.r*m[1][0] + color.g*m[1][1] + color.b*m[1][2] + color.a*m[1][3];" +
			"newColor.b = color.r*m[2][0] + color.g*m[2][1] + color.b*m[2][2] + color.a*m[2][3];" +
			"newColor.a = color.r*m[3][0] + color.g*m[3][1] + color.b*m[3][2] + color.a*m[3][3];" +
			"gl_FragColor = newColor + uColorMatrixOffset;" +
			"}"
		);
	}
	var p = createjs.extend(ColorMatrixFilter, createjs.Filter);
	p.shaderParamSetup = function (gl, stage, shaderProgram) {
		var mat = this.matrix;
		var colorMatrix = new Float32Array([
			mat[0], mat[1], mat[2], mat[3],
			mat[5], mat[6], mat[7], mat[8],
			mat[10], mat[11], mat[12], mat[13],
			mat[15], mat[16], mat[17], mat[18]
		]);
		gl.uniformMatrix4fv(
			gl.getUniformLocation(shaderProgram, "uColorMatrix"),
			false, colorMatrix
		);
		gl.uniform4f(
			gl.getUniformLocation(shaderProgram, "uColorMatrixOffset"),
			mat[4] / 255, mat[9] / 255, mat[14] / 255, mat[19] / 255
		);
	};
	p.toString = function () {
		return "[ColorMatrixFilter]";
	};
	p.clone = function () {
		return new ColorMatrixFilter(this.matrix);
	};
	p._applyFilter = function (imageData) {
		var data = imageData.data;
		var l = data.length;
		var r, g, b, a;
		var mtx = this.matrix;
		var m0 = mtx[0], m1 = mtx[1], m2 = mtx[2], m3 = mtx[3], m4 = mtx[4];
		var m5 = mtx[5], m6 = mtx[6], m7 = mtx[7], m8 = mtx[8], m9 = mtx[9];
		var m10 = mtx[10], m11 = mtx[11], m12 = mtx[12], m13 = mtx[13], m14 = mtx[14];
		var m15 = mtx[15], m16 = mtx[16], m17 = mtx[17], m18 = mtx[18], m19 = mtx[19];
		for (var i = 0; i < l; i += 4) {
			r = data[i];
			g = data[i + 1];
			b = data[i + 2];
			a = data[i + 3];
			data[i] = r * m0 + g * m1 + b * m2 + a * m3 + m4;
			data[i + 1] = r * m5 + g * m6 + b * m7 + a * m8 + m9;
			data[i + 2] = r * m10 + g * m11 + b * m12 + a * m13 + m14;
			data[i + 3] = r * m15 + g * m16 + b * m17 + a * m18 + m19;
		}
		return true;
	};
	createjs.ColorMatrixFilter = createjs.promote(ColorMatrixFilter, "Filter");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Touch() {
		throw "Touch cannot be instantiated";
	}
	Touch.isSupported = function () {
		return !!(('ontouchstart' in window)
			|| (window.navigator['msPointerEnabled'] && window.navigator['msMaxTouchPoints'] > 0)
			|| (window.navigator['pointerEnabled'] && window.navigator['maxTouchPoints'] > 0));
	};
	Touch.enable = function (stage, singleTouch, allowDefault) {
		if (!stage || !stage.canvas || !Touch.isSupported()) { return false; }
		if (stage.__touch) { return true; }
		stage.__touch = { pointers: {}, multitouch: !singleTouch, preventDefault: !allowDefault, count: 0 };
		if ('ontouchstart' in window) { Touch._IOS_enable(stage); }
		else if (window.navigator['msPointerEnabled'] || window.navigator["pointerEnabled"]) { Touch._IE_enable(stage); }
		return true;
	};
	Touch.disable = function (stage) {
		if (!stage) { return; }
		if ('ontouchstart' in window) { Touch._IOS_disable(stage); }
		else if (window.navigator['msPointerEnabled'] || window.navigator["pointerEnabled"]) { Touch._IE_disable(stage); }
		delete stage.__touch;
	};
	Touch._IOS_enable = function (stage) {
		var canvas = stage.canvas;
		var f = stage.__touch.f = function (e) { Touch._IOS_handleEvent(stage, e); };
		canvas.addEventListener("touchstart", f, false);
		canvas.addEventListener("touchmove", f, false);
		canvas.addEventListener("touchend", f, false);
		canvas.addEventListener("touchcancel", f, false);
	};
	Touch._IOS_disable = function (stage) {
		var canvas = stage.canvas;
		if (!canvas) { return; }
		var f = stage.__touch.f;
		canvas.removeEventListener("touchstart", f, false);
		canvas.removeEventListener("touchmove", f, false);
		canvas.removeEventListener("touchend", f, false);
		canvas.removeEventListener("touchcancel", f, false);
	};
	Touch._IOS_handleEvent = function (stage, e) {
		if (!stage) { return; }
		if (stage.__touch.preventDefault) { e.preventDefault && e.preventDefault(); }
		var touches = e.changedTouches;
		var type = e.type;
		for (var i = 0, l = touches.length; i < l; i++) {
			var touch = touches[i];
			var id = touch.identifier;
			if (touch.target != stage.canvas) { continue; }
			if (type == "touchstart") {
				this._handleStart(stage, id, e, touch.pageX, touch.pageY);
			} else if (type == "touchmove") {
				this._handleMove(stage, id, e, touch.pageX, touch.pageY);
			} else if (type == "touchend" || type == "touchcancel") {
				this._handleEnd(stage, id, e);
			}
		}
	};
	Touch._IE_enable = function (stage) {
		var canvas = stage.canvas;
		var f = stage.__touch.f = function (e) { Touch._IE_handleEvent(stage, e); };
		if (window.navigator["pointerEnabled"] === undefined) {
			canvas.addEventListener("MSPointerDown", f, false);
			window.addEventListener("MSPointerMove", f, false);
			window.addEventListener("MSPointerUp", f, false);
			window.addEventListener("MSPointerCancel", f, false);
			if (stage.__touch.preventDefault) { canvas.style.msTouchAction = "none"; }
		} else {
			canvas.addEventListener("pointerdown", f, false);
			window.addEventListener("pointermove", f, false);
			window.addEventListener("pointerup", f, false);
			window.addEventListener("pointercancel", f, false);
			if (stage.__touch.preventDefault) { canvas.style.touchAction = "none"; }
		}
		stage.__touch.activeIDs = {};
	};
	Touch._IE_disable = function (stage) {
		var f = stage.__touch.f;
		if (window.navigator["pointerEnabled"] === undefined) {
			window.removeEventListener("MSPointerMove", f, false);
			window.removeEventListener("MSPointerUp", f, false);
			window.removeEventListener("MSPointerCancel", f, false);
			if (stage.canvas) {
				stage.canvas.removeEventListener("MSPointerDown", f, false);
			}
		} else {
			window.removeEventListener("pointermove", f, false);
			window.removeEventListener("pointerup", f, false);
			window.removeEventListener("pointercancel", f, false);
			if (stage.canvas) {
				stage.canvas.removeEventListener("pointerdown", f, false);
			}
		}
	};
	Touch._IE_handleEvent = function (stage, e) {
		if (!stage) { return; }
		if (stage.__touch.preventDefault) { e.preventDefault && e.preventDefault(); }
		var type = e.type;
		var id = e.pointerId;
		var ids = stage.__touch.activeIDs;
		if (type == "MSPointerDown" || type == "pointerdown") {
			if (e.srcElement != stage.canvas) { return; }
			ids[id] = true;
			this._handleStart(stage, id, e, e.pageX, e.pageY);
		} else if (ids[id]) {
			if (type == "MSPointerMove" || type == "pointermove") {
				this._handleMove(stage, id, e, e.pageX, e.pageY);
			} else if (type == "MSPointerUp" || type == "MSPointerCancel"
				|| type == "pointerup" || type == "pointercancel") {
				delete (ids[id]);
				this._handleEnd(stage, id, e);
			}
		}
	};
	Touch._handleStart = function (stage, id, e, x, y) {
		var props = stage.__touch;
		if (!props.multitouch && props.count) { return; }
		var ids = props.pointers;
		if (ids[id]) { return; }
		ids[id] = true;
		props.count++;
		stage._handlePointerDown(id, e, x, y);
	};
	Touch._handleMove = function (stage, id, e, x, y) {
		if (!stage.__touch.pointers[id]) { return; }
		stage._handlePointerMove(id, e, x, y);
	};
	Touch._handleEnd = function (stage, id, e) {
		var props = stage.__touch;
		var ids = props.pointers;
		if (!ids[id]) { return; }
		props.count--;
		stage._handlePointerUp(id, e, true);
		delete (ids[id]);
	};
	createjs.Touch = Touch;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	var s = createjs.EaselJS = createjs.EaselJS || {};
	s.version = "NEXT";
	s.buildDate = "Thu, 14 Sep 2017 22:19:48 GMT";
})();
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	var s = createjs.PreloadJS = createjs.PreloadJS || {};
	s.version = "NEXT";
	s.buildDate = "Thu, 14 Sep 2017 22:19:45 GMT";
})();
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	createjs.proxy = function (method, scope) {
		var aArgs = Array.prototype.slice.call(arguments, 2);
		return function () {
			return method.apply(scope, Array.prototype.slice.call(arguments, 0).concat(aArgs));
		};
	}
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function ErrorEvent(title, message, data) {
		this.Event_constructor("error");
		this.title = title;
		this.message = message;
		this.data = data;
	}
	var p = createjs.extend(ErrorEvent, createjs.Event);
	p.clone = function () {
		return new createjs.ErrorEvent(this.title, this.message, this.data);
	};
	createjs.ErrorEvent = createjs.promote(ErrorEvent, "Event");
}());
//##############################################################################
//##############################################################################
(function (scope) {
	"use strict";
	function ProgressEvent(loaded, total) {
		this.Event_constructor("progress");
		this.loaded = loaded;
		this.total = (total == null) ? 1 : total;
		this.progress = (total == 0) ? 0 : this.loaded / this.total;
	};
	var p = createjs.extend(ProgressEvent, createjs.Event);
	p.clone = function () {
		return new createjs.ProgressEvent(this.loaded, this.total);
	};
	createjs.ProgressEvent = createjs.promote(ProgressEvent, "Event");
}(window));
//##############################################################################
//##############################################################################
; (function () {
	var isLoader = typeof define === "function" && define.amd;
	var objectTypes = {
		"function": true,
		"object": true
	};
	var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;
	var root = objectTypes[typeof window] && window || this,
		freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;
	if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
		root = freeGlobal;
	}
	function runInContext(context, exports) {
		context || (context = root["Object"]());
		exports || (exports = root["Object"]());
		var Number = context["Number"] || root["Number"],
			String = context["String"] || root["String"],
			Object = context["Object"] || root["Object"],
			Date = context["Date"] || root["Date"],
			SyntaxError = context["SyntaxError"] || root["SyntaxError"],
			TypeError = context["TypeError"] || root["TypeError"],
			Math = context["Math"] || root["Math"],
			nativeJSON = context["JSON"] || root["JSON"];
		if (typeof nativeJSON == "object" && nativeJSON) {
			exports.stringify = nativeJSON.stringify;
			exports.parse = nativeJSON.parse;
		}
		var objectProto = Object.prototype,
			getClass = objectProto.toString,
			isProperty, forEach, undef;
		var isExtended = new Date(-3509827334573292);
		try {
			isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
				isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
		} catch (exception) { }
		function has(name) {
			if (has[name] !== undef) {
				return has[name];
			}
			var isSupported;
			if (name == "bug-string-char-index") {
				isSupported = "a"[0] != "a";
			} else if (name == "json") {
				isSupported = has("json-stringify") && has("json-parse");
			} else {
				var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
				if (name == "json-stringify") {
					var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
					if (stringifySupported) {
						(value = function () {
							return 1;
						}).toJSON = value;
						try {
							stringifySupported =
								stringify(0) === "0" &&
								stringify(new Number()) === "0" &&
								stringify(new String()) == '""' &&
								stringify(getClass) === undef &&
								stringify(undef) === undef &&
								stringify() === undef &&
								stringify(value) === "1" &&
								stringify([value]) == "[1]" &&
								stringify([undef]) == "[null]" &&
								stringify(null) == "null" &&
								stringify([undef, getClass, null]) == "[null,null,null]" &&
								stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
								stringify(null, value) === "1" &&
								stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
								stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
								stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
								stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
								stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
						} catch (exception) {
							stringifySupported = false;
						}
					}
					isSupported = stringifySupported;
				}
				if (name == "json-parse") {
					var parse = exports.parse;
					if (typeof parse == "function") {
						try {
							if (parse("0") === 0 && !parse(false)) {
								value = parse(serialized);
								var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
								if (parseSupported) {
									try {
										parseSupported = !parse('"\t"');
									} catch (exception) { }
									if (parseSupported) {
										try {
											parseSupported = parse("01") !== 1;
										} catch (exception) { }
									}
									if (parseSupported) {
										try {
											parseSupported = parse("1.") !== 1;
										} catch (exception) { }
									}
								}
							}
						} catch (exception) {
							parseSupported = false;
						}
					}
					isSupported = parseSupported;
				}
			}
			return has[name] = !!isSupported;
		}
		if (!has("json")) {
			var functionClass = "[object Function]",
				dateClass = "[object Date]",
				numberClass = "[object Number]",
				stringClass = "[object String]",
				arrayClass = "[object Array]",
				booleanClass = "[object Boolean]";
			var charIndexBuggy = has("bug-string-char-index");
			if (!isExtended) {
				var floor = Math.floor;
				var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
				var getDay = function (year, month) {
					return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
				};
			}
			if (!(isProperty = objectProto.hasOwnProperty)) {
				isProperty = function (property) {
					var members = {}, constructor;
					if ((members.__proto__ = null, members.__proto__ = {
						"toString": 1
					}, members).toString != getClass) {
						isProperty = function (property) {
							var original = this.__proto__, result = property in (this.__proto__ = null, this);
							this.__proto__ = original;
							return result;
						};
					} else {
						constructor = members.constructor;
						isProperty = function (property) {
							var parent = (this.constructor || constructor).prototype;
							return property in this && !(property in parent && this[property] === parent[property]);
						};
					}
					members = null;
					return isProperty.call(this, property);
				};
			}
			forEach = function (object, callback) {
				var size = 0, Properties, members, property;
				(Properties = function () {
					this.valueOf = 0;
				}).prototype.valueOf = 0;
				members = new Properties();
				for (property in members) {
					if (isProperty.call(members, property)) {
						size++;
					}
				}
				Properties = members = null;
				if (!size) {
					members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
					forEach = function (object, callback) {
						var isFunction = getClass.call(object) == functionClass, property, length;
						var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
						for (property in object) {
							if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
								callback(property);
							}
						}
						for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
					};
				} else if (size == 2) {
					forEach = function (object, callback) {
						var members = {}, isFunction = getClass.call(object) == functionClass, property;
						for (property in object) {
							if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
								callback(property);
							}
						}
					};
				} else {
					forEach = function (object, callback) {
						var isFunction = getClass.call(object) == functionClass, property, isConstructor;
						for (property in object) {
							if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
								callback(property);
							}
						}
						if (isConstructor || isProperty.call(object, (property = "constructor"))) {
							callback(property);
						}
					};
				}
				return forEach(object, callback);
			};
			if (!has("json-stringify")) {
				var Escapes = {
					92: "\\\\",
					34: '\\"',
					8: "\\b",
					12: "\\f",
					10: "\\n",
					13: "\\r",
					9: "\\t"
				};
				var leadingZeroes = "000000";
				var toPaddedString = function (width, value) {
					return (leadingZeroes + (value || 0)).slice(-width);
				};
				var unicodePrefix = "\\u00";
				var quote = function (value) {
					var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
					var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
					for (; index < length; index++) {
						var charCode = value.charCodeAt(index);
						switch (charCode) {
							case 8: case 9: case 10: case 12: case 13: case 34: case 92:
								result += Escapes[charCode];
								break;
							default:
								if (charCode < 32) {
									result += unicodePrefix + toPaddedString(2, charCode.toString(16));
									break;
								}
								result += useCharIndex ? symbols[index] : value.charAt(index);
						}
					}
					return result + '"';
				};
				var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
					var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;
					try {
						value = object[property];
					} catch (exception) { }
					if (typeof value == "object" && value) {
						className = getClass.call(value);
						if (className == dateClass && !isProperty.call(value, "toJSON")) {
							if (value > -1 / 0 && value < 1 / 0) {
								if (getDay) {
									date = floor(value / 864e5);
									for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
									for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
									date = 1 + date - getDay(year, month);
									time = (value % 864e5 + 864e5) % 864e5;
									hours = floor(time / 36e5) % 24;
									minutes = floor(time / 6e4) % 60;
									seconds = floor(time / 1e3) % 60;
									milliseconds = time % 1e3;
								} else {
									year = value.getUTCFullYear();
									month = value.getUTCMonth();
									date = value.getUTCDate();
									hours = value.getUTCHours();
									minutes = value.getUTCMinutes();
									seconds = value.getUTCSeconds();
									milliseconds = value.getUTCMilliseconds();
								}
								value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
									"-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
									"T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
									"." + toPaddedString(3, milliseconds) + "Z";
							} else {
								value = null;
							}
						} else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
							value = value.toJSON(property);
						}
					}
					if (callback) {
						value = callback.call(object, property, value);
					}
					if (value === null) {
						return "null";
					}
					className = getClass.call(value);
					if (className == booleanClass) {
						return "" + value;
					} else if (className == numberClass) {
						return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
					} else if (className == stringClass) {
						return quote("" + value);
					}
					if (typeof value == "object") {
						for (length = stack.length; length--;) {
							if (stack[length] === value) {
								throw TypeError();
							}
						}
						stack.push(value);
						results = [];
						prefix = indentation;
						indentation += whitespace;
						if (className == arrayClass) {
							for (index = 0, length = value.length; index < length; index++) {
								element = serialize(index, value, callback, properties, whitespace, indentation, stack);
								results.push(element === undef ? "null" : element);
							}
							result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
						} else {
							forEach(properties || value, function (property) {
								var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
								if (element !== undef) {
									results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
								}
							});
							result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
						}
						stack.pop();
						return result;
					}
				};
				exports.stringify = function (source, filter, width) {
					var whitespace, callback, properties, className;
					if (objectTypes[typeof filter] && filter) {
						if ((className = getClass.call(filter)) == functionClass) {
							callback = filter;
						} else if (className == arrayClass) {
							properties = {};
							for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
						}
					}
					if (width) {
						if ((className = getClass.call(width)) == numberClass) {
							if ((width -= width % 1) > 0) {
								for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
							}
						} else if (className == stringClass) {
							whitespace = width.length <= 10 ? width : width.slice(0, 10);
						}
					}
					return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
				};
			}
			if (!has("json-parse")) {
				var fromCharCode = String.fromCharCode;
				var Unescapes = {
					92: "\\",
					34: '"',
					47: "/",
					98: "\b",
					116: "\t",
					110: "\n",
					102: "\f",
					114: "\r"
				};
				var Index, Source;
				var abort = function () {
					Index = Source = null;
					throw SyntaxError();
				};
				var lex = function () {
					var source = Source, length = source.length, value, begin, position, isSigned, charCode;
					while (Index < length) {
						charCode = source.charCodeAt(Index);
						switch (charCode) {
							case 9: case 10: case 13: case 32:
								Index++;
								break;
							case 123: case 125: case 91: case 93: case 58: case 44:
								value = charIndexBuggy ? source.charAt(Index) : source[Index];
								Index++;
								return value;
							case 34:
								for (value = "@", Index++; Index < length;) {
									charCode = source.charCodeAt(Index);
									if (charCode < 32) {
										abort();
									} else if (charCode == 92) {
										charCode = source.charCodeAt(++Index);
										switch (charCode) {
											case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
												value += Unescapes[charCode];
												Index++;
												break;
											case 117:
												begin = ++Index;
												for (position = Index + 4; Index < position; Index++) {
													charCode = source.charCodeAt(Index);
													if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
														abort();
													}
												}
												value += fromCharCode("0x" + source.slice(begin, Index));
												break;
											default:
												abort();
										}
									} else {
										if (charCode == 34) {
											break;
										}
										charCode = source.charCodeAt(Index);
										begin = Index;
										while (charCode >= 32 && charCode != 92 && charCode != 34) {
											charCode = source.charCodeAt(++Index);
										}
										value += source.slice(begin, Index);
									}
								}
								if (source.charCodeAt(Index) == 34) {
									Index++;
									return value;
								}
								abort();
							default:
								begin = Index;
								if (charCode == 45) {
									isSigned = true;
									charCode = source.charCodeAt(++Index);
								}
								if (charCode >= 48 && charCode <= 57) {
									if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
										abort();
									}
									isSigned = false;
									for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
									if (source.charCodeAt(Index) == 46) {
										position = ++Index;
										for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
										if (position == Index) {
											abort();
										}
										Index = position;
									}
									charCode = source.charCodeAt(Index);
									if (charCode == 101 || charCode == 69) {
										charCode = source.charCodeAt(++Index);
										if (charCode == 43 || charCode == 45) {
											Index++;
										}
										for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
										if (position == Index) {
											abort();
										}
										Index = position;
									}
									return +source.slice(begin, Index);
								}
								if (isSigned) {
									abort();
								}
								if (source.slice(Index, Index + 4) == "true") {
									Index += 4;
									return true;
								} else if (source.slice(Index, Index + 5) == "false") {
									Index += 5;
									return false;
								} else if (source.slice(Index, Index + 4) == "null") {
									Index += 4;
									return null;
								}
								abort();
						}
					}
					return "$";
				};
				var get = function (value) {
					var results, hasMembers;
					if (value == "$") {
						abort();
					}
					if (typeof value == "string") {
						if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
							return value.slice(1);
						}
						if (value == "[") {
							results = [];
							for (; ; hasMembers || (hasMembers = true)) {
								value = lex();
								if (value == "]") {
									break;
								}
								if (hasMembers) {
									if (value == ",") {
										value = lex();
										if (value == "]") {
											abort();
										}
									} else {
										abort();
									}
								}
								if (value == ",") {
									abort();
								}
								results.push(get(value));
							}
							return results;
						} else if (value == "{") {
							results = {};
							for (; ; hasMembers || (hasMembers = true)) {
								value = lex();
								if (value == "}") {
									break;
								}
								if (hasMembers) {
									if (value == ",") {
										value = lex();
										if (value == "}") {
											abort();
										}
									} else {
										abort();
									}
								}
								if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
									abort();
								}
								results[value.slice(1)] = get(lex());
							}
							return results;
						}
						abort();
					}
					return value;
				};
				var update = function (source, property, callback) {
					var element = walk(source, property, callback);
					if (element === undef) {
						delete source[property];
					} else {
						source[property] = element;
					}
				};
				var walk = function (source, property, callback) {
					var value = source[property], length;
					if (typeof value == "object" && value) {
						if (getClass.call(value) == arrayClass) {
							for (length = value.length; length--;) {
								update(value, length, callback);
							}
						} else {
							forEach(value, function (property) {
								update(value, property, callback);
							});
						}
					}
					return callback.call(source, property, value);
				};
				exports.parse = function (source, callback) {
					var result, value;
					Index = 0;
					Source = "" + source;
					result = get(lex());
					if (lex() != "$") {
						abort();
					}
					Index = Source = null;
					return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
				};
			}
		}
		exports["runInContext"] = runInContext;
		return exports;
	}
	if (freeExports && !isLoader) {
		runInContext(root, freeExports);
	} else {
		var nativeJSON = root.JSON,
			previousJSON = root["JSON3"],
			isRestored = false;
		var JSON3 = runInContext(root, (root["JSON3"] = {
			"noConflict": function () {
				if (!isRestored) {
					isRestored = true;
					root.JSON = nativeJSON;
					root["JSON3"] = previousJSON;
					nativeJSON = previousJSON = null;
				}
				return JSON3;
			}
		}));
		root.JSON = {
			"parse": JSON3.parse,
			"stringify": JSON3.stringify
		};
	}
	if (isLoader) {
		define(function () {
			return JSON3;
		});
	}
}).call(this);
//##############################################################################
//##############################################################################
(function () {
	var s = {};
	s.a = function () {
		return s.el("a");
	}
	s.svg = function () {
		return s.el("svg");
	}
	s.object = function () {
		return s.el("object");
	}
	s.image = function () {
		return s.el("image");
	}
	s.img = function () {
		return s.el("img");
	}
	s.style = function () {
		return s.el("style");
	}
	s.link = function () {
		return s.el("link");
	}
	s.script = function () {
		return s.el("script");
	}
	s.audio = function () {
		return s.el("audio");
	}
	s.video = function () {
		return s.el("video");
	}
	s.text = function (value) {
		return document.createTextNode(value);
	}
	s.el = function (name) {
		return document.createElement(name);
	}
	createjs.Elements = s;
}());
//##############################################################################
//##############################################################################
(function () {
	var s = {};
	s.ABSOLUTE_PATT = /^(?:\w+:)?\/{2}/i;
	s.RELATIVE_PATT = (/^[./]*?\//i);
	s.EXTENSION_PATT = /\/?[^/]+\.(\w{1,5})$/i;
	s.parseURI = function (path) {
		var info = {
			absolute: false,
			relative: false,
			protocol: null,
			hostname: null,
			port: null,
			pathname: null,
			search: null,
			hash: null,
			host: null
		};
		if (path == null) { return info; }
		var parser = createjs.Elements.a();
		parser.href = path;
		for (var n in info) {
			if (n in parser) {
				info[n] = parser[n];
			}
		}
		var queryIndex = path.indexOf("?");
		if (queryIndex > -1) {
			path = path.substr(0, queryIndex);
		}
		var match;
		if (s.ABSOLUTE_PATT.test(path)) {
			info.absolute = true;
		} else if (s.RELATIVE_PATT.test(path)) {
			info.relative = true;
		}
		if (match = path.match(s.EXTENSION_PATT)) {
			info.extension = match[1].toLowerCase();
		}
		return info;
	};
	s.formatQueryString = function (data, query) {
		if (data == null) {
			throw new Error("You must specify data.");
		}
		var params = [];
		for (var n in data) {
			params.push(n + "=" + escape(data[n]));
		}
		if (query) {
			params = params.concat(query);
		}
		return params.join("&");
	};
	s.buildURI = function (src, data) {
		if (data == null) {
			return src;
		}
		var query = [];
		var idx = src.indexOf("?");
		if (idx != -1) {
			var q = src.slice(idx + 1);
			query = query.concat(q.split("&"));
		}
		if (idx != -1) {
			return src.slice(0, idx) + "?" + this.formatQueryString(data, query);
		} else {
			return src + "?" + this.formatQueryString(data, query);
		}
	};
	s.isCrossDomain = function (item) {
		var target = createjs.Elements.a();
		target.href = item.src;
		var host = createjs.Elements.a();
		host.href = location.href;
		var crossdomain = (target.hostname != "") &&
			(target.port != host.port ||
				target.protocol != host.protocol ||
				target.hostname != host.hostname);
		return crossdomain;
	};
	s.isLocal = function (item) {
		var target = createjs.Elements.a();
		target.href = item.src;
		return target.hostname == "" && target.protocol == "file:";
	};
	createjs.URLUtils = s;
}());
//##############################################################################
//##############################################################################
(function () {
	var s = {
		container: null
	};
	s.appendToHead = function (el) {
		s.getHead().appendChild(el);
	}
	s.appendToBody = function (el) {
		if (s.container == null) {
			s.container = document.createElement("div");
			s.container.id = "preloadjs-container";
			var style = s.container.style;
			style.visibility = "hidden";
			style.position = "absolute";
			style.width = s.container.style.height = "10px";
			style.overflow = "hidden";
			style.transform = style.msTransform = style.webkitTransform = style.oTransform = "translate(-10px, -10px)"; //LM: Not working
			s.getBody().appendChild(s.container);
		}
		s.container.appendChild(el);
	}
	s.getHead = function () {
		return document.head || document.getElementsByTagName("head")[0];
	}
	s.getBody = function () {
		return document.body || document.getElementsByTagName("body")[0];
	}
	s.removeChild = function (el) {
		if (el.parent) {
			el.parent.removeChild(el);
		}
	}
	s.isImageTag = function (item) {
		return item instanceof HTMLImageElement;
	};
	s.isAudioTag = function (item) {
		if (window.HTMLAudioElement) {
			return item instanceof HTMLAudioElement;
		} else {
			return false;
		}
	};
	s.isVideoTag = function (item) {
		if (window.HTMLVideoElement) {
			return item instanceof HTMLVideoElement;
		} else {
			return false;
		}
	};
	createjs.DomUtils = s;
}());
//##############################################################################
//##############################################################################
(function () {
	var s = {};
	s.parseXML = function (text) {
		var xml = null;
		try {
			if (window.DOMParser) {
				var parser = new DOMParser();
				xml = parser.parseFromString(text, "text/xml");
			}
		} catch (e) {
		}
		if (!xml) {
			try {
				xml = new ActiveXObject("Microsoft.XMLDOM");
				xml.async = false;
				xml.loadXML(text);
			} catch (e) {
				xml = null;
			}
		}
		return xml;
	};
	s.parseJSON = function (value) {
		if (value == null) {
			return null;
		}
		try {
			return JSON.parse(value);
		} catch (e) {
			throw e;
		}
	};
	createjs.DataUtils = s;
}());
//##############################################################################
//##############################################################################
(function () {
	var s = {};
	s.BINARY = "binary";
	s.CSS = "css";
	s.FONT = "font";
	s.FONTCSS = "fontcss";
	s.IMAGE = "image";
	s.JAVASCRIPT = "javascript";
	s.JSON = "json";
	s.JSONP = "jsonp";
	s.MANIFEST = "manifest";
	s.SOUND = "sound";
	s.VIDEO = "video";
	s.SPRITESHEET = "spritesheet";
	s.SVG = "svg";
	s.TEXT = "text";
	s.XML = "xml";
	createjs.Types = s;
}());
//##############################################################################
//##############################################################################
(function () {
	var s = {};
	s.POST = "POST";
	s.GET = "GET";
	createjs.Methods = s;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function LoadItem() {
		this.src = null;
		this.type = null;
		this.id = null;
		this.maintainOrder = false;
		this.callback = null;
		this.data = null;
		this.method = createjs.Methods.GET;
		this.values = null;
		this.headers = null;
		this.withCredentials = false;
		this.mimeType = null;
		this.crossOrigin = null;
		this.loadTimeout = s.LOAD_TIMEOUT_DEFAULT;
	};
	var p = LoadItem.prototype = {};
	var s = LoadItem;
	s.LOAD_TIMEOUT_DEFAULT = 8000;
	s.create = function (value) {
		if (typeof value == "string") {
			var item = new LoadItem();
			item.src = value;
			return item;
		} else if (value instanceof s) {
			return value;
		} else if (value instanceof Object && value.src) {
			if (value.loadTimeout == null) {
				value.loadTimeout = s.LOAD_TIMEOUT_DEFAULT;
			}
			value.src = value.src.replace("../", "./");
			return value;
		} else {
			throw new Error("Type not recognized.");
		}
	};
	p.set = function (props) {
		for (var n in props) { this[n] = props[n]; }
		return this;
	};
	createjs.LoadItem = s;
}());
//##############################################################################
//##############################################################################
(function () {
	var s = {};
	s.isBinary = function (type) {
		switch (type) {
			case createjs.Types.IMAGE:
			case createjs.Types.BINARY:
				return true;
			default:
				return false;
		}
	};
	s.isText = function (type) {
		switch (type) {
			case createjs.Types.TEXT:
			case createjs.Types.JSON:
			case createjs.Types.MANIFEST:
			case createjs.Types.XML:
			case createjs.Types.CSS:
			case createjs.Types.SVG:
			case createjs.Types.JAVASCRIPT:
			case createjs.Types.SPRITESHEET:
				return true;
			default:
				return false;
		}
	};
	s.getTypeByExtension = function (extension) {
		if (extension == null) {
			return createjs.Types.TEXT;
		}
		switch (extension.toLowerCase()) {
			case "jpeg":
			case "jpg":
			case "gif":
			case "png":
			case "webp":
			case "bmp":
				return createjs.Types.IMAGE;
			case "ogg":
			case "mp3":
			case "webm":
				return createjs.Types.SOUND;
			case "mp4":
			case "webm":
			case "ts":
				return createjs.Types.VIDEO;
			case "json":
				return createjs.Types.JSON;
			case "xml":
				return createjs.Types.XML;
			case "css":
				return createjs.Types.CSS;
			case "js":
				return createjs.Types.JAVASCRIPT;
			case 'svg':
				return createjs.Types.SVG;
			default:
				return createjs.Types.TEXT;
		}
	};
	createjs.RequestUtils = s;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function AbstractLoader(loadItem, preferXHR, type) {
		this.EventDispatcher_constructor();
		this.loaded = false;
		this.canceled = false;
		this.progress = 0;
		this.type = type;
		this.resultFormatter = null;
		if (loadItem) {
			this._item = createjs.LoadItem.create(loadItem);
		} else {
			this._item = null;
		}
		this._preferXHR = preferXHR;
		this._result = null;
		this._rawResult = null;
		this._loadedItems = null;
		this._tagSrcAttribute = null;
		this._tag = null;
	};
	var p = createjs.extend(AbstractLoader, createjs.EventDispatcher);
	var s = AbstractLoader;
	try {
		Object.defineProperties(s, {
			POST: { get: createjs.deprecate(function () { return createjs.Methods.POST; }, "AbstractLoader.POST") },
			GET: { get: createjs.deprecate(function () { return createjs.Methods.GET; }, "AbstractLoader.GET") },
			BINARY: { get: createjs.deprecate(function () { return createjs.Types.BINARY; }, "AbstractLoader.BINARY") },
			CSS: { get: createjs.deprecate(function () { return createjs.Types.CSS; }, "AbstractLoader.CSS") },
			FONT: { get: createjs.deprecate(function () { return createjs.Types.FONT; }, "AbstractLoader.FONT") },
			FONTCSS: { get: createjs.deprecate(function () { return createjs.Types.FONTCSS; }, "AbstractLoader.FONTCSS") },
			IMAGE: { get: createjs.deprecate(function () { return createjs.Types.IMAGE; }, "AbstractLoader.IMAGE") },
			JAVASCRIPT: { get: createjs.deprecate(function () { return createjs.Types.JAVASCRIPT; }, "AbstractLoader.JAVASCRIPT") },
			JSON: { get: createjs.deprecate(function () { return createjs.Types.JSON; }, "AbstractLoader.JSON") },
			JSONP: { get: createjs.deprecate(function () { return createjs.Types.JSONP; }, "AbstractLoader.JSONP") },
			MANIFEST: { get: createjs.deprecate(function () { return createjs.Types.MANIFEST; }, "AbstractLoader.MANIFEST") },
			SOUND: { get: createjs.deprecate(function () { return createjs.Types.SOUND; }, "AbstractLoader.SOUND") },
			VIDEO: { get: createjs.deprecate(function () { return createjs.Types.VIDEO; }, "AbstractLoader.VIDEO") },
			SPRITESHEET: { get: createjs.deprecate(function () { return createjs.Types.SPRITESHEET; }, "AbstractLoader.SPRITESHEET") },
			SVG: { get: createjs.deprecate(function () { return createjs.Types.SVG; }, "AbstractLoader.SVG") },
			TEXT: { get: createjs.deprecate(function () { return createjs.Types.TEXT; }, "AbstractLoader.TEXT") },
			XML: { get: createjs.deprecate(function () { return createjs.Types.XML; }, "AbstractLoader.XML") }
		});
	} catch (e) { }
	p.getItem = function () {
		return this._item;
	};
	p.getResult = function (raw) {
		return raw ? this._rawResult : this._result;
	};
	p.getTag = function () {
		return this._tag;
	};
	p.setTag = function (tag) {
		this._tag = tag;
	};
	p.load = function () {
		this._createRequest();
		this._request.on("complete", this, this);
		this._request.on("progress", this, this);
		this._request.on("loadStart", this, this);
		this._request.on("abort", this, this);
		this._request.on("timeout", this, this);
		this._request.on("error", this, this);
		var evt = new createjs.Event("initialize");
		evt.loader = this._request;
		this.dispatchEvent(evt);
		this._request.load();
	};
	p.cancel = function () {
		this.canceled = true;
		this.destroy();
	};
	p.destroy = function () {
		if (this._request) {
			this._request.removeAllEventListeners();
			this._request.destroy();
		}
		this._request = null;
		this._item = null;
		this._rawResult = null;
		this._result = null;
		this._loadItems = null;
		this.removeAllEventListeners();
	};
	p.getLoadedItems = function () {
		return this._loadedItems;
	};
	p._createRequest = function () {
		if (!this._preferXHR) {
			this._request = new createjs.TagRequest(this._item, this._tag || this._createTag(), this._tagSrcAttribute);
		} else {
			this._request = new createjs.XHRRequest(this._item);
		}
	};
	p._createTag = function (src) { return null; };
	p._sendLoadStart = function () {
		if (this._isCanceled()) { return; }
		this.dispatchEvent("loadstart");
	};
	p._sendProgress = function (value) {
		if (this._isCanceled()) { return; }
		var event = null;
		if (typeof (value) == "number") {
			this.progress = value;
			event = new createjs.ProgressEvent(this.progress);
		} else {
			event = value;
			this.progress = value.loaded / value.total;
			event.progress = this.progress;
			if (isNaN(this.progress) || this.progress == Infinity) { this.progress = 0; }
		}
		this.hasEventListener("progress") && this.dispatchEvent(event);
	};
	p._sendComplete = function () {
		if (this._isCanceled()) { return; }
		this.loaded = true;
		var event = new createjs.Event("complete");
		event.rawResult = this._rawResult;
		if (this._result != null) {
			event.result = this._result;
		}
		this.dispatchEvent(event);
	};
	p._sendError = function (event) {
		if (this._isCanceled() || !this.hasEventListener("error")) { return; }
		if (event == null) {
			event = new createjs.ErrorEvent("PRELOAD_ERROR_EMPTY");
		}
		this.dispatchEvent(event);
	};
	p._isCanceled = function () {
		if (window.createjs == null || this.canceled) {
			return true;
		}
		return false;
	};
	p.resultFormatter = null;
	p.handleEvent = function (event) {
		switch (event.type) {
			case "complete":
				this._rawResult = event.target._response;
				var result = this.resultFormatter && this.resultFormatter(this);
				if (result instanceof Function) {
					result.call(this,
						createjs.proxy(this._resultFormatSuccess, this),
						createjs.proxy(this._resultFormatFailed, this)
					);
				} else {
					this._result = result || this._rawResult;
					this._sendComplete();
				}
				break;
			case "progress":
				this._sendProgress(event);
				break;
			case "error":
				this._sendError(event);
				break;
			case "loadstart":
				this._sendLoadStart();
				break;
			case "abort":
			case "timeout":
				if (!this._isCanceled()) {
					this.dispatchEvent(new createjs.ErrorEvent("PRELOAD_" + event.type.toUpperCase() + "_ERROR"));
				}
				break;
		}
	};
	p._resultFormatSuccess = function (result) {
		this._result = result;
		this._sendComplete();
	};
	p._resultFormatFailed = function (event) {
		this._sendError(event);
	};
	p.toString = function () {
		return "[PreloadJS AbstractLoader]";
	};
	createjs.AbstractLoader = createjs.promote(AbstractLoader, "EventDispatcher");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function AbstractMediaLoader(loadItem, preferXHR, type) {
		this.AbstractLoader_constructor(loadItem, preferXHR, type);
		this.resultFormatter = this._formatResult;
		this._tagSrcAttribute = "src";
		this.on("initialize", this._updateXHR, this);
	};
	var p = createjs.extend(AbstractMediaLoader, createjs.AbstractLoader);
	p.load = function () {
		if (!this._tag) {
			this._tag = this._createTag(this._item.src);
		}
		this._tag.preload = "auto";
		this._tag.load();
		this.AbstractLoader_load();
	};
	p._createTag = function () { };
	p._createRequest = function () {
		if (!this._preferXHR) {
			this._request = new createjs.MediaTagRequest(this._item, this._tag || this._createTag(), this._tagSrcAttribute);
		} else {
			this._request = new createjs.XHRRequest(this._item);
		}
	};
	p._updateXHR = function (event) {
		if (event.loader.setResponseType) {
			event.loader.setResponseType("blob");
		}
	};
	p._formatResult = function (loader) {
		this._tag.removeEventListener && this._tag.removeEventListener("canplaythrough", this._loadedHandler);
		this._tag.onstalled = null;
		if (this._preferXHR) {
			var URL = window.URL || window.webkitURL;
			var result = loader.getResult(true);
			loader.getTag().src = URL.createObjectURL(result);
		}
		return loader.getTag();
	};
	createjs.AbstractMediaLoader = createjs.promote(AbstractMediaLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	var AbstractRequest = function (item) {
		this._item = item;
	};
	var p = createjs.extend(AbstractRequest, createjs.EventDispatcher);
	p.load = function () { };
	p.destroy = function () { };
	p.cancel = function () { };
	createjs.AbstractRequest = createjs.promote(AbstractRequest, "EventDispatcher");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function TagRequest(loadItem, tag, srcAttribute) {
		this.AbstractRequest_constructor(loadItem);
		this._tag = tag;
		this._tagSrcAttribute = srcAttribute;
		this._loadedHandler = createjs.proxy(this._handleTagComplete, this);
		this._addedToDOM = false;
	};
	var p = createjs.extend(TagRequest, createjs.AbstractRequest);
	p.load = function () {
		this._tag.onload = createjs.proxy(this._handleTagComplete, this);
		this._tag.onreadystatechange = createjs.proxy(this._handleReadyStateChange, this);
		this._tag.onerror = createjs.proxy(this._handleError, this);
		var evt = new createjs.Event("initialize");
		evt.loader = this._tag;
		this.dispatchEvent(evt);
		this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), this._item.loadTimeout);
		this._tag[this._tagSrcAttribute] = this._item.src;
		if (this._tag.parentNode == null) {
			createjs.DomUtils.appendToBody(this._tag);
			this._addedToDOM = true;
		}
	};
	p.destroy = function () {
		this._clean();
		this._tag = null;
		this.AbstractRequest_destroy();
	};
	p._handleReadyStateChange = function () {
		clearTimeout(this._loadTimeout);
		var tag = this._tag;
		if (tag.readyState == "loaded" || tag.readyState == "complete") {
			this._handleTagComplete();
		}
	};
	p._handleError = function () {
		this._clean();
		this.dispatchEvent("error");
	};
	p._handleTagComplete = function () {
		this._rawResult = this._tag;
		this._result = this.resultFormatter && this.resultFormatter(this) || this._rawResult;
		this._clean();
		this.dispatchEvent("complete");
	};
	p._handleTimeout = function () {
		this._clean();
		this.dispatchEvent(new createjs.Event("timeout"));
	};
	p._clean = function () {
		this._tag.onload = null;
		this._tag.onreadystatechange = null;
		this._tag.onerror = null;
		if (this._addedToDOM && this._tag.parentNode != null) {
			this._tag.parentNode.removeChild(this._tag);
		}
		clearTimeout(this._loadTimeout);
	};
	p._handleStalled = function () {
		//Ignore, let the timeout take care of it. Sometimes its not really stopped.
	};
	createjs.TagRequest = createjs.promote(TagRequest, "AbstractRequest");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function MediaTagRequest(loadItem, tag, srcAttribute) {
		this.AbstractRequest_constructor(loadItem);
		this._tag = tag;
		this._tagSrcAttribute = srcAttribute;
		this._loadedHandler = createjs.proxy(this._handleTagComplete, this);
	};
	var p = createjs.extend(MediaTagRequest, createjs.TagRequest);
	var s = MediaTagRequest;
	p.load = function () {
		var sc = createjs.proxy(this._handleStalled, this);
		this._stalledCallback = sc;
		var pc = createjs.proxy(this._handleProgress, this);
		this._handleProgress = pc;
		this._tag.addEventListener("stalled", sc);
		this._tag.addEventListener("progress", pc);
		this._tag.addEventListener && this._tag.addEventListener("canplaythrough", this._loadedHandler, false);
		this.TagRequest_load();
	};
	p._handleReadyStateChange = function () {
		clearTimeout(this._loadTimeout);
		var tag = this._tag;
		if (tag.readyState == "loaded" || tag.readyState == "complete") {
			this._handleTagComplete();
		}
	};
	p._handleStalled = function () {
		//Ignore, let the timeout take care of it. Sometimes its not really stopped.
	};
	p._handleProgress = function (event) {
		if (!event || event.loaded > 0 && event.total == 0) {
			return;
		}
		var newEvent = new createjs.ProgressEvent(event.loaded, event.total);
		this.dispatchEvent(newEvent);
	};
	p._clean = function () {
		this._tag.removeEventListener && this._tag.removeEventListener("canplaythrough", this._loadedHandler);
		this._tag.removeEventListener("stalled", this._stalledCallback);
		this._tag.removeEventListener("progress", this._progressCallback);
		this.TagRequest__clean();
	};
	createjs.MediaTagRequest = createjs.promote(MediaTagRequest, "TagRequest");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function XHRRequest(item) {
		this.AbstractRequest_constructor(item);
		this._request = null;
		this._loadTimeout = null;
		this._xhrLevel = 1;
		this._response = null;
		this._rawResponse = null;
		this._canceled = false;
		this._handleLoadStartProxy = createjs.proxy(this._handleLoadStart, this);
		this._handleProgressProxy = createjs.proxy(this._handleProgress, this);
		this._handleAbortProxy = createjs.proxy(this._handleAbort, this);
		this._handleErrorProxy = createjs.proxy(this._handleError, this);
		this._handleTimeoutProxy = createjs.proxy(this._handleTimeout, this);
		this._handleLoadProxy = createjs.proxy(this._handleLoad, this);
		this._handleReadyStateChangeProxy = createjs.proxy(this._handleReadyStateChange, this);
		if (!this._createXHR(item)) {
			//TODO: Throw error?
		}
	};
	var p = createjs.extend(XHRRequest, createjs.AbstractRequest);
	XHRRequest.ACTIVEX_VERSIONS = [
		"Msxml2.XMLHTTP.6.0",
		"Msxml2.XMLHTTP.5.0",
		"Msxml2.XMLHTTP.4.0",
		"MSXML2.XMLHTTP.3.0",
		"MSXML2.XMLHTTP",
		"Microsoft.XMLHTTP"
	];
	p.getResult = function (raw) {
		if (raw && this._rawResponse) {
			return this._rawResponse;
		}
		return this._response;
	};
	p.cancel = function () {
		this.canceled = true;
		this._clean();
		this._request.abort();
	};
	p.load = function () {
		if (this._request == null) {
			this._handleError();
			return;
		}
		//Events
		if (this._request.addEventListener != null) {
			this._request.addEventListener("loadstart", this._handleLoadStartProxy, false);
			this._request.addEventListener("progress", this._handleProgressProxy, false);
			this._request.addEventListener("abort", this._handleAbortProxy, false);
			this._request.addEventListener("error", this._handleErrorProxy, false);
			this._request.addEventListener("timeout", this._handleTimeoutProxy, false);
			this._request.addEventListener("load", this._handleLoadProxy, false);
			this._request.addEventListener("readystatechange", this._handleReadyStateChangeProxy, false);
		} else {
			this._request.onloadstart = this._handleLoadStartProxy;
			this._request.onprogress = this._handleProgressProxy;
			this._request.onabort = this._handleAbortProxy;
			this._request.onerror = this._handleErrorProxy;
			this._request.ontimeout = this._handleTimeoutProxy;
			this._request.onload = this._handleLoadProxy;
			this._request.onreadystatechange = this._handleReadyStateChangeProxy;
		}
		if (this._xhrLevel == 1) {
			this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), this._item.loadTimeout);
		}
		try {
			if (!this._item.values) {
				this._request.send();
			} else {
				this._request.send(createjs.URLUtils.formatQueryString(this._item.values));
			}
		} catch (error) {
			this.dispatchEvent(new createjs.ErrorEvent("XHR_SEND", null, error));
		}
	};
	p.setResponseType = function (type) {
		if (type === 'blob') {
			type = window.URL ? 'blob' : 'arraybuffer';
			this._responseType = type;
		}
		this._request.responseType = type;
	};
	p.getAllResponseHeaders = function () {
		if (this._request.getAllResponseHeaders instanceof Function) {
			return this._request.getAllResponseHeaders();
		} else {
			return null;
		}
	};
	p.getResponseHeader = function (header) {
		if (this._request.getResponseHeader instanceof Function) {
			return this._request.getResponseHeader(header);
		} else {
			return null;
		}
	};
	p._handleProgress = function (event) {
		if (!event || event.loaded > 0 && event.total == 0) {
			return;
		}
		var newEvent = new createjs.ProgressEvent(event.loaded, event.total);
		this.dispatchEvent(newEvent);
	};
	p._handleLoadStart = function (event) {
		clearTimeout(this._loadTimeout);
		this.dispatchEvent("loadstart");
	};
	p._handleAbort = function (event) {
		this._clean();
		this.dispatchEvent(new createjs.ErrorEvent("XHR_ABORTED", null, event));
	};
	p._handleError = function (event) {
		this._clean();
		this.dispatchEvent(new createjs.ErrorEvent(event.message));
	};
	p._handleReadyStateChange = function (event) {
		if (this._request.readyState == 4) {
			this._handleLoad();
		}
	};
	p._handleLoad = function (event) {
		if (this.loaded) {
			return;
		}
		this.loaded = true;
		var error = this._checkError();
		if (error) {
			this._handleError(error);
			return;
		}
		this._response = this._getResponse();
		if (this._responseType === 'arraybuffer') {
			try {
				this._response = new Blob([this._response]);
			} catch (e) {
				window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
				if (e.name === 'TypeError' && window.BlobBuilder) {
					var builder = new BlobBuilder();
					builder.append(this._response);
					this._response = builder.getBlob();
				}
			}
		}
		this._clean();
		this.dispatchEvent(new createjs.Event("complete"));
	};
	p._handleTimeout = function (event) {
		this._clean();
		this.dispatchEvent(new createjs.ErrorEvent("PRELOAD_TIMEOUT", null, event));
	};
	p._checkError = function () {
		var status = parseInt(this._request.status);
		if (status >= 400 && status <= 599) {
			return new Error(status);
		} else if (status == 0) {
			if ((/^https?:/).test(location.protocol)) { return new Error(0); }
			return null;
		} else {
			return null;
		}
	};
	p._getResponse = function () {
		if (this._response != null) {
			return this._response;
		}
		if (this._request.response != null) {
			return this._request.response;
		}
		try {
			if (this._request.responseText != null) {
				return this._request.responseText;
			}
		} catch (e) {
		}
		try {
			if (this._request.responseXML != null) {
				return this._request.responseXML;
			}
		} catch (e) {
		}
		return null;
	};
	p._createXHR = function (item) {
		var crossdomain = createjs.URLUtils.isCrossDomain(item);
		var headers = {};
		var req = null;
		if (window.XMLHttpRequest) {
			req = new XMLHttpRequest();
			if (crossdomain && req.withCredentials === undefined && window.XDomainRequest) {
				req = new XDomainRequest();
			}
		} else {
			for (var i = 0, l = s.ACTIVEX_VERSIONS.length; i < l; i++) {
				var axVersion = s.ACTIVEX_VERSIONS[i];
				try {
					req = new ActiveXObject(axVersion);
					break;
				} catch (e) {
				}
			}
			if (req == null) {
				return false;
			}
		}
		if (item.mimeType == null && createjs.RequestUtils.isText(item.type)) {
			item.mimeType = "text/plain; charset=utf-8";
		}
		if (item.mimeType && req.overrideMimeType) {
			req.overrideMimeType(item.mimeType);
		}
		this._xhrLevel = (typeof req.responseType === "string") ? 2 : 1;
		var src = null;
		if (item.method == createjs.Methods.GET) {
			src = createjs.URLUtils.buildURI(item.src, item.values);
		} else {
			src = item.src;
		}
		req.open(item.method || createjs.Methods.GET, src, true);
		if (crossdomain && req instanceof XMLHttpRequest && this._xhrLevel == 1) {
			headers["Origin"] = location.origin;
		}
		if (item.values && item.method == createjs.Methods.POST) {
			headers["Content-Type"] = "application/x-www-form-urlencoded";
		}
		if (!crossdomain && !headers["X-Requested-With"]) {
			headers["X-Requested-With"] = "XMLHttpRequest";
		}
		if (item.headers) {
			for (var n in item.headers) {
				headers[n] = item.headers[n];
			}
		}
		for (n in headers) {
			req.setRequestHeader(n, headers[n])
		}
		if (req instanceof XMLHttpRequest && item.withCredentials !== undefined) {
			req.withCredentials = item.withCredentials;
		}
		this._request = req;
		return true;
	};
	p._clean = function () {
		clearTimeout(this._loadTimeout);
		if (this._request.removeEventListener != null) {
			this._request.removeEventListener("loadstart", this._handleLoadStartProxy);
			this._request.removeEventListener("progress", this._handleProgressProxy);
			this._request.removeEventListener("abort", this._handleAbortProxy);
			this._request.removeEventListener("error", this._handleErrorProxy);
			this._request.removeEventListener("timeout", this._handleTimeoutProxy);
			this._request.removeEventListener("load", this._handleLoadProxy);
			this._request.removeEventListener("readystatechange", this._handleReadyStateChangeProxy);
		} else {
			this._request.onloadstart = null;
			this._request.onprogress = null;
			this._request.onabort = null;
			this._request.onerror = null;
			this._request.ontimeout = null;
			this._request.onload = null;
			this._request.onreadystatechange = null;
		}
	};
	p.toString = function () {
		return "[PreloadJS XHRRequest]";
	};
	createjs.XHRRequest = createjs.promote(XHRRequest, "AbstractRequest");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function LoadQueue(preferXHR, basePath, crossOrigin) {
		this.AbstractLoader_constructor();
		this._plugins = [];
		this._typeCallbacks = {};
		this._extensionCallbacks = {};
		this.next = null;
		this.maintainScriptOrder = true;
		this.stopOnError = false;
		this._maxConnections = 1;
		this._availableLoaders = [
			createjs.FontLoader,
			createjs.ImageLoader,
			createjs.JavaScriptLoader,
			createjs.CSSLoader,
			createjs.JSONLoader,
			createjs.JSONPLoader,
			createjs.SoundLoader,
			createjs.ManifestLoader,
			createjs.SpriteSheetLoader,
			createjs.XMLLoader,
			createjs.SVGLoader,
			createjs.BinaryLoader,
			createjs.VideoLoader,
			createjs.TextLoader
		];
		this._defaultLoaderLength = this._availableLoaders.length;
		this.init(preferXHR, basePath, crossOrigin);
	}
	var p = createjs.extend(LoadQueue, createjs.AbstractLoader);
	var s = LoadQueue;
	try {
		Object.defineProperties(s, {
			POST: { get: createjs.deprecate(function () { return createjs.Methods.POST; }, "AbstractLoader.POST") },
			GET: { get: createjs.deprecate(function () { return createjs.Methods.GET; }, "AbstractLoader.GET") },
			BINARY: { get: createjs.deprecate(function () { return createjs.Types.BINARY; }, "AbstractLoader.BINARY") },
			CSS: { get: createjs.deprecate(function () { return createjs.Types.CSS; }, "AbstractLoader.CSS") },
			FONT: { get: createjs.deprecate(function () { return createjs.Types.FONT; }, "AbstractLoader.FONT") },
			FONTCSS: { get: createjs.deprecate(function () { return createjs.Types.FONTCSS; }, "AbstractLoader.FONTCSS") },
			IMAGE: { get: createjs.deprecate(function () { return createjs.Types.IMAGE; }, "AbstractLoader.IMAGE") },
			JAVASCRIPT: { get: createjs.deprecate(function () { return createjs.Types.JAVASCRIPT; }, "AbstractLoader.JAVASCRIPT") },
			JSON: { get: createjs.deprecate(function () { return createjs.Types.JSON; }, "AbstractLoader.JSON") },
			JSONP: { get: createjs.deprecate(function () { return createjs.Types.JSONP; }, "AbstractLoader.JSONP") },
			MANIFEST: { get: createjs.deprecate(function () { return createjs.Types.MANIFEST; }, "AbstractLoader.MANIFEST") },
			SOUND: { get: createjs.deprecate(function () { return createjs.Types.SOUND; }, "AbstractLoader.SOUND") },
			VIDEO: { get: createjs.deprecate(function () { return createjs.Types.VIDEO; }, "AbstractLoader.VIDEO") },
			SPRITESHEET: { get: createjs.deprecate(function () { return createjs.Types.SPRITESHEET; }, "AbstractLoader.SPRITESHEET") },
			SVG: { get: createjs.deprecate(function () { return createjs.Types.SVG; }, "AbstractLoader.SVG") },
			TEXT: { get: createjs.deprecate(function () { return createjs.Types.TEXT; }, "AbstractLoader.TEXT") },
			XML: { get: createjs.deprecate(function () { return createjs.Types.XML; }, "AbstractLoader.XML") }
		});
	} catch (e) { }
	p.init = function (preferXHR, basePath, crossOrigin) {
		this.preferXHR = true; //TODO: Get/Set
		this._preferXHR = true;
		this.setPreferXHR(preferXHR);
		this._paused = false;
		this._basePath = basePath;
		this._crossOrigin = crossOrigin;
		this._loadStartWasDispatched = false;
		this._currentlyLoadingScript = null;
		this._currentLoads = [];
		this._loadQueue = [];
		this._loadQueueBackup = [];
		this._loadItemsById = {};
		this._loadItemsBySrc = {};
		this._loadedResults = {};
		this._loadedRawResults = {};
		this._numItems = 0;
		this._numItemsLoaded = 0;
		this._scriptOrder = [];
		this._loadedScripts = [];
		this._lastProgress = NaN;
	};
	p.registerLoader = function (loader) {
		if (!loader || !loader.canLoadItem) {
			throw new Error("loader is of an incorrect type.");
		} else if (this._availableLoaders.indexOf(loader) != -1) {
			throw new Error("loader already exists."); //LM: Maybe just silently fail here
		}
		this._availableLoaders.unshift(loader);
	};
	p.unregisterLoader = function (loader) {
		var idx = this._availableLoaders.indexOf(loader);
		if (idx != -1 && idx < this._defaultLoaderLength - 1) {
			this._availableLoaders.splice(idx, 1);
		}
	};
	p.setPreferXHR = function (value) {
		//TODO: Should we be checking for the other XHR types? Might have to do a try/catch on the different types similar to createXHR.
		this.preferXHR = (value != false && window.XMLHttpRequest != null);
		return this.preferXHR;
	};
	p.removeAll = function () {
		this.remove();
	};
	p.remove = function (idsOrUrls) {
		var args = null;
		if (idsOrUrls && !Array.isArray(idsOrUrls)) {
			args = [idsOrUrls];
		} else if (idsOrUrls) {
			args = idsOrUrls;
		} else if (arguments.length > 0) {
			return;
		}
		var itemsWereRemoved = false;
		if (!args) {
			this.close();
			for (var n in this._loadItemsById) {
				this._disposeItem(this._loadItemsById[n]);
			}
			this.init(this.preferXHR, this._basePath);
		} else {
			while (args.length) {
				var item = args.pop();
				var r = this.getResult(item);
				//Remove from the main load Queue
				for (i = this._loadQueue.length - 1; i >= 0; i--) {
					loadItem = this._loadQueue[i].getItem();
					if (loadItem.id == item || loadItem.src == item) {
						this._loadQueue.splice(i, 1)[0].cancel();
						break;
					}
				}
				//Remove from the backup queue
				for (i = this._loadQueueBackup.length - 1; i >= 0; i--) {
					loadItem = this._loadQueueBackup[i].getItem();
					if (loadItem.id == item || loadItem.src == item) {
						this._loadQueueBackup.splice(i, 1)[0].cancel();
						break;
					}
				}
				if (r) {
					this._disposeItem(this.getItem(item));
				} else {
					for (var i = this._currentLoads.length - 1; i >= 0; i--) {
						var loadItem = this._currentLoads[i].getItem();
						if (loadItem.id == item || loadItem.src == item) {
							this._currentLoads.splice(i, 1)[0].cancel();
							itemsWereRemoved = true;
							break;
						}
					}
				}
			}
			if (itemsWereRemoved) {
				this._loadNext();
			}
		}
	};
	p.reset = function () {
		this.close();
		for (var n in this._loadItemsById) {
			this._disposeItem(this._loadItemsById[n]);
		}
		//Reset the queue to its start state
		var a = [];
		for (var i = 0, l = this._loadQueueBackup.length; i < l; i++) {
			a.push(this._loadQueueBackup[i].getItem());
		}
		this.loadManifest(a, false);
	};
	p.installPlugin = function (plugin) {
		if (plugin == null) {
			return;
		}
		if (plugin.getPreloadHandlers != null) {
			this._plugins.push(plugin);
			var map = plugin.getPreloadHandlers();
			map.scope = plugin;
			if (map.types != null) {
				for (var i = 0, l = map.types.length; i < l; i++) {
					this._typeCallbacks[map.types[i]] = map;
				}
			}
			if (map.extensions != null) {
				for (i = 0, l = map.extensions.length; i < l; i++) {
					this._extensionCallbacks[map.extensions[i]] = map;
				}
			}
		}
	};
	p.setMaxConnections = function (value) {
		this._maxConnections = value;
		if (!this._paused && this._loadQueue.length > 0) {
			this._loadNext();
		}
	};
	p.loadFile = function (file, loadNow, basePath) {
		if (file == null) {
			var event = new createjs.ErrorEvent("PRELOAD_NO_FILE");
			this._sendError(event);
			return;
		}
		this._addItem(file, null, basePath);
		if (loadNow !== false) {
			this.setPaused(false);
		} else {
			this.setPaused(true);
		}
	};
	p.loadManifest = function (manifest, loadNow, basePath) {
		var fileList = null;
		var path = null;
		if (Array.isArray(manifest)) {
			if (manifest.length == 0) {
				var event = new createjs.ErrorEvent("PRELOAD_MANIFEST_EMPTY");
				this._sendError(event);
				return;
			}
			fileList = manifest;
		} else if (typeof (manifest) === "string") {
			fileList = [
				{
					src: manifest,
					type: s.MANIFEST
				}
			];
		} else if (typeof (manifest) == "object") {
			if (manifest.src !== undefined) {
				if (manifest.type == null) {
					manifest.type = s.MANIFEST;
				} else if (manifest.type != s.MANIFEST) {
					var event = new createjs.ErrorEvent("PRELOAD_MANIFEST_TYPE");
					this._sendError(event);
				}
				fileList = [manifest];
			} else if (manifest.manifest !== undefined) {
				fileList = manifest.manifest;
				path = manifest.path;
			}
		} else {
			var event = new createjs.ErrorEvent("PRELOAD_MANIFEST_NULL");
			this._sendError(event);
			return;
		}
		for (var i = 0, l = fileList.length; i < l; i++) {
			this._addItem(fileList[i], path, basePath);
		}
		if (loadNow !== false) {
			this.setPaused(false);
		} else {
			this.setPaused(true);
		}
	};
	p.load = function () {
		this.setPaused(false);
	};
	p.getItem = function (value) {
		return this._loadItemsById[value] || this._loadItemsBySrc[value];
	};
	p.getResult = function (value, rawResult) {
		var item = this._loadItemsById[value] || this._loadItemsBySrc[value];
		if (item == null) {
			return null;
		}
		var id = item.id;
		if (rawResult && this._loadedRawResults[id]) {
			return this._loadedRawResults[id];
		}
		return this._loadedResults[id];
	};
	p.getItems = function (loaded) {
		var arr = [];
		for (var n in this._loadItemsById) {
			var item = this._loadItemsById[n];
			var result = this.getResult(n);
			if (loaded === true && result == null) {
				continue;
			}
			arr.push({
				item: item,
				result: result,
				rawResult: this.getResult(n, true)
			});
		}
		return arr;
	};
	p.setPaused = function (value) {
		this._paused = value;
		if (!this._paused) {
			this._loadNext();
		}
	};
	p.close = function () {
		while (this._currentLoads.length) {
			this._currentLoads.pop().cancel();
		}
		this._scriptOrder.length = 0;
		this._loadedScripts.length = 0;
		this.loadStartWasDispatched = false;
		this._itemCount = 0;
		this._lastProgress = NaN;
	};
	p._addItem = function (value, path, basePath) {
		var item = this._createLoadItem(value, path, basePath);
		if (item == null) {
			return;
		}
		var loader = this._createLoader(item);
		if (loader != null) {
			if ("plugins" in loader) {
				loader.plugins = this._plugins;
			}
			item._loader = loader;
			this._loadQueue.push(loader);
			this._loadQueueBackup.push(loader);
			this._numItems++;
			this._updateProgress();
			if ((this.maintainScriptOrder
				&& item.type == createjs.Types.JAVASCRIPT
				//&& loader instanceof createjs.XHRLoader //NOTE: Have to track all JS files this way
			)
				|| item.maintainOrder === true) {
				this._scriptOrder.push(item);
				this._loadedScripts.push(null);
			}
		}
	};
	p._createLoadItem = function (value, path, basePath) {
		var item = createjs.LoadItem.create(value);
		if (item == null) {
			return null;
		}
		var bp = "";
		var useBasePath = basePath || this._basePath;
		if (item.src instanceof Object) {
			if (!item.type) {
				return null;
			}
			if (path) {
				bp = path;
				var pathMatch = createjs.URLUtils.parseURI(path);
				if (useBasePath != null && !pathMatch.absolute && !pathMatch.relative) {
					bp = useBasePath + bp;
				}
			} else if (useBasePath != null) {
				bp = useBasePath;
			}
		} else {
			var match = createjs.URLUtils.parseURI(item.src);
			if (match.extension) {
				item.ext = match.extension;
			}
			if (item.type == null) {
				item.type = createjs.RequestUtils.getTypeByExtension(item.ext);
			}
			var autoId = item.src;
			if (!match.absolute && !match.relative) {
				if (path) {
					bp = path;
					var pathMatch = createjs.URLUtils.parseURI(path);
					autoId = path + autoId;
					if (useBasePath != null && !pathMatch.absolute && !pathMatch.relative) {
						bp = useBasePath + bp;
					}
				} else if (useBasePath != null) {
					bp = useBasePath;
				}
			}
			item.src = bp + item.src;
		}
		item.path = bp;
		if (item.id === undefined || item.id === null || item.id === "") {
			item.id = autoId;
		}
		var customHandler = this._typeCallbacks[item.type] || this._extensionCallbacks[item.ext];
		if (customHandler) {
			var result = customHandler.callback.call(customHandler.scope, item, this);
			if (result === false) {
				return null;
			} else if (result === true) {
			} else if (result != null) {
				item._loader = result;
			}
			match = createjs.URLUtils.parseURI(item.src);
			if (match.extension != null) {
				item.ext = match.extension;
			}
		}
		this._loadItemsById[item.id] = item;
		this._loadItemsBySrc[item.src] = item;
		if (item.crossOrigin == null) {
			item.crossOrigin = this._crossOrigin;
		}
		return item;
	};
	p._createLoader = function (item) {
		if (item._loader != null) {
			return item._loader;
		}
		var preferXHR = this.preferXHR;
		for (var i = 0; i < this._availableLoaders.length; i++) {
			var loader = this._availableLoaders[i];
			if (loader && loader.canLoadItem(item)) {
				return new loader(item, preferXHR);
			}
		}
		return null;
	};
	p._loadNext = function () {
		if (this._paused) {
			return;
		}
		if (!this._loadStartWasDispatched) {
			this._sendLoadStart();
			this._loadStartWasDispatched = true;
		}
		if (this._numItems == this._numItemsLoaded) {
			this.loaded = true;
			this._sendComplete();
			if (this.next && this.next.load) {
				this.next.load();
			}
		} else {
			this.loaded = false;
		}
		for (var i = 0; i < this._loadQueue.length; i++) {
			if (this._currentLoads.length >= this._maxConnections) {
				break;
			}
			var loader = this._loadQueue[i];
			if (!this._canStartLoad(loader)) {
				continue;
			}
			this._loadQueue.splice(i, 1);
			i--;
			this._loadItem(loader);
		}
	};
	p._loadItem = function (loader) {
		loader.on("fileload", this._handleFileLoad, this);
		loader.on("progress", this._handleProgress, this);
		loader.on("complete", this._handleFileComplete, this);
		loader.on("error", this._handleError, this);
		loader.on("fileerror", this._handleFileError, this);
		this._currentLoads.push(loader);
		this._sendFileStart(loader.getItem());
		loader.load();
	};
	p._handleFileLoad = function (event) {
		event.target = null;
		this.dispatchEvent(event);
	};
	p._handleFileError = function (event) {
		var newEvent = new createjs.ErrorEvent("FILE_LOAD_ERROR", null, event.item);
		this._sendError(newEvent);
	};
	p._handleError = function (event) {
		var loader = event.target;
		this._numItemsLoaded++;
		this._finishOrderedItem(loader, true);
		this._updateProgress();
		var newEvent = new createjs.ErrorEvent("FILE_LOAD_ERROR", null, loader.getItem());
		this._sendError(newEvent);
		if (!this.stopOnError) {
			this._removeLoadItem(loader);
			this._cleanLoadItem(loader);
			this._loadNext();
		} else {
			this.setPaused(true);
		}
	};
	p._handleFileComplete = function (event) {
		var loader = event.target;
		var item = loader.getItem();
		var result = loader.getResult();
		this._loadedResults[item.id] = result;
		var rawResult = loader.getResult(true);
		if (rawResult != null && rawResult !== result) {
			this._loadedRawResults[item.id] = rawResult;
		}
		this._saveLoadedItems(loader);
		this._removeLoadItem(loader);
		if (!this._finishOrderedItem(loader)) {
			this._processFinishedLoad(item, loader);
		}
		this._cleanLoadItem(loader);
	};
	p._saveLoadedItems = function (loader) {
		var list = loader.getLoadedItems();
		if (list === null) {
			return;
		}
		for (var i = 0; i < list.length; i++) {
			var item = list[i].item;
			this._loadItemsBySrc[item.src] = item;
			this._loadItemsById[item.id] = item;
			this._loadedResults[item.id] = list[i].result;
			this._loadedRawResults[item.id] = list[i].rawResult;
		}
	};
	p._finishOrderedItem = function (loader, loadFailed) {
		var item = loader.getItem();
		if ((this.maintainScriptOrder && item.type == createjs.Types.JAVASCRIPT)
			|| item.maintainOrder) {
			//TODO: Evaluate removal of the _currentlyLoadingScript
			if (loader instanceof createjs.JavaScriptLoader) {
				this._currentlyLoadingScript = false;
			}
			var index = createjs.indexOf(this._scriptOrder, item);
			if (index == -1) {
				return false;
			}
			this._loadedScripts[index] = (loadFailed === true) ? true : item;
			this._checkScriptLoadOrder();
			return true;
		}
		return false;
	};
	p._checkScriptLoadOrder = function () {
		var l = this._loadedScripts.length;
		for (var i = 0; i < l; i++) {
			var item = this._loadedScripts[i];
			if (item === null) {
				break;
			}
			if (item === true) {
				continue;
			}
			var loadItem = this._loadedResults[item.id];
			if (item.type == createjs.Types.JAVASCRIPT) {
				createjs.DomUtils.appendToHead(loadItem);
			}
			var loader = item._loader;
			this._processFinishedLoad(item, loader);
			this._loadedScripts[i] = true;
		}
	};
	p._processFinishedLoad = function (item, loader) {
		this._numItemsLoaded++;
		if (!this.maintainScriptOrder && item.type == createjs.Types.JAVASCRIPT) {
			var tag = loader.getTag();
			createjs.DomUtils.appendToHead(tag);
		}
		this._updateProgress();
		this._sendFileComplete(item, loader);
		this._loadNext();
	};
	p._canStartLoad = function (loader) {
		if (!this.maintainScriptOrder || loader.preferXHR) {
			return true;
		}
		var item = loader.getItem();
		if (item.type != createjs.Types.JAVASCRIPT) {
			return true;
		}
		if (this._currentlyLoadingScript) {
			return false;
		}
		var index = this._scriptOrder.indexOf(item);
		var i = 0;
		while (i < index) {
			var checkItem = this._loadedScripts[i];
			if (checkItem == null) {
				return false;
			}
			i++;
		}
		this._currentlyLoadingScript = true;
		return true;
	};
	p._removeLoadItem = function (loader) {
		var l = this._currentLoads.length;
		for (var i = 0; i < l; i++) {
			if (this._currentLoads[i] == loader) {
				this._currentLoads.splice(i, 1);
				break;
			}
		}
	};
	p._cleanLoadItem = function (loader) {
		var item = loader.getItem();
		if (item) {
			delete item._loader;
		}
	}
	p._handleProgress = function (event) {
		var loader = event.target;
		this._sendFileProgress(loader.getItem(), loader.progress);
		this._updateProgress();
	};
	p._updateProgress = function () {
		var loaded = this._numItemsLoaded / this._numItems;
		var remaining = this._numItems - this._numItemsLoaded;
		if (remaining > 0) {
			var chunk = 0;
			for (var i = 0, l = this._currentLoads.length; i < l; i++) {
				chunk += this._currentLoads[i].progress;
			}
			loaded += (chunk / remaining) * (remaining / this._numItems);
		}
		if (this._lastProgress != loaded) {
			this._sendProgress(loaded);
			this._lastProgress = loaded;
		}
	};
	p._disposeItem = function (item) {
		delete this._loadedResults[item.id];
		delete this._loadedRawResults[item.id];
		delete this._loadItemsById[item.id];
		delete this._loadItemsBySrc[item.src];
	};
	p._sendFileProgress = function (item, progress) {
		if (this._isCanceled() || this._paused) {
			return;
		}
		if (!this.hasEventListener("fileprogress")) {
			return;
		}
		//LM: Rework ProgressEvent to support this?
		var event = new createjs.Event("fileprogress");
		event.progress = progress;
		event.loaded = progress;
		event.total = 1;
		event.item = item;
		this.dispatchEvent(event);
	};
	p._sendFileComplete = function (item, loader) {
		if (this._isCanceled() || this._paused) {
			return;
		}
		var event = new createjs.Event("fileload");
		event.loader = loader;
		event.item = item;
		event.result = this._loadedResults[item.id];
		event.rawResult = this._loadedRawResults[item.id];
		if (item.completeHandler) {
			item.completeHandler(event);
		}
		this.hasEventListener("fileload") && this.dispatchEvent(event);
	};
	p._sendFileStart = function (item) {
		var event = new createjs.Event("filestart");
		event.item = item;
		this.hasEventListener("filestart") && this.dispatchEvent(event);
	};
	p.toString = function () {
		return "[PreloadJS LoadQueue]";
	};
	createjs.LoadQueue = createjs.promote(LoadQueue, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function TextLoader(loadItem) {
		this.AbstractLoader_constructor(loadItem, true, createjs.Types.TEXT);
	};
	var p = createjs.extend(TextLoader, createjs.AbstractLoader);
	var s = TextLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.TEXT;
	};
	createjs.TextLoader = createjs.promote(TextLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function BinaryLoader(loadItem) {
		this.AbstractLoader_constructor(loadItem, true, createjs.Types.BINARY);
		this.on("initialize", this._updateXHR, this);
	};
	var p = createjs.extend(BinaryLoader, createjs.AbstractLoader);
	var s = BinaryLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.BINARY;
	};
	p._updateXHR = function (event) {
		event.loader.setResponseType("arraybuffer");
	};
	createjs.BinaryLoader = createjs.promote(BinaryLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function CSSLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.CSS);
		this.resultFormatter = this._formatResult;
		this._tagSrcAttribute = "href";
		if (preferXHR) {
			this._tag = createjs.Elements.style();
		} else {
			this._tag = createjs.Elements.link();
		}
		this._tag.rel = "stylesheet";
		this._tag.type = "text/css";
	};
	var p = createjs.extend(CSSLoader, createjs.AbstractLoader);
	var s = CSSLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.CSS;
	};
	p._formatResult = function (loader) {
		if (this._preferXHR) {
			var tag = loader.getTag();
			if (tag.styleSheet) {
				tag.styleSheet.cssText = loader.getResult(true);
			} else {
				var textNode = createjs.Elements.text(loader.getResult(true));
				tag.appendChild(textNode);
			}
		} else {
			tag = this._tag;
		}
		createjs.DomUtils.appendToHead(tag);
		return tag;
	};
	createjs.CSSLoader = createjs.promote(CSSLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function FontLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, loadItem.type);
		this._faces = {};
		this._watched = [];
		this._count = 0;
		this._watchInterval = null;
		this._loadTimeout = null;
		this._injectCSS = (loadItem.injectCSS === undefined) ? true : loadItem.injectCSS;
		this.dispatchEvent("initialize");
	}
	var p = createjs.extend(FontLoader, createjs.AbstractLoader);
	FontLoader.canLoadItem = function (item) {
		return item.type == createjs.Types.FONT || item.type == createjs.Types.FONTCSS;
	};
	FontLoader.sampleText = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	FontLoader._ctx = document.createElement("canvas").getContext("2d");
	FontLoader._referenceFonts = ["serif", "monospace"];
	FontLoader.WEIGHT_REGEX = /[- ._]*(thin|normal|book|regular|medium|black|heavy|[1-9]00|(?:extra|ultra|semi|demi)?[- ._]*(?:light|bold))[- ._]*/ig;
	FontLoader.STYLE_REGEX = /[- ._]*(italic|oblique)[- ._]*/ig;
	FontLoader.FONT_FORMAT = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "truetype" };
	FontLoader.FONT_WEIGHT = { thin: 100, extralight: 200, ultralight: 200, light: 300, semilight: 300, demilight: 300, book: "normal", regular: "normal", semibold: 600, demibold: 600, extrabold: 800, ultrabold: 800, black: 900, heavy: 900 };
	FontLoader.WATCH_DURATION = 10;
	p.load = function () {
		if (this.type == createjs.Types.FONTCSS) {
			var loaded = this._watchCSS();
			if (!loaded) {
				this.AbstractLoader_load();
				return;
			}
		} else if (this._item.src instanceof Array) {
			this._watchFontArray();
		} else {
			var def = this._defFromSrc(this._item.src);
			this._watchFont(def);
			this._injectStyleTag(this._cssFromDef(def));
		}
		this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), this._item.loadTimeout);
		this.dispatchEvent("loadstart");
	};
	p._handleTimeout = function () {
		this._stopWatching();
		this.dispatchEvent(new createjs.ErrorEvent("PRELOAD_TIMEOUT"));
	};
	p._createRequest = function () {
		return this._request;
	};
	p.handleEvent = function (event) {
		switch (event.type) {
			case "complete":
				this._rawResult = event.target._response;
				this._result = true;
				this._parseCSS(this._rawResult);
				break;
			case "error":
				this._stopWatching();
				this.AbstractLoader_handleEvent(event);
				break;
		}
	};
	p._watchCSS = function () {
		var src = this._item.src;
		if (src instanceof HTMLStyleElement) {
			if (this._injectCSS && !src.parentNode) { (document.head || document.getElementsByTagName('head')[0]).appendChild(src); }
			this._injectCSS = false;
			src = "\n" + src.textContent;
		}
		if (src.search(/\n|\r|@font-face/i) !== -1) {
			this._parseCSS(src);
			return true;
		}
		this._request = new createjs.XHRRequest(this._item);
		return false;
	};
	p._parseCSS = function (css) {
		var regex = /@font-face\s*\{([^}]+)}/g
		while (true) {
			var result = regex.exec(css);
			if (!result) { break; }
			this._watchFont(this._parseFontFace(result[1]));
		}
		this._injectStyleTag(css);
	};
	p._watchFontArray = function () {
		var arr = this._item.src, css = "", def;
		for (var i = arr.length - 1; i >= 0; i--) {
			var o = arr[i];
			if (typeof o === "string") { def = this._defFromSrc(o) }
			else { def = this._defFromObj(o); }
			this._watchFont(def);
			css += this._cssFromDef(def) + "\n";
		}
		this._injectStyleTag(css);
	};
	p._injectStyleTag = function (css) {
		if (!this._injectCSS) { return; }
		var head = document.head || document.getElementsByTagName('head')[0];
		var styleTag = document.createElement("style");
		styleTag.type = "text/css";
		if (styleTag.styleSheet) {
			styleTag.styleSheet.cssText = css;
		} else {
			styleTag.appendChild(document.createTextNode(css));
		}
		head.appendChild(styleTag);
	};
	p._parseFontFace = function (str) {
		var family = this._getCSSValue(str, "font-family"), src = this._getCSSValue(str, "src");
		if (!family || !src) { return null; }
		return this._defFromObj({
			family: family,
			src: src,
			style: this._getCSSValue(str, "font-style"),
			weight: this._getCSSValue(str, "font-weight")
		});
	};
	p._watchFont = function (def) {
		if (!def || this._faces[def.id]) { return; }
		this._faces[def.id] = def;
		this._watched.push(def);
		this._count++;
		this._calculateReferenceSizes(def);
		this._startWatching();
	};
	p._startWatching = function () {
		if (this._watchInterval != null) { return; }
		this._watchInterval = setInterval(createjs.proxy(this._watch, this), FontLoader.WATCH_DURATION);
	};
	p._stopWatching = function () {
		clearInterval(this._watchInterval);
		clearTimeout(this._loadTimeout);
		this._watchInterval = null;
	};
	p._watch = function () {
		var defs = this._watched, refFonts = FontLoader._referenceFonts, l = defs.length;
		for (var i = l - 1; i >= 0; i--) {
			var def = defs[i], refs = def.refs;
			for (var j = refs.length - 1; j >= 0; j--) {
				var w = this._getTextWidth(def.family + "," + refFonts[j], def.weight, def.style);
				if (w != refs[j]) {
					var event = new createjs.Event("fileload");
					def.type = "font-family";
					event.item = def;
					this.dispatchEvent(event);
					defs.splice(i, 1);
					break;
				}
			}
		}
		if (l !== defs.length) {
			var event = new createjs.ProgressEvent(this._count - defs.length, this._count);
			this.dispatchEvent(event);
		}
		if (l === 0) {
			this._stopWatching();
			this._sendComplete();
		}
	};
	p._calculateReferenceSizes = function (def) {
		var refFonts = FontLoader._referenceFonts;
		var refs = def.refs = [];
		for (var i = 0; i < refFonts.length; i++) {
			refs[i] = this._getTextWidth(refFonts[i], def.weight, def.style);
		}
	};
	p._defFromSrc = function (src) {
		var re = /[- ._]+/g, name = src, ext = null, index;
		index = name.search(/[?#]/);
		if (index !== -1) {
			name = name.substr(0, index);
		}
		index = name.lastIndexOf(".");
		if (index !== -1) {
			ext = name.substr(index + 1);
			name = name.substr(0, index);
		}
		index = name.lastIndexOf("/");
		if (index !== -1) {
			name = name.substr(index + 1);
		}
		var family = name,
			weight = family.match(FontLoader.WEIGHT_REGEX);
		if (weight) {
			weight = weight[0];
			family = family.replace(weight, "");
			weight = weight.replace(re, "").toLowerCase();
		}
		var style = name.match(FontLoader.STYLE_REGEX);
		if (style) {
			family = family.replace(style[0], "");
			style = "italic";
		}
		family = family.replace(re, "");
		var cssSrc = "local('" + name.replace(re, " ") + "'), url('" + src + "')";
		var format = FontLoader.FONT_FORMAT[ext];
		if (format) { cssSrc += " format('" + format + "')"; }
		return this._defFromObj({
			family: family,
			weight: FontLoader.FONT_WEIGHT[weight] || weight,
			style: style,
			src: cssSrc
		});
	};
	p._defFromObj = function (o) {
		var def = {
			family: o.family,
			src: o.src,
			style: o.style || "normal",
			weight: o.weight || "normal"
		};
		def.id = def.family + ";" + def.style + ";" + def.weight;
		return def;
	};
	p._cssFromDef = function (def) {
		return "@font-face {\n" +
			"\tfont-family: '" + def.family + "';\n" +
			"\tfont-style: " + def.style + ";\n" +
			"\tfont-weight: " + def.weight + ";\n" +
			"\tsrc: " + def.src + ";\n" +
			"}";
	};
	p._getTextWidth = function (family, weight, style) {
		var ctx = FontLoader._ctx;
		ctx.font = style + " " + weight + " 72px " + family;
		return ctx.measureText(FontLoader.sampleText).width;
	};
	p._getCSSValue = function (str, propName) {
		var regex = new RegExp(propName + ":\s*([^;}]+?)\s*[;}]");
		var result = regex.exec(str);
		if (!result || !result[1]) { return null; }
		return result[1];
	};
	createjs.FontLoader = createjs.promote(FontLoader, "AbstractLoader");
})();
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function ImageLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.IMAGE);
		this.resultFormatter = this._formatResult;
		this._tagSrcAttribute = "src";
		if (createjs.DomUtils.isImageTag(loadItem)) {
			this._tag = loadItem;
		} else if (createjs.DomUtils.isImageTag(loadItem.src)) {
			this._tag = loadItem.src;
		} else if (createjs.DomUtils.isImageTag(loadItem.tag)) {
			this._tag = loadItem.tag;
		}
		if (this._tag != null) {
			this._preferXHR = false;
		} else {
			this._tag = createjs.Elements.img();
		}
		this.on("initialize", this._updateXHR, this);
	};
	var p = createjs.extend(ImageLoader, createjs.AbstractLoader);
	var s = ImageLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.IMAGE;
	};
	p.load = function () {
		if (this._tag.src != "" && this._tag.complete) {
			this._sendComplete();
			return;
		}
		var crossOrigin = this._item.crossOrigin;
		if (crossOrigin == true) { crossOrigin = "Anonymous"; }
		if (crossOrigin != null && !createjs.URLUtils.isLocal(this._item)) {
			this._tag.crossOrigin = crossOrigin;
		}
		this.AbstractLoader_load();
	};
	p._updateXHR = function (event) {
		event.loader.mimeType = 'text/plain; charset=x-user-defined-binary';
		if (event.loader.setResponseType) {
			event.loader.setResponseType("blob");
		}
	};
	p._formatResult = function (loader) {
		return this._formatImage;
	};
	p._formatImage = function (successCallback, errorCallback) {
		var tag = this._tag;
		var URL = window.URL || window.webkitURL;
		if (!this._preferXHR) {
			//document.body.removeChild(tag);
		} else if (URL) {
			var objURL = URL.createObjectURL(this.getResult(true));
			tag.src = objURL;
			tag.addEventListener("load", this._cleanUpURL, false);
			tag.addEventListener("error", this._cleanUpURL, false);
		} else {
			tag.src = this._item.src;
		}
		if (tag.complete) {
			successCallback(tag);
		} else {
			tag.onload = createjs.proxy(function () {
				successCallback(this._tag);
				tag.onload = tag.onerror = null;
			}, this);
			tag.onerror = createjs.proxy(function (event) {
				errorCallback(new createjs.ErrorEvent('IMAGE_FORMAT', null, event));
				tag.onload = tag.onerror = null;
			}, this);
		}
	};
	p._cleanUpURL = function (event) {
		var URL = window.URL || window.webkitURL;
		URL.revokeObjectURL(event.target.src);
	};
	createjs.ImageLoader = createjs.promote(ImageLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function JavaScriptLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.JAVASCRIPT);
		this.resultFormatter = this._formatResult;
		this._tagSrcAttribute = "src";
		this.setTag(createjs.Elements.script());
	};
	var p = createjs.extend(JavaScriptLoader, createjs.AbstractLoader);
	var s = JavaScriptLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.JAVASCRIPT;
	};
	p._formatResult = function (loader) {
		var tag = loader.getTag();
		if (this._preferXHR) {
			tag.text = loader.getResult(true);
		}
		return tag;
	};
	createjs.JavaScriptLoader = createjs.promote(JavaScriptLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function JSONLoader(loadItem) {
		this.AbstractLoader_constructor(loadItem, true, createjs.Types.JSON);
		this.resultFormatter = this._formatResult;
	};
	var p = createjs.extend(JSONLoader, createjs.AbstractLoader);
	var s = JSONLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.JSON;
	};
	p._formatResult = function (loader) {
		var json = null;
		try {
			json = createjs.DataUtils.parseJSON(loader.getResult(true));
		} catch (e) {
			var event = new createjs.ErrorEvent("JSON_FORMAT", null, e);
			this._sendError(event);
			return e;
		}
		return json;
	};
	createjs.JSONLoader = createjs.promote(JSONLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function JSONPLoader(loadItem) {
		this.AbstractLoader_constructor(loadItem, false, createjs.Types.JSONP);
		this.setTag(createjs.Elements.script());
		this.getTag().type = "text/javascript";
	};
	var p = createjs.extend(JSONPLoader, createjs.AbstractLoader);
	var s = JSONPLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.JSONP;
	};
	p.cancel = function () {
		this.AbstractLoader_cancel();
		this._dispose();
	};
	p.load = function () {
		if (this._item.callback == null) {
			throw new Error('callback is required for loading JSONP requests.');
		}
		if (window[this._item.callback] != null) {
			throw new Error(
				"JSONP callback '" +
				this._item.callback +
				"' already exists on window. You need to specify a different callback or re-name the current one.");
		}
		window[this._item.callback] = createjs.proxy(this._handleLoad, this);
		createjs.DomUtils.appendToBody(this._tag);
		this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), this._item.loadTimeout);
		this._tag.src = this._item.src;
	};
	p._handleLoad = function (data) {
		this._result = this._rawResult = data;
		this._sendComplete();
		this._dispose();
	};
	p._handleTimeout = function () {
		this._dispose();
		this.dispatchEvent(new createjs.ErrorEvent("timeout"));
	};
	p._dispose = function () {
		createjs.DomUtils.removeChild(this._tag);
		delete window[this._item.callback];
		clearTimeout(this._loadTimeout);
	};
	createjs.JSONPLoader = createjs.promote(JSONPLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function ManifestLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.MANIFEST);
		this.plugins = null;
		this._manifestQueue = null;
	};
	var p = createjs.extend(ManifestLoader, createjs.AbstractLoader);
	var s = ManifestLoader;
	s.MANIFEST_PROGRESS = 0.25;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.MANIFEST;
	};
	p.load = function () {
		this.AbstractLoader_load();
	};
	p._createRequest = function () {
		var callback = this._item.callback;
		if (callback != null) {
			this._request = new createjs.JSONPLoader(this._item);
		} else {
			this._request = new createjs.JSONLoader(this._item);
		}
	};
	p.handleEvent = function (event) {
		switch (event.type) {
			case "complete":
				this._rawResult = event.target.getResult(true);
				this._result = event.target.getResult();
				this._sendProgress(s.MANIFEST_PROGRESS);
				this._loadManifest(this._result);
				return;
			case "progress":
				event.loaded *= s.MANIFEST_PROGRESS;
				this.progress = event.loaded / event.total;
				if (isNaN(this.progress) || this.progress == Infinity) { this.progress = 0; }
				this._sendProgress(event);
				return;
		}
		this.AbstractLoader_handleEvent(event);
	};
	p.destroy = function () {
		this.AbstractLoader_destroy();
		this._manifestQueue.close();
	};
	p._loadManifest = function (json) {
		if (json && json.manifest) {
			var queue = this._manifestQueue = new createjs.LoadQueue(this._preferXHR);
			queue.on("fileload", this._handleManifestFileLoad, this);
			queue.on("progress", this._handleManifestProgress, this);
			queue.on("complete", this._handleManifestComplete, this, true);
			queue.on("error", this._handleManifestError, this, true);
			for (var i = 0, l = this.plugins.length; i < l; i++) {
				queue.installPlugin(this.plugins[i]);
			}
			queue.loadManifest(json);
		} else {
			this._sendComplete();
		}
	};
	p._handleManifestFileLoad = function (event) {
		event.target = null;
		this.dispatchEvent(event);
	};
	p._handleManifestComplete = function (event) {
		this._loadedItems = this._manifestQueue.getItems(true);
		this._sendComplete();
	};
	p._handleManifestProgress = function (event) {
		this.progress = event.progress * (1 - s.MANIFEST_PROGRESS) + s.MANIFEST_PROGRESS;
		this._sendProgress(this.progress);
	};
	p._handleManifestError = function (event) {
		var newEvent = new createjs.Event("fileerror");
		newEvent.item = event.data;
		this.dispatchEvent(newEvent);
	};
	createjs.ManifestLoader = createjs.promote(ManifestLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function SoundLoader(loadItem, preferXHR) {
		this.AbstractMediaLoader_constructor(loadItem, preferXHR, createjs.Types.SOUND);
		if (createjs.DomUtils.isAudioTag(loadItem)) {
			this._tag = loadItem;
		} else if (createjs.DomUtils.isAudioTag(loadItem.src)) {
			this._tag = loadItem;
		} else if (createjs.DomUtils.isAudioTag(loadItem.tag)) {
			this._tag = createjs.DomUtils.isAudioTag(loadItem) ? loadItem : loadItem.src;
		}
		if (this._tag != null) {
			this._preferXHR = false;
		}
	};
	var p = createjs.extend(SoundLoader, createjs.AbstractMediaLoader);
	var s = SoundLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.SOUND;
	};
	p._createTag = function (src) {
		var tag = createjs.Elements.audio();
		tag.autoplay = false;
		tag.preload = "none";
		//LM: Firefox fails when this the preload="none" for other tags, but it needs to be "none" to ensure PreloadJS works.
		tag.src = src;
		return tag;
	};
	createjs.SoundLoader = createjs.promote(SoundLoader, "AbstractMediaLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function VideoLoader(loadItem, preferXHR) {
		this.AbstractMediaLoader_constructor(loadItem, preferXHR, createjs.Types.VIDEO);
		if (createjs.DomUtils.isVideoTag(loadItem) || createjs.DomUtils.isVideoTag(loadItem.src)) {
			this.setTag(createjs.DomUtils.isVideoTag(loadItem) ? loadItem : loadItem.src);
			this._preferXHR = false;
		} else {
			this.setTag(this._createTag());
		}
	};
	var p = createjs.extend(VideoLoader, createjs.AbstractMediaLoader);
	var s = VideoLoader;
	p._createTag = function () {
		return createjs.Elements.video();
	};
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.VIDEO;
	};
	createjs.VideoLoader = createjs.promote(VideoLoader, "AbstractMediaLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function SpriteSheetLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.SPRITESHEET);
		this._manifestQueue = null;
	}
	var p = createjs.extend(SpriteSheetLoader, createjs.AbstractLoader);
	var s = SpriteSheetLoader;
	s.SPRITESHEET_PROGRESS = 0.25;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.SPRITESHEET;
	};
	p.destroy = function () {
		this.AbstractLoader_destroy();
		this._manifestQueue.close();
	};
	p._createRequest = function () {
		var callback = this._item.callback;
		if (callback != null) {
			this._request = new createjs.JSONPLoader(this._item);
		} else {
			this._request = new createjs.JSONLoader(this._item);
		}
	};
	p.handleEvent = function (event) {
		switch (event.type) {
			case "complete":
				this._rawResult = event.target.getResult(true);
				this._result = event.target.getResult();
				this._sendProgress(s.SPRITESHEET_PROGRESS);
				this._loadManifest(this._result);
				return;
			case "progress":
				event.loaded *= s.SPRITESHEET_PROGRESS;
				this.progress = event.loaded / event.total;
				if (isNaN(this.progress) || this.progress == Infinity) { this.progress = 0; }
				this._sendProgress(event);
				return;
		}
		this.AbstractLoader_handleEvent(event);
	};
	p._loadManifest = function (json) {
		if (json && json.images) {
			var queue = this._manifestQueue = new createjs.LoadQueue(this._preferXHR, this._item.path, this._item.crossOrigin);
			queue.on("complete", this._handleManifestComplete, this, true);
			queue.on("fileload", this._handleManifestFileLoad, this);
			queue.on("progress", this._handleManifestProgress, this);
			queue.on("error", this._handleManifestError, this, true);
			queue.loadManifest(json.images);
		}
	};
	p._handleManifestFileLoad = function (event) {
		var image = event.result;
		if (image != null) {
			var images = this.getResult().images;
			var pos = images.indexOf(event.item.src);
			images[pos] = image;
		}
	};
	p._handleManifestComplete = function (event) {
		this._result = new createjs.SpriteSheet(this._result);
		this._loadedItems = this._manifestQueue.getItems(true);
		this._sendComplete();
	};
	p._handleManifestProgress = function (event) {
		this.progress = event.progress * (1 - s.SPRITESHEET_PROGRESS) + s.SPRITESHEET_PROGRESS;
		this._sendProgress(this.progress);
	};
	p._handleManifestError = function (event) {
		var newEvent = new createjs.Event("fileerror");
		newEvent.item = event.data;
		this.dispatchEvent(newEvent);
	};
	createjs.SpriteSheetLoader = createjs.promote(SpriteSheetLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function SVGLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.SVG);
		this.resultFormatter = this._formatResult;
		this._tagSrcAttribute = "data";
		if (preferXHR) {
			this.setTag(createjs.Elements.svg());
		} else {
			this.setTag(createjs.Elements.object());
			this.getTag().type = "image/svg+xml";
		}
	};
	var p = createjs.extend(SVGLoader, createjs.AbstractLoader);
	var s = SVGLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.SVG;
	};
	p._formatResult = function (loader) {
		var xml = createjs.DataUtils.parseXML(loader.getResult(true));
		var tag = loader.getTag();
		if (!this._preferXHR && document.body.contains(tag)) {
			document.body.removeChild(tag);
		}
		if (xml.documentElement != null) {
			var element = xml.documentElement;
			if (document.importNode) {
				element = document.importNode(element, true);
			}
			tag.appendChild(element);
			return tag;
		} else {
			return xml;
		}
	};
	createjs.SVGLoader = createjs.promote(SVGLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function XMLLoader(loadItem) {
		this.AbstractLoader_constructor(loadItem, true, createjs.Types.XML);
		this.resultFormatter = this._formatResult;
	};
	var p = createjs.extend(XMLLoader, createjs.AbstractLoader);
	var s = XMLLoader;
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.XML;
	};
	p._formatResult = function (loader) {
		return createjs.DataUtils.parseXML(loader.getResult(true));
	};
	createjs.XMLLoader = createjs.promote(XMLLoader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	var s = createjs.SoundJS = createjs.SoundJS || {};
	s.version = "NEXT";
	s.buildDate = "Thu, 14 Sep 2017 22:19:45 GMT";
})();
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function BrowserDetect() {
		throw "BrowserDetect cannot be instantiated";
	};
	var agent = BrowserDetect.agent = window.navigator.userAgent;
	BrowserDetect.isWindowPhone = (agent.indexOf("IEMobile") > -1) || (agent.indexOf("Windows Phone") > -1);
	BrowserDetect.isFirefox = (agent.indexOf("Firefox") > -1);
	BrowserDetect.isOpera = (window.opera != null);
	BrowserDetect.isChrome = (agent.indexOf("Chrome") > -1);
	BrowserDetect.isIOS = (agent.indexOf("iPod") > -1 || agent.indexOf("iPhone") > -1 || agent.indexOf("iPad") > -1) && !BrowserDetect.isWindowPhone;
	BrowserDetect.isAndroid = (agent.indexOf("Android") > -1) && !BrowserDetect.isWindowPhone;
	BrowserDetect.isBlackberry = (agent.indexOf("Blackberry") > -1);
	createjs.BrowserDetect = BrowserDetect;
}());
//##############################################################################
//##############################################################################
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	var PlayPropsConfig = function () {
		this.interrupt = null;
		this.delay = null;
		this.offset = null;
		this.loop = null;
		this.volume = null;
		this.pan = null;
		this.startTime = null;
		this.duration = null;
	};
	var p = PlayPropsConfig.prototype = {};
	var s = PlayPropsConfig;
	s.create = function (value) {
		if (typeof (value) === "string") {
			console && (console.warn || console.log)("Deprecated behaviour. Sound.play takes a configuration object instead of individual arguments. See docs for info.");
			return new createjs.PlayPropsConfig().set({ interrupt: value });
		} else if (value == null || value instanceof s || value instanceof Object) {
			return new createjs.PlayPropsConfig().set(value);
		} else if (value == null) {
			throw new Error("PlayProps configuration not recognized.");
		}
	};
	p.set = function (props) {
		if (props != null) {
			for (var n in props) { this[n] = props[n]; }
		}
		return this;
	};
	p.toString = function () {
		return "[PlayPropsConfig]";
	};
	createjs.PlayPropsConfig = s;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Sound() {
		throw "Sound cannot be instantiated";
	}
	var s = Sound;
	s.INTERRUPT_ANY = "any";
	s.INTERRUPT_EARLY = "early";
	s.INTERRUPT_LATE = "late";
	s.INTERRUPT_NONE = "none";
	s.PLAY_INITED = "playInited";
	s.PLAY_SUCCEEDED = "playSucceeded";
	s.PLAY_INTERRUPTED = "playInterrupted";
	s.PLAY_FINISHED = "playFinished";
	s.PLAY_FAILED = "playFailed";
	s.SUPPORTED_EXTENSIONS = ["mp3", "ogg", "opus", "mpeg", "wav", "m4a", "mp4", "aiff", "wma", "mid"];
	s.EXTENSION_MAP = {
		m4a: "mp4"
	};
	s.FILE_PATTERN = /^(?:(\w+:)\/{2}(\w+(?:\.\w+)*\/?))?([/.]*?(?:[^?]+)?\/)?((?:[^/?]+)\.(\w+))(?:\?(\S+)?)?$/;
	s.defaultInterruptBehavior = s.INTERRUPT_NONE;
	s.alternateExtensions = [];
	s.activePlugin = null;
	s._masterVolume = 1;
	s._getMasterVolume = function () {
		return this._masterVolume;
	};
	s.getVolume = createjs.deprecate(s._getMasterVolume, "Sound.getVolume");
	s._setMasterVolume = function (value) {
		if (Number(value) == null) { return; }
		value = Math.max(0, Math.min(1, value));
		s._masterVolume = value;
		if (!this.activePlugin || !this.activePlugin.setVolume || !this.activePlugin.setVolume(value)) {
			var instances = this._instances;
			for (var i = 0, l = instances.length; i < l; i++) {
				instances[i].setMasterVolume(value);
			}
		}
	};
	s.setVolume = createjs.deprecate(s._setMasterVolume, "Sound.setVolume");
	s._masterMute = false;
	s._getMute = function () {
		return this._masterMute;
	};
	s.getMute = createjs.deprecate(s._getMute, "Sound.getMute");
	s._setMute = function (value) {
		if (value == null) { return; }
		this._masterMute = value;
		if (!this.activePlugin || !this.activePlugin.setMute || !this.activePlugin.setMute(value)) {
			var instances = this._instances;
			for (var i = 0, l = instances.length; i < l; i++) {
				instances[i].setMasterMute(value);
			}
		}
	};
	s.setMute = createjs.deprecate(s._setMute, "Sound.setMute");
	s._getCapabilities = function () {
		if (s.activePlugin == null) { return null; }
		return s.activePlugin._capabilities;
	};
	s.getCapabilities = createjs.deprecate(s._getCapabilities, "Sound.getCapabilities");
	Object.defineProperties(s, {
		volume: { get: s._getMasterVolume, set: s._setMasterVolume },
		muted: { get: s._getMute, set: s._setMute },
		capabilities: { get: s._getCapabilities }
	});
	s._pluginsRegistered = false;
	s._lastID = 0;
	s._instances = [];
	s._idHash = {};
	s._preloadHash = {};
	s._defaultPlayPropsHash = {};
	s.addEventListener = null;
	s.removeEventListener = null;
	s.removeAllEventListeners = null;
	s.dispatchEvent = null;
	s.hasEventListener = null;
	s._listeners = null;
	createjs.EventDispatcher.initialize(s);
	s.getPreloadHandlers = function () {
		return {
			callback: createjs.proxy(s.initLoad, s),
			types: ["sound"],
			extensions: s.SUPPORTED_EXTENSIONS
		};
	};
	s._handleLoadComplete = function (event) {
		var src = event.target.getItem().src;
		if (!s._preloadHash[src]) { return; }
		for (var i = 0, l = s._preloadHash[src].length; i < l; i++) {
			var item = s._preloadHash[src][i];
			s._preloadHash[src][i] = true;
			if (!s.hasEventListener("fileload")) { continue; }
			var event = new createjs.Event("fileload");
			event.src = item.src;
			event.id = item.id;
			event.data = item.data;
			event.sprite = item.sprite;
			s.dispatchEvent(event);
		}
	};
	s._handleLoadError = function (event) {
		var src = event.target.getItem().src;
		if (!s._preloadHash[src]) { return; }
		for (var i = 0, l = s._preloadHash[src].length; i < l; i++) {
			var item = s._preloadHash[src][i];
			s._preloadHash[src][i] = false;
			if (!s.hasEventListener("fileerror")) { continue; }
			var event = new createjs.Event("fileerror");
			event.src = item.src;
			event.id = item.id;
			event.data = item.data;
			event.sprite = item.sprite;
			s.dispatchEvent(event);
		}
	};
	s._registerPlugin = function (plugin) {
		if (plugin.isSupported()) {
			s.activePlugin = new plugin();
			return true;
		}
		return false;
	};
	s.registerPlugins = function (plugins) {
		s._pluginsRegistered = true;
		for (var i = 0, l = plugins.length; i < l; i++) {
			if (s._registerPlugin(plugins[i])) {
				return true;
			}
		}
		return false;
	};
	s.initializeDefaultPlugins = function () {
		if (s.activePlugin != null) { return true; }
		if (s._pluginsRegistered) { return false; }
		if (s.registerPlugins([createjs.WebAudioPlugin, createjs.HTMLAudioPlugin])) { return true; }
		return false;
	};
	s.isReady = function () {
		return (s.activePlugin != null);
	};
	s.initLoad = function (loadItem) {
		if (loadItem.type == "video") { return true; }
		return s._registerSound(loadItem);
	};
	s._registerSound = function (loadItem) {
		if (!s.initializeDefaultPlugins()) { return false; }
		var details;
		if (loadItem.src instanceof Object) {
			details = s._parseSrc(loadItem.src);
			details.src = loadItem.path + details.src;
		} else {
			details = s._parsePath(loadItem.src);
		}
		if (details == null) { return false; }
		loadItem.src = details.src;
		loadItem.type = "sound";
		var data = loadItem.data;
		var numChannels = null;
		if (data != null) {
			if (!isNaN(data.channels)) {
				numChannels = parseInt(data.channels);
			} else if (!isNaN(data)) {
				numChannels = parseInt(data);
			}
			if (data.audioSprite) {
				var sp;
				for (var i = data.audioSprite.length; i--;) {
					sp = data.audioSprite[i];
					s._idHash[sp.id] = { src: loadItem.src, startTime: parseInt(sp.startTime), duration: parseInt(sp.duration) };
					if (sp.defaultPlayProps) {
						s._defaultPlayPropsHash[sp.id] = createjs.PlayPropsConfig.create(sp.defaultPlayProps);
					}
				}
			}
		}
		if (loadItem.id != null) { s._idHash[loadItem.id] = { src: loadItem.src } };
		var loader = s.activePlugin.register(loadItem);
		SoundChannel.create(loadItem.src, numChannels);
		if (data == null || !isNaN(data)) {
			loadItem.data = numChannels || SoundChannel.maxPerChannel();
		} else {
			loadItem.data.channels = numChannels || SoundChannel.maxPerChannel();
		}
		if (loader.type) { loadItem.type = loader.type; }
		if (loadItem.defaultPlayProps) {
			s._defaultPlayPropsHash[loadItem.src] = createjs.PlayPropsConfig.create(loadItem.defaultPlayProps);
		}
		return loader;
	};
	s.registerSound = function (src, id, data, basePath, defaultPlayProps) {
		var loadItem = { src: src, id: id, data: data, defaultPlayProps: defaultPlayProps };
		if (src instanceof Object && src.src) {
			basePath = id;
			loadItem = src;
		}
		loadItem = createjs.LoadItem.create(loadItem);
		loadItem.path = basePath;
		if (basePath != null && !(loadItem.src instanceof Object)) { loadItem.src = basePath + loadItem.src; }
		var loader = s._registerSound(loadItem);
		if (!loader) { return false; }
		if (!s._preloadHash[loadItem.src]) { s._preloadHash[loadItem.src] = []; }
		s._preloadHash[loadItem.src].push(loadItem);
		if (s._preloadHash[loadItem.src].length == 1) {
			loader.on("complete", this._handleLoadComplete, this);
			loader.on("error", this._handleLoadError, this);
			s.activePlugin.preload(loader);
		} else {
			if (s._preloadHash[loadItem.src][0] == true) { return true; }
		}
		return loadItem;
	};
	s.registerSounds = function (sounds, basePath) {
		var returnValues = [];
		if (sounds.path) {
			if (!basePath) {
				basePath = sounds.path;
			} else {
				basePath = basePath + sounds.path;
			}
			sounds = sounds.manifest;
		}
		for (var i = 0, l = sounds.length; i < l; i++) {
			returnValues[i] = createjs.Sound.registerSound(sounds[i].src, sounds[i].id, sounds[i].data, basePath, sounds[i].defaultPlayProps);
		}
		return returnValues;
	};
	s.removeSound = function (src, basePath) {
		if (s.activePlugin == null) { return false; }
		if (src instanceof Object && src.src) { src = src.src; }
		var details;
		if (src instanceof Object) {
			details = s._parseSrc(src);
		} else {
			src = s._getSrcById(src).src;
			details = s._parsePath(src);
		}
		if (details == null) { return false; }
		src = details.src;
		if (basePath != null) { src = basePath + src; }
		for (var prop in s._idHash) {
			if (s._idHash[prop].src == src) {
				delete (s._idHash[prop]);
			}
		}
		SoundChannel.removeSrc(src);
		delete (s._preloadHash[src]);
		s.activePlugin.removeSound(src);
		return true;
	};
	s.removeSounds = function (sounds, basePath) {
		var returnValues = [];
		if (sounds.path) {
			if (!basePath) {
				basePath = sounds.path;
			} else {
				basePath = basePath + sounds.path;
			}
			sounds = sounds.manifest;
		}
		for (var i = 0, l = sounds.length; i < l; i++) {
			returnValues[i] = createjs.Sound.removeSound(sounds[i].src, basePath);
		}
		return returnValues;
	};
	s.removeAllSounds = function () {
		s._idHash = {};
		s._preloadHash = {};
		SoundChannel.removeAll();
		if (s.activePlugin) { s.activePlugin.removeAllSounds(); }
	};
	s.loadComplete = function (src) {
		if (!s.isReady()) { return false; }
		var details = s._parsePath(src);
		if (details) {
			src = s._getSrcById(details.src).src;
		} else {
			src = s._getSrcById(src).src;
		}
		if (s._preloadHash[src] == undefined) { return false; }
		return (s._preloadHash[src][0] == true);
	};
	s._parsePath = function (value) {
		if (typeof (value) != "string") { value = value.toString(); }
		var match = value.match(s.FILE_PATTERN);
		if (match == null) { return false; }
		var name = match[4];
		var ext = match[5];
		var c = s.capabilities;
		var i = 0;
		while (!c[ext]) {
			ext = s.alternateExtensions[i++];
			if (i > s.alternateExtensions.length) { return null; }
		}
		value = value.replace("." + match[5], "." + ext);
		var ret = { name: name, src: value, extension: ext };
		return ret;
	};
	s._parseSrc = function (value) {
		var ret = { name: undefined, src: undefined, extension: undefined };
		var c = s.capabilities;
		for (var prop in value) {
			if (value.hasOwnProperty(prop) && c[prop]) {
				ret.src = value[prop];
				ret.extension = prop;
				break;
			}
		}
		if (!ret.src) { return false; }
		var i = ret.src.lastIndexOf("/");
		if (i != -1) {
			ret.name = ret.src.slice(i + 1);
		} else {
			ret.name = ret.src;
		}
		return ret;
	};
	s.play = function (src, props) {
		var playProps = createjs.PlayPropsConfig.create(props);
		var instance = s.createInstance(src, playProps.startTime, playProps.duration);
		var ok = s._playInstance(instance, playProps);
		if (!ok) { instance._playFailed(); }
		return instance;
	};
	s.createInstance = function (src, startTime, duration) {
		if (!s.initializeDefaultPlugins()) { return new createjs.DefaultSoundInstance(src, startTime, duration); }
		var defaultPlayProps = s._defaultPlayPropsHash[src];
		src = s._getSrcById(src);
		var details = s._parsePath(src.src);
		var instance = null;
		if (details != null && details.src != null) {
			SoundChannel.create(details.src);
			if (startTime == null) { startTime = src.startTime; }
			instance = s.activePlugin.create(details.src, startTime, duration || src.duration);
			defaultPlayProps = defaultPlayProps || s._defaultPlayPropsHash[details.src];
			if (defaultPlayProps) {
				instance.applyPlayProps(defaultPlayProps);
			}
		} else {
			instance = new createjs.DefaultSoundInstance(src, startTime, duration);
		}
		instance.uniqueId = s._lastID++;
		return instance;
	};
	s.stop = function () {
		var instances = this._instances;
		for (var i = instances.length; i--;) {
			instances[i].stop();
		}
	};
	s.setDefaultPlayProps = function (src, playProps) {
		src = s._getSrcById(src);
		s._defaultPlayPropsHash[s._parsePath(src.src).src] = createjs.PlayPropsConfig.create(playProps);
	};
	s.getDefaultPlayProps = function (src) {
		src = s._getSrcById(src);
		return s._defaultPlayPropsHash[s._parsePath(src.src).src];
	};
	s._playInstance = function (instance, playProps) {
		var defaultPlayProps = s._defaultPlayPropsHash[instance.src] || {};
		if (playProps.interrupt == null) { playProps.interrupt = defaultPlayProps.interrupt || s.defaultInterruptBehavior };
		if (playProps.delay == null) { playProps.delay = defaultPlayProps.delay || 0; }
		if (playProps.offset == null) { playProps.offset = instance.position; }
		if (playProps.loop == null) { playProps.loop = instance.loop; }
		if (playProps.volume == null) { playProps.volume = instance.volume; }
		if (playProps.pan == null) { playProps.pan = instance.pan; }
		if (playProps.delay == 0) {
			var ok = s._beginPlaying(instance, playProps);
			if (!ok) { return false; }
		} else {
			//Note that we can't pass arguments to proxy OR setTimeout (IE only), so just wrap the function call.
			var delayTimeoutId = setTimeout(function () {
				s._beginPlaying(instance, playProps);
			}, playProps.delay);
			instance.delayTimeoutId = delayTimeoutId;
		}
		this._instances.push(instance);
		return true;
	};
	s._beginPlaying = function (instance, playProps) {
		if (!SoundChannel.add(instance, playProps.interrupt)) {
			return false;
		}
		var result = instance._beginPlaying(playProps);
		if (!result) {
			var index = createjs.indexOf(this._instances, instance);
			if (index > -1) { this._instances.splice(index, 1); }
			return false;
		}
		return true;
	};
	s._getSrcById = function (value) {
		return s._idHash[value] || { src: value };
	};
	s._playFinished = function (instance) {
		SoundChannel.remove(instance);
		var index = createjs.indexOf(this._instances, instance);
		if (index > -1) { this._instances.splice(index, 1); }
	};
	createjs.Sound = Sound;
	function SoundChannel(src, max) {
		this.init(src, max);
	}
	SoundChannel.channels = {};
	SoundChannel.create = function (src, max) {
		var channel = SoundChannel.get(src);
		if (channel == null) {
			SoundChannel.channels[src] = new SoundChannel(src, max);
			return true;
		}
		return false;
	};
	SoundChannel.removeSrc = function (src) {
		var channel = SoundChannel.get(src);
		if (channel == null) { return false; }
		channel._removeAll();
		delete (SoundChannel.channels[src]);
		return true;
	};
	SoundChannel.removeAll = function () {
		for (var channel in SoundChannel.channels) {
			SoundChannel.channels[channel]._removeAll();
		}
		SoundChannel.channels = {};
	};
	SoundChannel.add = function (instance, interrupt) {
		var channel = SoundChannel.get(instance.src);
		if (channel == null) { return false; }
		return channel._add(instance, interrupt);
	};
	SoundChannel.remove = function (instance) {
		var channel = SoundChannel.get(instance.src);
		if (channel == null) { return false; }
		channel._remove(instance);
		return true;
	};
	SoundChannel.maxPerChannel = function () {
		return p.maxDefault;
	};
	SoundChannel.get = function (src) {
		return SoundChannel.channels[src];
	};
	var p = SoundChannel.prototype;
	p.constructor = SoundChannel;
	p.src = null;
	p.max = null;
	p.maxDefault = 100;
	p.length = 0;
	p.init = function (src, max) {
		this.src = src;
		this.max = max || this.maxDefault;
		if (this.max == -1) { this.max = this.maxDefault; }
		this._instances = [];
	};
	p._get = function (index) {
		return this._instances[index];
	};
	p._add = function (instance, interrupt) {
		if (!this._getSlot(interrupt, instance)) { return false; }
		this._instances.push(instance);
		this.length++;
		return true;
	};
	p._remove = function (instance) {
		var index = createjs.indexOf(this._instances, instance);
		if (index == -1) { return false; }
		this._instances.splice(index, 1);
		this.length--;
		return true;
	};
	p._removeAll = function () {
		for (var i = this.length - 1; i >= 0; i--) {
			this._instances[i].stop();
		}
	};
	p._getSlot = function (interrupt, instance) {
		var target, replacement;
		if (interrupt != Sound.INTERRUPT_NONE) {
			replacement = this._get(0);
			if (replacement == null) {
				return true;
			}
		}
		for (var i = 0, l = this.max; i < l; i++) {
			target = this._get(i);
			if (target == null) {
				return true;
			}
			if (target.playState == Sound.PLAY_FINISHED ||
				target.playState == Sound.PLAY_INTERRUPTED ||
				target.playState == Sound.PLAY_FAILED) {
				replacement = target;
				break;
			}
			if (interrupt == Sound.INTERRUPT_NONE) {
				continue;
			}
			if ((interrupt == Sound.INTERRUPT_EARLY && target.position < replacement.position) ||
				(interrupt == Sound.INTERRUPT_LATE && target.position > replacement.position)) {
				replacement = target;
			}
		}
		if (replacement != null) {
			replacement._interrupt();
			this._remove(replacement);
			return true;
		}
		return false;
	};
	p.toString = function () {
		return "[Sound SoundChannel]";
	};
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	var AbstractSoundInstance = function (src, startTime, duration, playbackResource) {
		this.EventDispatcher_constructor();
		this.src = src;
		this.uniqueId = -1;
		this.playState = null;
		this.delayTimeoutId = null;
		this._volume = 1;
		Object.defineProperty(this, "volume", {
			get: this._getVolume,
			set: this._setVolume
		});
		this._pan = 0;
		Object.defineProperty(this, "pan", {
			get: this._getPan,
			set: this._setPan
		});
		this._startTime = Math.max(0, startTime || 0);
		Object.defineProperty(this, "startTime", {
			get: this._getStartTime,
			set: this._setStartTime
		});
		this._duration = Math.max(0, duration || 0);
		Object.defineProperty(this, "duration", {
			get: this._getDuration,
			set: this._setDuration
		});
		this._playbackResource = null;
		Object.defineProperty(this, "playbackResource", {
			get: this._getPlaybackResource,
			set: this._setPlaybackResource
		});
		if (playbackResource !== false && playbackResource !== true) { this._setPlaybackResource(playbackResource); }
		this._position = 0;
		Object.defineProperty(this, "position", {
			get: this._getPosition,
			set: this._setPosition
		});
		this._loop = 0;
		Object.defineProperty(this, "loop", {
			get: this._getLoop,
			set: this._setLoop
		});
		this._muted = false;
		Object.defineProperty(this, "muted", {
			get: this._getMuted,
			set: this._setMuted
		});
		this._paused = false;
		Object.defineProperty(this, "paused", {
			get: this._getPaused,
			set: this._setPaused
		});
	};
	var p = createjs.extend(AbstractSoundInstance, createjs.EventDispatcher);
	p.play = function (props) {
		var playProps = createjs.PlayPropsConfig.create(props);
		if (this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			this.applyPlayProps(playProps);
			if (this._paused) { this._setPaused(false); }
			return;
		}
		this._cleanUp();
		createjs.Sound._playInstance(this, playProps);
		return this;
	};
	p.stop = function () {
		this._position = 0;
		this._paused = false;
		this._handleStop();
		this._cleanUp();
		this.playState = createjs.Sound.PLAY_FINISHED;
		return this;
	};
	p.destroy = function () {
		this._cleanUp();
		this.src = null;
		this.playbackResource = null;
		this.removeAllEventListeners();
	};
	p.applyPlayProps = function (playProps) {
		if (playProps.offset != null) { this._setPosition(playProps.offset) }
		if (playProps.loop != null) { this._setLoop(playProps.loop); }
		if (playProps.volume != null) { this._setVolume(playProps.volume); }
		if (playProps.pan != null) { this._setPan(playProps.pan); }
		if (playProps.startTime != null) {
			this._setStartTime(playProps.startTime);
			this._setDuration(playProps.duration);
		}
		return this;
	};
	p.toString = function () {
		return "[AbstractSoundInstance]";
	};
	p._getPaused = function () {
		return this._paused;
	};
	p._setPaused = function (value) {
		if ((value !== true && value !== false) || this._paused == value) { return; }
		if (value == true && this.playState != createjs.Sound.PLAY_SUCCEEDED) { return; }
		this._paused = value;
		if (value) {
			this._pause();
		} else {
			this._resume();
		}
		clearTimeout(this.delayTimeoutId);
		return this;
	};
	p._setVolume = function (value) {
		if (value == this._volume) { return this; }
		this._volume = Math.max(0, Math.min(1, value));
		if (!this._muted) {
			this._updateVolume();
		}
		return this;
	};
	p._getVolume = function () {
		return this._volume;
	};
	p._setMuted = function (value) {
		if (value !== true && value !== false) { return; }
		this._muted = value;
		this._updateVolume();
		return this;
	};
	p._getMuted = function () {
		return this._muted;
	};
	p._setPan = function (value) {
		if (value == this._pan) { return this; }
		this._pan = Math.max(-1, Math.min(1, value));
		this._updatePan();
		return this;
	};
	p._getPan = function () {
		return this._pan;
	};
	p._getPosition = function () {
		if (!this._paused && this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			this._position = this._calculateCurrentPosition();
		}
		return this._position;
	};
	p._setPosition = function (value) {
		this._position = Math.max(0, value);
		if (this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			this._updatePosition();
		}
		return this;
	};
	p._getStartTime = function () {
		return this._startTime;
	};
	p._setStartTime = function (value) {
		if (value == this._startTime) { return this; }
		this._startTime = Math.max(0, value || 0);
		this._updateStartTime();
		return this;
	};
	p._getDuration = function () {
		return this._duration;
	};
	p._setDuration = function (value) {
		if (value == this._duration) { return this; }
		this._duration = Math.max(0, value || 0);
		this._updateDuration();
		return this;
	};
	p._setPlaybackResource = function (value) {
		this._playbackResource = value;
		if (this._duration == 0 && this._playbackResource) { this._setDurationFromSource(); }
		return this;
	};
	p._getPlaybackResource = function () {
		return this._playbackResource;
	};
	p._getLoop = function () {
		return this._loop;
	};
	p._setLoop = function (value) {
		if (this._playbackResource != null) {
			if (this._loop != 0 && value == 0) {
				this._removeLooping(value);
			}
			else if (this._loop == 0 && value != 0) {
				this._addLooping(value);
			}
		}
		this._loop = value;
	};
	p._sendEvent = function (type) {
		var event = new createjs.Event(type);
		this.dispatchEvent(event);
	};
	p._cleanUp = function () {
		clearTimeout(this.delayTimeoutId);
		this._handleCleanUp();
		this._paused = false;
		createjs.Sound._playFinished(this);
	};
	p._interrupt = function () {
		this._cleanUp();
		this.playState = createjs.Sound.PLAY_INTERRUPTED;
		this._sendEvent("interrupted");
	};
	p._beginPlaying = function (playProps) {
		this._setPosition(playProps.offset);
		this._setLoop(playProps.loop);
		this._setVolume(playProps.volume);
		this._setPan(playProps.pan);
		if (playProps.startTime != null) {
			this._setStartTime(playProps.startTime);
			this._setDuration(playProps.duration);
		}
		if (this._playbackResource != null && this._position < this._duration) {
			this._paused = false;
			this._handleSoundReady();
			this.playState = createjs.Sound.PLAY_SUCCEEDED;
			this._sendEvent("succeeded");
			return true;
		} else {
			this._playFailed();
			return false;
		}
	};
	p._playFailed = function () {
		this._cleanUp();
		this.playState = createjs.Sound.PLAY_FAILED;
		this._sendEvent("failed");
	};
	p._handleSoundComplete = function (event) {
		this._position = 0;
		if (this._loop != 0) {
			this._loop--;
			this._handleLoop();
			this._sendEvent("loop");
			return;
		}
		this._cleanUp();
		this.playState = createjs.Sound.PLAY_FINISHED;
		this._sendEvent("complete");
	};
	p._handleSoundReady = function () {
	};
	p._updateVolume = function () {
	};
	p._updatePan = function () {
	};
	p._updateStartTime = function () {
	};
	p._updateDuration = function () {
	};
	p._setDurationFromSource = function () {
	};
	p._calculateCurrentPosition = function () {
	};
	p._updatePosition = function () {
	};
	p._removeLooping = function (value) {
	};
	p._addLooping = function (value) {
	};
	p._pause = function () {
	};
	p._resume = function () {
	};
	p._handleStop = function () {
	};
	p._handleCleanUp = function () {
	};
	p._handleLoop = function () {
	};
	createjs.AbstractSoundInstance = createjs.promote(AbstractSoundInstance, "EventDispatcher");
	createjs.DefaultSoundInstance = createjs.AbstractSoundInstance;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	var AbstractPlugin = function () {
		this._capabilities = null;
		this._loaders = {};
		this._audioSources = {};
		this._soundInstances = {};
		this._volume = 1;
		this._loaderClass;
		this._soundInstanceClass;
	};
	var p = AbstractPlugin.prototype;
	AbstractPlugin._capabilities = null;
	AbstractPlugin.isSupported = function () {
		return true;
	};
	p.register = function (loadItem) {
		var loader = this._loaders[loadItem.src];
		if (loader && !loader.canceled) { return this._loaders[loadItem.src]; }
		this._audioSources[loadItem.src] = true;
		this._soundInstances[loadItem.src] = [];
		loader = new this._loaderClass(loadItem);
		loader.on("complete", this._handlePreloadComplete, this);
		this._loaders[loadItem.src] = loader;
		return loader;
	};
	p.preload = function (loader) {
		loader.on("error", this._handlePreloadError, this);
		loader.load();
	};
	p.isPreloadStarted = function (src) {
		return (this._audioSources[src] != null);
	};
	p.isPreloadComplete = function (src) {
		return (!(this._audioSources[src] == null || this._audioSources[src] == true));
	};
	p.removeSound = function (src) {
		if (!this._soundInstances[src]) { return; }
		for (var i = this._soundInstances[src].length; i--;) {
			var item = this._soundInstances[src][i];
			item.destroy();
		}
		delete (this._soundInstances[src]);
		delete (this._audioSources[src]);
		if (this._loaders[src]) { this._loaders[src].destroy(); }
		delete (this._loaders[src]);
	};
	p.removeAllSounds = function () {
		for (var key in this._audioSources) {
			this.removeSound(key);
		}
	};
	p.create = function (src, startTime, duration) {
		if (!this.isPreloadStarted(src)) {
			this.preload(this.register(src));
		}
		var si = new this._soundInstanceClass(src, startTime, duration, this._audioSources[src]);
		if (this._soundInstances[src]) {
			this._soundInstances[src].push(si);
		}
		si.setMasterVolume && si.setMasterVolume(createjs.Sound.volume);
		si.setMasterMute && si.setMasterMute(createjs.Sound.muted);
		return si;
	};
	p.setVolume = function (value) {
		this._volume = value;
		this._updateVolume();
		return true;
	};
	p.getVolume = function () {
		return this._volume;
	};
	p.setMute = function (value) {
		this._updateVolume();
		return true;
	};
	p.toString = function () {
		return "[AbstractPlugin]";
	};
	p._handlePreloadComplete = function (event) {
		var src = event.target.getItem().src;
		this._audioSources[src] = event.result;
		for (var i = 0, l = this._soundInstances[src].length; i < l; i++) {
			var item = this._soundInstances[src][i];
			item.setPlaybackResource(this._audioSources[src]);
			this._soundInstances[src] = null;
		}
	};
	p._handlePreloadError = function (event) {
		//delete(this._audioSources[src]);
	};
	p._updateVolume = function () {
	};
	createjs.AbstractPlugin = AbstractPlugin;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Loader(loadItem) {
		this.AbstractLoader_constructor(loadItem, true, createjs.Types.SOUND);
	};
	var p = createjs.extend(Loader, createjs.AbstractLoader);
	Loader.context = null;
	p.toString = function () {
		return "[WebAudioLoader]";
	};
	p._createRequest = function () {
		this._request = new createjs.XHRRequest(this._item, false);
		this._request.setResponseType("arraybuffer");
	};
	p._sendComplete = function (event) {
		Loader.context.decodeAudioData(this._rawResult,
			createjs.proxy(this._handleAudioDecoded, this),
			createjs.proxy(this._sendError, this));
	};
	p._handleAudioDecoded = function (decodedAudio) {
		this._result = decodedAudio;
		this.AbstractLoader__sendComplete();
	};
	createjs.WebAudioLoader = createjs.promote(Loader, "AbstractLoader");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function WebAudioSoundInstance(src, startTime, duration, playbackResource) {
		this.AbstractSoundInstance_constructor(src, startTime, duration, playbackResource);
		this.gainNode = s.context.createGain();
		this.panNode = s.context.createPanner();
		this.panNode.panningModel = s._panningModel;
		this.panNode.connect(this.gainNode);
		this._updatePan();
		this.sourceNode = null;
		this._soundCompleteTimeout = null;
		this._sourceNodeNext = null;
		this._playbackStartTime = 0;
		this._endedHandler = createjs.proxy(this._handleSoundComplete, this);
	};
	var p = createjs.extend(WebAudioSoundInstance, createjs.AbstractSoundInstance);
	var s = WebAudioSoundInstance;
	s.context = null;
	s._scratchBuffer = null;
	s.destinationNode = null;
	s._panningModel = "equalpower";
	p.destroy = function () {
		this.AbstractSoundInstance_destroy();
		this.panNode.disconnect(0);
		this.panNode = null;
		this.gainNode.disconnect(0);
		this.gainNode = null;
	};
	p.toString = function () {
		return "[WebAudioSoundInstance]";
	};
	p._updatePan = function () {
		this.panNode.setPosition(this._pan, 0, -0.5);
	};
	p._removeLooping = function (value) {
		this._sourceNodeNext = this._cleanUpAudioNode(this._sourceNodeNext);
	};
	p._addLooping = function (value) {
		if (this.playState != createjs.Sound.PLAY_SUCCEEDED) { return; }
		this._sourceNodeNext = this._createAndPlayAudioNode(this._playbackStartTime, 0);
	};
	p._setDurationFromSource = function () {
		this._duration = this.playbackResource.duration * 1000;
	};
	p._handleCleanUp = function () {
		if (this.sourceNode && this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			this.sourceNode = this._cleanUpAudioNode(this.sourceNode);
			this._sourceNodeNext = this._cleanUpAudioNode(this._sourceNodeNext);
		}
		if (this.gainNode.numberOfOutputs != 0) { this.gainNode.disconnect(0); }
		clearTimeout(this._soundCompleteTimeout);
		this._playbackStartTime = 0;
	};
	p._cleanUpAudioNode = function (audioNode) {
		if (audioNode) {
			audioNode.stop(0);
			audioNode.disconnect(0);
			if (createjs.BrowserDetect.isIOS) {
				try { audioNode.buffer = s._scratchBuffer; } catch (e) { }
			}
			audioNode = null;
		}
		return audioNode;
	};
	p._handleSoundReady = function (event) {
		this.gainNode.connect(s.destinationNode);
		var dur = this._duration * 0.001,
			pos = Math.min(Math.max(0, this._position) * 0.001, dur);
		this.sourceNode = this._createAndPlayAudioNode((s.context.currentTime - dur), pos);
		this._playbackStartTime = this.sourceNode.startTime - pos;
		this._soundCompleteTimeout = setTimeout(this._endedHandler, (dur - pos) * 1000);
		if (this._loop != 0) {
			this._sourceNodeNext = this._createAndPlayAudioNode(this._playbackStartTime, 0);
		}
	};
	p._createAndPlayAudioNode = function (startTime, offset) {
		var audioNode = s.context.createBufferSource();
		audioNode.buffer = this.playbackResource;
		audioNode.connect(this.panNode);
		var dur = this._duration * 0.001;
		audioNode.startTime = startTime + dur;
		audioNode.start(audioNode.startTime, offset + (this._startTime * 0.001), dur - offset);
		return audioNode;
	};
	p._pause = function () {
		this._position = (s.context.currentTime - this._playbackStartTime) * 1000;
		this.sourceNode = this._cleanUpAudioNode(this.sourceNode);
		this._sourceNodeNext = this._cleanUpAudioNode(this._sourceNodeNext);
		if (this.gainNode.numberOfOutputs != 0) { this.gainNode.disconnect(0); }
		clearTimeout(this._soundCompleteTimeout);
	};
	p._resume = function () {
		this._handleSoundReady();
	};
	p._updateVolume = function () {
		var newVolume = this._muted ? 0 : this._volume;
		if (newVolume != this.gainNode.gain.value) {
			this.gainNode.gain.value = newVolume;
		}
	};
	p._calculateCurrentPosition = function () {
		return ((s.context.currentTime - this._playbackStartTime) * 1000);
	};
	p._updatePosition = function () {
		this.sourceNode = this._cleanUpAudioNode(this.sourceNode);
		this._sourceNodeNext = this._cleanUpAudioNode(this._sourceNodeNext);
		clearTimeout(this._soundCompleteTimeout);
		if (!this._paused) { this._handleSoundReady(); }
	};
	p._handleLoop = function () {
		this._cleanUpAudioNode(this.sourceNode);
		this.sourceNode = this._sourceNodeNext;
		this._playbackStartTime = this.sourceNode.startTime;
		this._sourceNodeNext = this._createAndPlayAudioNode(this._playbackStartTime, 0);
		this._soundCompleteTimeout = setTimeout(this._endedHandler, this._duration);
	};
	p._updateDuration = function () {
		if (this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			this._pause();
			this._resume();
		}
	};
	createjs.WebAudioSoundInstance = createjs.promote(WebAudioSoundInstance, "AbstractSoundInstance");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function WebAudioPlugin() {
		this.AbstractPlugin_constructor();
		this._panningModel = s._panningModel;;
		this.context = s.context;
		this.dynamicsCompressorNode = this.context.createDynamicsCompressor();
		this.dynamicsCompressorNode.connect(this.context.destination);
		this.gainNode = this.context.createGain();
		this.gainNode.connect(this.dynamicsCompressorNode);
		createjs.WebAudioSoundInstance.destinationNode = this.gainNode;
		this._capabilities = s._capabilities;
		this._loaderClass = createjs.WebAudioLoader;
		this._soundInstanceClass = createjs.WebAudioSoundInstance;
		this._addPropsToClasses();
	}
	var p = createjs.extend(WebAudioPlugin, createjs.AbstractPlugin);
	var s = WebAudioPlugin;
	s._capabilities = null;
	s._panningModel = "equalpower";
	s.context = null;
	s._scratchBuffer = null;
	s._unlocked = false;
	s.DEFAULT_SAMPLE_RATE = 44100;
	s.isSupported = function () {
		var isMobilePhoneGap = createjs.BrowserDetect.isIOS || createjs.BrowserDetect.isAndroid || createjs.BrowserDetect.isBlackberry;
		if (location.protocol == "file:" && !isMobilePhoneGap && !this._isFileXHRSupported()) { return false; }
		s._generateCapabilities();
		if (s.context == null) { return false; }
		return true;
	};
	s.playEmptySound = function () {
		if (s.context == null) { return; }
		var source = s.context.createBufferSource();
		source.buffer = s._scratchBuffer;
		source.connect(s.context.destination);
		source.start(0, 0, 0);
	};
	s._isFileXHRSupported = function () {
		var supported = true;
		var xhr = new XMLHttpRequest();
		try {
			xhr.open("GET", "WebAudioPluginTest.fail", false);
		} catch (error) {
			supported = false;
			return supported;
		}
		xhr.onerror = function () { supported = false; };
		xhr.onload = function () { supported = this.status == 404 || (this.status == 200 || (this.status == 0 && this.response != "")); };
		try {
			xhr.send();
		} catch (error) {
			supported = false;
		}
		return supported;
	};
	s._generateCapabilities = function () {
		if (s._capabilities != null) { return; }
		var t = document.createElement("audio");
		if (t.canPlayType == null) { return null; }
		if (s.context == null) {
			s.context = s._createAudioContext();
			if (s.context == null) { return null; }
		}
		if (s._scratchBuffer == null) {
			s._scratchBuffer = s.context.createBuffer(1, 1, 22050);
		}
		s._compatibilitySetUp();
		if ("ontouchstart" in window && s.context.state != "running") {
			s._unlock();
			document.addEventListener("mousedown", s._unlock, true);
			document.addEventListener("touchstart", s._unlock, true);
			document.addEventListener("touchend", s._unlock, true);
		}
		s._capabilities = {
			panning: true,
			volume: true,
			tracks: -1
		};
		var supportedExtensions = createjs.Sound.SUPPORTED_EXTENSIONS;
		var extensionMap = createjs.Sound.EXTENSION_MAP;
		for (var i = 0, l = supportedExtensions.length; i < l; i++) {
			var ext = supportedExtensions[i];
			var playType = extensionMap[ext] || ext;
			s._capabilities[ext] = (t.canPlayType("audio/" + ext) != "no" && t.canPlayType("audio/" + ext) != "") || (t.canPlayType("audio/" + playType) != "no" && t.canPlayType("audio/" + playType) != "");
		}
		if (s.context.destination.numberOfChannels < 2) {
			s._capabilities.panning = false;
		}
	};
	s._createAudioContext = function () {
		var AudioCtor = (window.AudioContext || window.webkitAudioContext);
		if (AudioCtor == null) { return null; }
		var context = new AudioCtor();
		if (/(iPhone|iPad)/i.test(navigator.userAgent)
			&& context.sampleRate !== s.DEFAULT_SAMPLE_RATE) {
			var buffer = context.createBuffer(1, 1, s.DEFAULT_SAMPLE_RATE),
				dummy = context.createBufferSource();
			dummy.buffer = buffer;
			dummy.connect(context.destination);
			dummy.start(0);
			dummy.disconnect();
			context.close()
			context = new AudioCtor();
		}
		return context;
	}
	s._compatibilitySetUp = function () {
		s._panningModel = "equalpower";
		//assume that if one new call is supported, they all are
		if (s.context.createGain) { return; }
		s.context.createGain = s.context.createGainNode;
		var audioNode = s.context.createBufferSource();
		audioNode.__proto__.start = audioNode.__proto__.noteGrainOn;
		audioNode.__proto__.stop = audioNode.__proto__.noteOff;
		s._panningModel = 0;
	};
	s._unlock = function () {
		if (s._unlocked) { return; }
		s.playEmptySound();
		if (s.context.state == "running") {
			document.removeEventListener("mousedown", s._unlock, true);
			document.removeEventListener("touchend", s._unlock, true);
			document.removeEventListener("touchstart", s._unlock, true);
			s._unlocked = true;
		}
	};
	p.toString = function () {
		return "[WebAudioPlugin]";
	};
	p._addPropsToClasses = function () {
		var c = this._soundInstanceClass;
		c.context = this.context;
		c._scratchBuffer = s._scratchBuffer;
		c.destinationNode = this.gainNode;
		c._panningModel = this._panningModel;
		this._loaderClass.context = this.context;
	};
	p._updateVolume = function () {
		var newVolume = createjs.Sound._masterMute ? 0 : this._volume;
		if (newVolume != this.gainNode.gain.value) {
			this.gainNode.gain.value = newVolume;
		}
	};
	createjs.WebAudioPlugin = createjs.promote(WebAudioPlugin, "AbstractPlugin");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function HTMLAudioTagPool() {
		throw "HTMLAudioTagPool cannot be instantiated";
	}
	var s = HTMLAudioTagPool;
	s._tags = {};
	s._tagPool = new TagPool();
	s._tagUsed = {};
	s.get = function (src) {
		var t = s._tags[src];
		if (t == null) {
			t = s._tags[src] = s._tagPool.get();
			t.src = src;
		} else {
			if (s._tagUsed[src]) {
				t = s._tagPool.get();
				t.src = src;
			} else {
				s._tagUsed[src] = true;
			}
		}
		return t;
	};
	s.set = function (src, tag) {
		if (tag == s._tags[src]) {
			s._tagUsed[src] = false;
		} else {
			s._tagPool.set(tag);
		}
	};
	s.remove = function (src) {
		var tag = s._tags[src];
		if (tag == null) { return false; }
		s._tagPool.set(tag);
		delete (s._tags[src]);
		delete (s._tagUsed[src]);
		return true;
	};
	s.getDuration = function (src) {
		var t = s._tags[src];
		if (t == null || !t.duration) { return 0; }
		return t.duration * 1000;
	};
	createjs.HTMLAudioTagPool = HTMLAudioTagPool;
	function TagPool(src) {
		this._tags = [];
	};
	var p = TagPool.prototype;
	p.constructor = TagPool;
	p.get = function () {
		var tag;
		if (this._tags.length == 0) {
			tag = this._createTag();
		} else {
			tag = this._tags.pop();
		}
		if (tag.parentNode == null) { document.body.appendChild(tag); }
		return tag;
	};
	p.set = function (tag) {
		var index = createjs.indexOf(this._tags, tag);
		if (index == -1) {
			this._tags.src = null;
			this._tags.push(tag);
		}
	};
	p.toString = function () {
		return "[TagPool]";
	};
	p._createTag = function () {
		var tag = document.createElement("audio");
		tag.autoplay = false;
		tag.preload = "none";
		//LM: Firefox fails when this the preload="none" for other tags, but it needs to be "none" to ensure PreloadJS works.
		return tag;
	};
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function HTMLAudioSoundInstance(src, startTime, duration, playbackResource) {
		this.AbstractSoundInstance_constructor(src, startTime, duration, playbackResource);
		this._audioSpriteStopTime = null;
		this._delayTimeoutId = null;
		this._endedHandler = createjs.proxy(this._handleSoundComplete, this);
		this._readyHandler = createjs.proxy(this._handleTagReady, this);
		this._stalledHandler = createjs.proxy(this._playFailed, this);
		this._audioSpriteEndHandler = createjs.proxy(this._handleAudioSpriteLoop, this);
		this._loopHandler = createjs.proxy(this._handleSoundComplete, this);
		if (duration) {
			this._audioSpriteStopTime = (startTime + duration) * 0.001;
		} else {
			this._duration = createjs.HTMLAudioTagPool.getDuration(this.src);
		}
	}
	var p = createjs.extend(HTMLAudioSoundInstance, createjs.AbstractSoundInstance);
	p.setMasterVolume = function (value) {
		this._updateVolume();
	};
	p.setMasterMute = function (isMuted) {
		this._updateVolume();
	};
	p.toString = function () {
		return "[HTMLAudioSoundInstance]";
	};
	//Private Methods
	p._removeLooping = function () {
		if (this._playbackResource == null) { return; }
		this._playbackResource.loop = false;
		this._playbackResource.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._loopHandler, false);
	};
	p._addLooping = function () {
		if (this._playbackResource == null || this._audioSpriteStopTime) { return; }
		this._playbackResource.addEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._loopHandler, false);
		this._playbackResource.loop = true;
	};
	p._handleCleanUp = function () {
		var tag = this._playbackResource;
		if (tag != null) {
			tag.pause();
			tag.loop = false;
			tag.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_ENDED, this._endedHandler, false);
			tag.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_READY, this._readyHandler, false);
			tag.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_STALLED, this._stalledHandler, false);
			tag.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._loopHandler, false);
			tag.removeEventListener(createjs.HTMLAudioPlugin._TIME_UPDATE, this._audioSpriteEndHandler, false);
			try {
				tag.currentTime = this._startTime;
			} catch (e) {
			}
			createjs.HTMLAudioTagPool.set(this.src, tag);
			this._playbackResource = null;
		}
	};
	p._beginPlaying = function (playProps) {
		this._playbackResource = createjs.HTMLAudioTagPool.get(this.src);
		return this.AbstractSoundInstance__beginPlaying(playProps);
	};
	p._handleSoundReady = function (event) {
		if (this._playbackResource.readyState !== 4) {
			var tag = this._playbackResource;
			tag.addEventListener(createjs.HTMLAudioPlugin._AUDIO_READY, this._readyHandler, false);
			tag.addEventListener(createjs.HTMLAudioPlugin._AUDIO_STALLED, this._stalledHandler, false);
			tag.preload = "auto";
			tag.load();
			return;
		}
		this._updateVolume();
		this._playbackResource.currentTime = (this._startTime + this._position) * 0.001;
		if (this._audioSpriteStopTime) {
			this._playbackResource.addEventListener(createjs.HTMLAudioPlugin._TIME_UPDATE, this._audioSpriteEndHandler, false);
		} else {
			this._playbackResource.addEventListener(createjs.HTMLAudioPlugin._AUDIO_ENDED, this._endedHandler, false);
			if (this._loop != 0) {
				this._playbackResource.addEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._loopHandler, false);
				this._playbackResource.loop = true;
			}
		}
		this._playbackResource.play();
	};
	p._handleTagReady = function (event) {
		this._playbackResource.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_READY, this._readyHandler, false);
		this._playbackResource.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_STALLED, this._stalledHandler, false);
		this._handleSoundReady();
	};
	p._pause = function () {
		this._playbackResource.pause();
	};
	p._resume = function () {
		this._playbackResource.play();
	};
	p._updateVolume = function () {
		if (this._playbackResource != null) {
			var newVolume = (this._muted || createjs.Sound._masterMute) ? 0 : this._volume * createjs.Sound._masterVolume;
			if (newVolume != this._playbackResource.volume) { this._playbackResource.volume = newVolume; }
		}
	};
	p._calculateCurrentPosition = function () {
		return (this._playbackResource.currentTime * 1000) - this._startTime;
	};
	p._updatePosition = function () {
		this._playbackResource.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._loopHandler, false);
		this._playbackResource.addEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._handleSetPositionSeek, false);
		try {
			this._playbackResource.currentTime = (this._position + this._startTime) * 0.001;
		} catch (error) {
			this._handleSetPositionSeek(null);
		}
	};
	p._handleSetPositionSeek = function (event) {
		if (this._playbackResource == null) { return; }
		this._playbackResource.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._handleSetPositionSeek, false);
		this._playbackResource.addEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._loopHandler, false);
	};
	p._handleAudioSpriteLoop = function (event) {
		if (this._playbackResource.currentTime <= this._audioSpriteStopTime) { return; }
		this._playbackResource.pause();
		if (this._loop == 0) {
			this._handleSoundComplete(null);
		} else {
			this._position = 0;
			this._loop--;
			this._playbackResource.currentTime = this._startTime * 0.001;
			if (!this._paused) { this._playbackResource.play(); }
			this._sendEvent("loop");
		}
	};
	p._handleLoop = function (event) {
		if (this._loop == 0) {
			this._playbackResource.loop = false;
			this._playbackResource.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_SEEKED, this._loopHandler, false);
		}
	};
	p._updateStartTime = function () {
		this._audioSpriteStopTime = (this._startTime + this._duration) * 0.001;
		if (this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			this._playbackResource.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_ENDED, this._endedHandler, false);
			this._playbackResource.addEventListener(createjs.HTMLAudioPlugin._TIME_UPDATE, this._audioSpriteEndHandler, false);
		}
	};
	p._updateDuration = function () {
		this._audioSpriteStopTime = (this._startTime + this._duration) * 0.001;
		if (this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			this._playbackResource.removeEventListener(createjs.HTMLAudioPlugin._AUDIO_ENDED, this._endedHandler, false);
			this._playbackResource.addEventListener(createjs.HTMLAudioPlugin._TIME_UPDATE, this._audioSpriteEndHandler, false);
		}
	};
	p._setDurationFromSource = function () {
		this._duration = createjs.HTMLAudioTagPool.getDuration(this.src);
		this._playbackResource = null;
	};
	createjs.HTMLAudioSoundInstance = createjs.promote(HTMLAudioSoundInstance, "AbstractSoundInstance");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function HTMLAudioPlugin() {
		this.AbstractPlugin_constructor();
		this._capabilities = s._capabilities;
		this._loaderClass = createjs.SoundLoader;
		this._soundInstanceClass = createjs.HTMLAudioSoundInstance;
	}
	var p = createjs.extend(HTMLAudioPlugin, createjs.AbstractPlugin);
	var s = HTMLAudioPlugin;
	s.MAX_INSTANCES = 30;
	s._AUDIO_READY = "canplaythrough";
	s._AUDIO_ENDED = "ended";
	s._AUDIO_SEEKED = "seeked";
	s._AUDIO_STALLED = "stalled";
	s._TIME_UPDATE = "timeupdate";
	s._capabilities = null;
	s.isSupported = function () {
		s._generateCapabilities();
		return (s._capabilities != null);
	};
	s._generateCapabilities = function () {
		if (s._capabilities != null) { return; }
		var t = document.createElement("audio");
		if (t.canPlayType == null) { return null; }
		s._capabilities = {
			panning: false,
			volume: true,
			tracks: -1
		};
		var supportedExtensions = createjs.Sound.SUPPORTED_EXTENSIONS;
		var extensionMap = createjs.Sound.EXTENSION_MAP;
		for (var i = 0, l = supportedExtensions.length; i < l; i++) {
			var ext = supportedExtensions[i];
			var playType = extensionMap[ext] || ext;
			s._capabilities[ext] = (t.canPlayType("audio/" + ext) != "no" && t.canPlayType("audio/" + ext) != "") || (t.canPlayType("audio/" + playType) != "no" && t.canPlayType("audio/" + playType) != "");
		}
	};
	p.register = function (loadItem) {
		var tag = createjs.HTMLAudioTagPool.get(loadItem.src);
		var loader = this.AbstractPlugin_register(loadItem);
		loader.setTag(tag);
		return loader;
	};
	p.removeSound = function (src) {
		this.AbstractPlugin_removeSound(src);
		createjs.HTMLAudioTagPool.remove(src);
	};
	p.create = function (src, startTime, duration) {
		var si = this.AbstractPlugin_create(src, startTime, duration);
		si.playbackResource = null;
		return si;
	};
	p.toString = function () {
		return "[HTMLAudioPlugin]";
	};
	p.setVolume = p.getVolume = p.setMute = null;
	createjs.HTMLAudioPlugin = createjs.promote(HTMLAudioPlugin, "AbstractPlugin");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function AbstractTween(props) {
		this.EventDispatcher_constructor();
		this.ignoreGlobalPause = false;
		this.loop = 0;
		this.useTicks = false;
		this.reversed = false;
		this.bounce = false;
		this.timeScale = 1;
		this.duration = 0;
		this.position = 0;
		this.rawPosition = -1;
		this._paused = true;
		this._next = null;
		this._prev = null;
		this._parent = null;
		this._labels = null;
		this._labelList = null;
		if (props) {
			this.useTicks = !!props.useTicks;
			this.ignoreGlobalPause = !!props.ignoreGlobalPause;
			this.loop = props.loop === true ? -1 : (props.loop || 0);
			this.reversed = !!props.reversed;
			this.bounce = !!props.bounce;
			this.timeScale = props.timeScale || 1;
			props.onChange && this.addEventListener("change", props.onChange);
			props.onComplete && this.addEventListener("complete", props.onComplete);
		}
	};
	var p = createjs.extend(AbstractTween, createjs.EventDispatcher);
	p._setPaused = function (value) {
		createjs.Tween._register(this, value);
		return this;
	};
	p.setPaused = createjs.deprecate(p._setPaused, "AbstractTween.setPaused");
	p._getPaused = function () {
		return this._paused;
	};
	p.getPaused = createjs.deprecate(p._getPaused, "AbstactTween.getPaused");
	p._getCurrentLabel = function (pos) {
		var labels = this.getLabels();
		if (pos == null) { pos = this.position; }
		for (var i = 0, l = labels.length; i < l; i++) { if (pos < labels[i].position) { break; } }
		return (i === 0) ? null : labels[i - 1].label;
	};
	p.getCurrentLabel = createjs.deprecate(p._getCurrentLabel, "AbstractTween.getCurrentLabel");
	try {
		Object.defineProperties(p, {
			paused: { set: p._setPaused, get: p._getPaused },
			currentLabel: { get: p._getCurrentLabel }
		});
	} catch (e) { }
	p.advance = function (delta, ignoreActions) {
		this.setPosition(this.rawPosition + delta * this.timeScale, ignoreActions);
	};
	p.setPosition = function (rawPosition, ignoreActions, jump, callback) {
		var d = this.duration, loopCount = this.loop, prevRawPos = this.rawPosition;
		var loop = 0, t = 0, end = false;
		if (rawPosition < 0) { rawPosition = 0; }
		if (d === 0) {
			end = true;
			if (prevRawPos !== -1) { return end; }
		} else {
			loop = rawPosition / d | 0;
			t = rawPosition - loop * d;
			end = (loopCount !== -1 && rawPosition >= loopCount * d + d);
			if (end) { rawPosition = (t = d) * (loop = loopCount) + d; }
			if (rawPosition === prevRawPos) { return end; }
			var rev = !this.reversed !== !(this.bounce && loop % 2);
			if (rev) { t = d - t; }
		}
		this.position = t;
		this.rawPosition = rawPosition;
		this._updatePosition(jump, end);
		if (end) { this.paused = true; }
		callback && callback(this);
		if (!ignoreActions) { this._runActions(prevRawPos, rawPosition, jump, !jump && prevRawPos === -1); }
		this.dispatchEvent("change");
		if (end) { this.dispatchEvent("complete"); }
	};
	p.calculatePosition = function (rawPosition) {
		var d = this.duration, loopCount = this.loop, loop = 0, t = 0;
		if (d === 0) { return 0; }
		if (loopCount !== -1 && rawPosition >= loopCount * d + d) { t = d; loop = loopCount }
		else if (rawPosition < 0) { t = 0; }
		else { loop = rawPosition / d | 0; t = rawPosition - loop * d; }
		var rev = !this.reversed !== !(this.bounce && loop % 2);
		return rev ? d - t : t;
	};
	p.getLabels = function () {
		var list = this._labelList;
		if (!list) {
			list = this._labelList = [];
			var labels = this._labels;
			for (var n in labels) {
				list.push({ label: n, position: labels[n] });
			}
			list.sort(function (a, b) { return a.position - b.position; });
		}
		return list;
	};
	p.setLabels = function (labels) {
		this._labels = labels;
		this._labelList = null;
	};
	p.addLabel = function (label, position) {
		if (!this._labels) { this._labels = {}; }
		this._labels[label] = position;
		var list = this._labelList;
		if (list) {
			for (var i = 0, l = list.length; i < l; i++) { if (position < list[i].position) { break; } }
			list.splice(i, 0, { label: label, position: position });
		}
	};
	p.gotoAndPlay = function (positionOrLabel) {
		this.paused = false;
		this._goto(positionOrLabel);
	};
	p.gotoAndStop = function (positionOrLabel) {
		this.paused = true;
		this._goto(positionOrLabel);
	};
	p.resolve = function (positionOrLabel) {
		var pos = Number(positionOrLabel);
		if (isNaN(pos)) { pos = this._labels && this._labels[positionOrLabel]; }
		return pos;
	};
	p.toString = function () {
		return "[AbstractTween]";
	};
	p.clone = function () {
		throw ("AbstractTween can not be cloned.")
	};
	p._init = function (props) {
		if (!props || !props.paused) { this.paused = false; }
		if (props && (props.position != null)) { this.setPosition(props.position); }
	};
	p._updatePosition = function (jump, end) {
	};
	p._goto = function (positionOrLabel) {
		var pos = this.resolve(positionOrLabel);
		if (pos != null) { this.setPosition(pos, false, true); }
	};
	p._runActions = function (startRawPos, endRawPos, jump, includeStart) {
		//console.log(this.passive === false ? " > Tween" : "Timeline", "run", startRawPos, endRawPos, jump, includeStart);
		if (!this._actionHead && !this.tweens) { return; }
		var d = this.duration, reversed = this.reversed, bounce = this.bounce, loopCount = this.loop;
		var loop0, loop1, t0, t1;
		if (d === 0) {
			loop0 = loop1 = t0 = t1 = 0;
			reversed = bounce = false;
		} else {
			loop0 = startRawPos / d | 0;
			loop1 = endRawPos / d | 0;
			t0 = startRawPos - loop0 * d;
			t1 = endRawPos - loop1 * d;
		}
		if (loopCount !== -1) {
			if (loop1 > loopCount) { t1 = d; loop1 = loopCount; }
			if (loop0 > loopCount) { t0 = d; loop0 = loopCount; }
		}
		if (jump) { return this._runActionsRange(t1, t1, jump, includeStart); }
		else if (loop0 === loop1 && t0 === t1 && !jump && !includeStart) { return; }
		else if (loop0 === -1) { loop0 = t0 = 0; }
		var dir = (startRawPos <= endRawPos), loop = loop0;
		do {
			var rev = !reversed !== !(bounce && loop % 2);
			var start = (loop === loop0) ? t0 : dir ? 0 : d;
			var end = (loop === loop1) ? t1 : dir ? d : 0;
			if (rev) {
				start = d - start;
				end = d - end;
			}
			if (bounce && loop !== loop0 && start === end) { }
			else if (this._runActionsRange(start, end, jump, includeStart || (loop !== loop0 && !bounce))) { return true; }
			includeStart = false;
		} while ((dir && ++loop <= loop1) || (!dir && --loop >= loop1));
	};
	p._runActionsRange = function (startPos, endPos, jump, includeStart) {
	};
	createjs.AbstractTween = createjs.promote(AbstractTween, "EventDispatcher");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Tween(target, props) {
		this.AbstractTween_constructor(props);
		this.pluginData = null;
		this.target = target;
		this.passive = false;
		this._stepHead = new TweenStep(null, 0, 0, {}, null, true);
		this._stepTail = this._stepHead;
		this._stepPosition = 0;
		this._actionHead = null;
		this._actionTail = null;
		this._plugins = null;
		this._pluginIds = null;
		this._injected = null;
		if (props) {
			this.pluginData = props.pluginData;
			if (props.override) { Tween.removeTweens(target); }
		}
		if (!this.pluginData) { this.pluginData = {}; }
		this._init(props);
	};
	var p = createjs.extend(Tween, createjs.AbstractTween);
	Tween.IGNORE = {};
	Tween._tweens = [];
	Tween._plugins = null;
	Tween._tweenHead = null;
	Tween._tweenTail = null;
	Tween.get = function (target, props) {
		return new Tween(target, props);
	};
	Tween.tick = function (delta, paused) {
		var tween = Tween._tweenHead;
		while (tween) {
			var next = tween._next;
			if ((paused && !tween.ignoreGlobalPause) || tween._paused) { }
			else { tween.advance(tween.useTicks ? 1 : delta); }
			tween = next;
		}
	};
	Tween.handleEvent = function (event) {
		if (event.type === "tick") {
			this.tick(event.delta, event.paused);
		}
	};
	Tween.removeTweens = function (target) {
		if (!target.tweenjs_count) { return; }
		var tween = Tween._tweenHead;
		while (tween) {
			var next = tween._next;
			if (tween.target === target) { Tween._register(tween, true); }
			tween = next;
		}
		target.tweenjs_count = 0;
	};
	Tween.removeAllTweens = function () {
		var tween = Tween._tweenHead;
		while (tween) {
			var next = tween._next;
			tween._paused = true;
			tween.target && (tween.target.tweenjs_count = 0);
			tween._next = tween._prev = null;
			tween = next;
		}
		Tween._tweenHead = Tween._tweenTail = null;
	};
	Tween.hasActiveTweens = function (target) {
		if (target) { return !!target.tweenjs_count; }
		return !!Tween._tweenHead;
	};
	Tween._installPlugin = function (plugin) {
		var priority = (plugin.priority = plugin.priority || 0), arr = (Tween._plugins = Tween._plugins || []);
		for (var i = 0, l = arr.length; i < l; i++) {
			if (priority < arr[i].priority) { break; }
		}
		arr.splice(i, 0, plugin);
	};
	Tween._register = function (tween, paused) {
		var target = tween.target;
		if (!paused && tween._paused) {
			if (target) { target.tweenjs_count = target.tweenjs_count ? target.tweenjs_count + 1 : 1; }
			var tail = Tween._tweenTail;
			if (!tail) { Tween._tweenHead = Tween._tweenTail = tween; }
			else {
				Tween._tweenTail = tail._next = tween;
				tween._prev = tail;
			}
			if (!Tween._inited && createjs.Ticker) { createjs.Ticker.addEventListener("tick", Tween); Tween._inited = true; }
		} else if (paused && !tween._paused) {
			if (target) { target.tweenjs_count--; }
			var next = tween._next, prev = tween._prev;
			if (next) { next._prev = prev; }
			else { Tween._tweenTail = prev; }
			if (prev) { prev._next = next; }
			else { Tween._tweenHead = next; }
			tween._next = tween._prev = null;
		}
		tween._paused = paused;
	};
	p.wait = function (duration, passive) {
		if (duration > 0) { this._addStep(+duration, this._stepTail.props, null, passive); }
		return this;
	};
	p.to = function (props, duration, ease) {
		if (duration == null || duration < 0) { duration = 0; }
		var step = this._addStep(+duration, null, ease);
		this._appendProps(props, step);
		return this;
	};
	p.label = function (name) {
		this.addLabel(name, this.duration);
		return this;
	};
	p.call = function (callback, params, scope) {
		return this._addAction(scope || this.target, callback, params || [this]);
	};
	p.set = function (props, target) {
		return this._addAction(target || this.target, this._set, [props]);
	};
	p.play = function (tween) {
		return this._addAction(tween || this, this._set, [{ paused: false }]);
	};
	p.pause = function (tween) {
		return this._addAction(tween || this, this._set, [{ paused: true }]);
	};
	p.w = p.wait;
	p.t = p.to;
	p.c = p.call;
	p.s = p.set;
	p.toString = function () {
		return "[Tween]";
	};
	p.clone = function () {
		throw ("Tween can not be cloned.")
	};
	p._addPlugin = function (plugin) {
		var ids = this._pluginIds || (this._pluginIds = {}), id = plugin.ID;
		if (!id || ids[id]) { return; }
		ids[id] = true;
		var plugins = this._plugins || (this._plugins = []), priority = plugin.priority || 0;
		for (var i = 0, l = plugins.length; i < l; i++) {
			if (priority < plugins[i].priority) {
				plugins.splice(i, 0, plugin);
				return;
			}
		}
		plugins.push(plugin);
	};
	p._updatePosition = function (jump, end) {
		var step = this._stepHead.next, t = this.position, d = this.duration;
		if (this.target && step) {
			var stepNext = step.next;
			while (stepNext && stepNext.t <= t) { step = step.next; stepNext = step.next; }
			var ratio = end ? d === 0 ? 1 : t / d : (t - step.t) / step.d;
			this._updateTargetProps(step, ratio, end);
		}
		this._stepPosition = step ? t - step.t : 0;
	};
	p._updateTargetProps = function (step, ratio, end) {
		if (this.passive = !!step.passive) { return; }
		var v, v0, v1, ease;
		var p0 = step.prev.props;
		var p1 = step.props;
		if (ease = step.ease) { ratio = ease(ratio, 0, 1, 1); }
		var plugins = this._plugins;
		proploop: for (var n in p0) {
			v0 = p0[n];
			v1 = p1[n];
			if (v0 !== v1 && (typeof (v0) === "number")) {
				v = v0 + (v1 - v0) * ratio;
			} else {
				v = ratio >= 1 ? v1 : v0;
			}
			if (plugins) {
				for (var i = 0, l = plugins.length; i < l; i++) {
					var value = plugins[i].change(this, step, n, v, ratio, end);
					if (value === Tween.IGNORE) { continue proploop; }
					if (value !== undefined) { v = value; }
				}
			}
			this.target[n] = v;
		}
	};
	p._runActionsRange = function (startPos, endPos, jump, includeStart) {
		var rev = startPos > endPos;
		var action = rev ? this._actionTail : this._actionHead;
		var ePos = endPos, sPos = startPos;
		if (rev) { ePos = startPos; sPos = endPos; }
		var t = this.position;
		while (action) {
			var pos = action.t;
			if (pos === endPos || (pos > sPos && pos < ePos) || (includeStart && pos === startPos)) {
				action.funct.apply(action.scope, action.params);
				if (t !== this.position) { return true; }
			}
			action = rev ? action.prev : action.next;
		}
	};
	p._appendProps = function (props, step, stepPlugins) {
		var initProps = this._stepHead.props, target = this.target, plugins = Tween._plugins;
		var n, i, value, initValue, inject;
		var oldStep = step.prev, oldProps = oldStep.props;
		var stepProps = step.props || (step.props = this._cloneProps(oldProps));
		var cleanProps = {};
		for (n in props) {
			if (!props.hasOwnProperty(n)) { continue; }
			cleanProps[n] = stepProps[n] = props[n];
			if (initProps[n] !== undefined) { continue; }
			initValue = undefined;
			if (plugins) {
				for (i = plugins.length - 1; i >= 0; i--) {
					value = plugins[i].init(this, n, initValue);
					if (value !== undefined) { initValue = value; }
					if (initValue === Tween.IGNORE) {
						delete (stepProps[n]);
						delete (cleanProps[n]);
						break;
					}
				}
			}
			if (initValue !== Tween.IGNORE) {
				if (initValue === undefined) { initValue = target[n]; }
				oldProps[n] = (initValue === undefined) ? null : initValue;
			}
		}
		for (n in cleanProps) {
			value = props[n];
			var o, prev = oldStep;
			while ((o = prev) && (prev = o.prev)) {
				if (prev.props === o.props) { continue; }
				if (prev.props[n] !== undefined) { break; }
				prev.props[n] = oldProps[n];
			}
		}
		if (stepPlugins !== false && (plugins = this._plugins)) {
			for (i = plugins.length - 1; i >= 0; i--) {
				plugins[i].step(this, step, cleanProps);
			}
		}
		if (inject = this._injected) {
			this._injected = null;
			this._appendProps(inject, step, false);
		}
	};
	p._injectProp = function (name, value) {
		var o = this._injected || (this._injected = {});
		o[name] = value;
	};
	p._addStep = function (duration, props, ease, passive) {
		var step = new TweenStep(this._stepTail, this.duration, duration, props, ease, passive || false);
		this.duration += duration;
		return this._stepTail = (this._stepTail.next = step);
	};
	p._addAction = function (scope, funct, params) {
		var action = new TweenAction(this._actionTail, this.duration, scope, funct, params);
		if (this._actionTail) { this._actionTail.next = action; }
		else { this._actionHead = action; }
		this._actionTail = action;
		return this;
	};
	p._set = function (props) {
		for (var n in props) {
			this[n] = props[n];
		}
	};
	p._cloneProps = function (props) {
		var o = {};
		for (var n in props) { o[n] = props[n]; }
		return o;
	};
	createjs.Tween = createjs.promote(Tween, "AbstractTween");
	function TweenStep(prev, t, d, props, ease, passive) {
		this.next = null;
		this.prev = prev;
		this.t = t;
		this.d = d;
		this.props = props;
		this.ease = ease;
		this.passive = passive;
		this.index = prev ? prev.index + 1 : 0;
	};
	function TweenAction(prev, t, scope, funct, params) {
		this.next = null;
		this.prev = prev;
		this.t = t;
		this.d = 0;
		this.scope = scope;
		this.funct = funct;
		this.params = params;
	};
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Timeline(props) {
		var tweens, labels;
		if (props instanceof Array || (props == null && arguments.length > 1)) {
			tweens = props;
			labels = arguments[1];
			props = arguments[2];
		} else if (props) {
			tweens = props.tweens;
			labels = props.labels;
		}
		this.AbstractTween_constructor(props);
		this.tweens = [];
		if (tweens) { this.addTween.apply(this, tweens); }
		this.setLabels(labels);
		this._init(props);
	};
	var p = createjs.extend(Timeline, createjs.AbstractTween);
	p.addTween = function (tween) {
		if (tween._parent) { tween._parent.removeTween(tween); }
		var l = arguments.length;
		if (l > 1) {
			for (var i = 0; i < l; i++) { this.addTween(arguments[i]); }
			return arguments[l - 1];
		} else if (l === 0) { return null; }
		this.tweens.push(tween);
		tween._parent = this;
		tween.paused = true;
		var d = tween.duration;
		if (tween.loop > 0) { d *= tween.loop + 1; }
		if (d > this.duration) { this.duration = d; }
		if (this.rawPosition >= 0) { tween.setPosition(this.rawPosition); }
		return tween;
	};
	p.removeTween = function (tween) {
		var l = arguments.length;
		if (l > 1) {
			var good = true;
			for (var i = 0; i < l; i++) { good = good && this.removeTween(arguments[i]); }
			return good;
		} else if (l === 0) { return true; }
		var tweens = this.tweens;
		var i = tweens.length;
		while (i--) {
			if (tweens[i] === tween) {
				tweens.splice(i, 1);
				tween._parent = null;
				if (tween.duration >= this.duration) { this.updateDuration(); }
				return true;
			}
		}
		return false;
	};
	p.updateDuration = function () {
		this.duration = 0;
		for (var i = 0, l = this.tweens.length; i < l; i++) {
			var tween = this.tweens[i];
			var d = tween.duration;
			if (tween.loop > 0) { d *= tween.loop + 1; }
			if (d > this.duration) { this.duration = d; }
		}
	};
	p.toString = function () {
		return "[Timeline]";
	};
	p.clone = function () {
		throw ("Timeline can not be cloned.")
	};
	p._updatePosition = function (jump, end) {
		var t = this.position;
		for (var i = 0, l = this.tweens.length; i < l; i++) {
			this.tweens[i].setPosition(t, true, jump);
		}
	};
	p._runActionsRange = function (startPos, endPos, jump, includeStart) {
		//console.log("	range", startPos, endPos, jump, includeStart);
		var t = this.position;
		for (var i = 0, l = this.tweens.length; i < l; i++) {
			this.tweens[i]._runActions(startPos, endPos, jump, includeStart);
			if (t !== this.position) { return true; }
		}
	};
	createjs.Timeline = createjs.promote(Timeline, "AbstractTween");
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function Ease() {
		throw "Ease cannot be instantiated.";
	}
	Ease.linear = function (t) { return t; };
	Ease.none = Ease.linear;
	Ease.get = function (amount) {
		if (amount < -1) { amount = -1; }
		else if (amount > 1) { amount = 1; }
		return function (t) {
			if (amount == 0) { return t; }
			if (amount < 0) { return t * (t * -amount + 1 + amount); }
			return t * ((2 - t) * amount + (1 - amount));
		};
	};
	Ease.getPowIn = function (pow) {
		return function (t) {
			return Math.pow(t, pow);
		};
	};
	Ease.getPowOut = function (pow) {
		return function (t) {
			return 1 - Math.pow(1 - t, pow);
		};
	};
	Ease.getPowInOut = function (pow) {
		return function (t) {
			if ((t *= 2) < 1) return 0.5 * Math.pow(t, pow);
			return 1 - 0.5 * Math.abs(Math.pow(2 - t, pow));
		};
	};
	Ease.quadIn = Ease.getPowIn(2);
	Ease.quadOut = Ease.getPowOut(2);
	Ease.quadInOut = Ease.getPowInOut(2);
	Ease.cubicIn = Ease.getPowIn(3);
	Ease.cubicOut = Ease.getPowOut(3);
	Ease.cubicInOut = Ease.getPowInOut(3);
	Ease.quartIn = Ease.getPowIn(4);
	Ease.quartOut = Ease.getPowOut(4);
	Ease.quartInOut = Ease.getPowInOut(4);
	Ease.quintIn = Ease.getPowIn(5);
	Ease.quintOut = Ease.getPowOut(5);
	Ease.quintInOut = Ease.getPowInOut(5);
	Ease.sineIn = function (t) {
		return 1 - Math.cos(t * Math.PI / 2);
	};
	Ease.sineOut = function (t) {
		return Math.sin(t * Math.PI / 2);
	};
	Ease.sineInOut = function (t) {
		return -0.5 * (Math.cos(Math.PI * t) - 1);
	};
	Ease.getBackIn = function (amount) {
		return function (t) {
			return t * t * ((amount + 1) * t - amount);
		};
	};
	Ease.backIn = Ease.getBackIn(1.7);
	Ease.getBackOut = function (amount) {
		return function (t) {
			return (--t * t * ((amount + 1) * t + amount) + 1);
		};
	};
	Ease.backOut = Ease.getBackOut(1.7);
	Ease.getBackInOut = function (amount) {
		amount *= 1.525;
		return function (t) {
			if ((t *= 2) < 1) return 0.5 * (t * t * ((amount + 1) * t - amount));
			return 0.5 * ((t -= 2) * t * ((amount + 1) * t + amount) + 2);
		};
	};
	Ease.backInOut = Ease.getBackInOut(1.7);
	Ease.circIn = function (t) {
		return -(Math.sqrt(1 - t * t) - 1);
	};
	Ease.circOut = function (t) {
		return Math.sqrt(1 - (--t) * t);
	};
	Ease.circInOut = function (t) {
		if ((t *= 2) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
		return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
	};
	Ease.bounceIn = function (t) {
		return 1 - Ease.bounceOut(1 - t);
	};
	Ease.bounceOut = function (t) {
		if (t < 1 / 2.75) {
			return (7.5625 * t * t);
		} else if (t < 2 / 2.75) {
			return (7.5625 * (t -= 1.5 / 2.75) * t + 0.75);
		} else if (t < 2.5 / 2.75) {
			return (7.5625 * (t -= 2.25 / 2.75) * t + 0.9375);
		} else {
			return (7.5625 * (t -= 2.625 / 2.75) * t + 0.984375);
		}
	};
	Ease.bounceInOut = function (t) {
		if (t < 0.5) return Ease.bounceIn(t * 2) * .5;
		return Ease.bounceOut(t * 2 - 1) * 0.5 + 0.5;
	};
	Ease.getElasticIn = function (amplitude, period) {
		var pi2 = Math.PI * 2;
		return function (t) {
			if (t == 0 || t == 1) return t;
			var s = period / pi2 * Math.asin(1 / amplitude);
			return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * pi2 / period));
		};
	};
	Ease.elasticIn = Ease.getElasticIn(1, 0.3);
	Ease.getElasticOut = function (amplitude, period) {
		var pi2 = Math.PI * 2;
		return function (t) {
			if (t == 0 || t == 1) return t;
			var s = period / pi2 * Math.asin(1 / amplitude);
			return (amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * pi2 / period) + 1);
		};
	};
	Ease.elasticOut = Ease.getElasticOut(1, 0.3);
	Ease.getElasticInOut = function (amplitude, period) {
		var pi2 = Math.PI * 2;
		return function (t) {
			var s = period / pi2 * Math.asin(1 / amplitude);
			if ((t *= 2) < 1) return -0.5 * (amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * pi2 / period));
			return amplitude * Math.pow(2, -10 * (t -= 1)) * Math.sin((t - s) * pi2 / period) * 0.5 + 1;
		};
	};
	Ease.elasticInOut = Ease.getElasticInOut(1, 0.3 * 1.5);
	createjs.Ease = Ease;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	function MotionGuidePlugin() {
		throw ("MotionGuidePlugin cannot be instantiated.")
	}
	var s = MotionGuidePlugin;
	s.priority = 0;
	s.ID = "MotionGuide";
	s.install = function () {
		createjs.Tween._installPlugin(MotionGuidePlugin);
		return createjs.Tween.IGNORE;
	};
	s.init = function (tween, prop, value) {
		if (prop == "guide") {
			tween._addPlugin(s);
		}
	};
	s.step = function (tween, step, props) {
		for (var n in props) {
			if (n !== "guide") { continue; }
			var guideData = step.props.guide;
			var error = s._solveGuideData(props.guide, guideData);
			guideData.valid = !error;
			var end = guideData.endData;
			tween._injectProp("x", end.x);
			tween._injectProp("y", end.y);
			if (error || !guideData.orient) { break; }
			var initRot = step.prev.props.rotation === undefined ? (tween.target.rotation || 0) : step.prev.props.rotation;
			guideData.startOffsetRot = initRot - guideData.startData.rotation;
			if (guideData.orient == "fixed") {
				guideData.endAbsRot = end.rotation + guideData.startOffsetRot;
				guideData.deltaRotation = 0;
			} else {
				var finalRot = props.rotation === undefined ? (tween.target.rotation || 0) : props.rotation;
				var deltaRot = (finalRot - guideData.endData.rotation) - guideData.startOffsetRot;
				var modRot = deltaRot % 360;
				guideData.endAbsRot = finalRot;
				switch (guideData.orient) {
					case "auto":
						guideData.deltaRotation = deltaRot;
						break;
					case "cw":
						guideData.deltaRotation = ((modRot + 360) % 360) + (360 * Math.abs((deltaRot / 360) | 0));
						break;
					case "ccw":
						guideData.deltaRotation = ((modRot - 360) % 360) + (-360 * Math.abs((deltaRot / 360) | 0));
						break;
				}
			}
			tween._injectProp("rotation", guideData.endAbsRot);
		}
	};
	s.change = function (tween, step, prop, value, ratio, end) {
		var guideData = step.props.guide;
		if (
			!guideData ||
			(step.props === step.prev.props) ||
			(guideData === step.prev.props.guide)
		) {
			return;
		}
		if (
			(prop === "guide" && !guideData.valid) ||
			(prop == "x" || prop == "y") ||
			(prop === "rotation" && guideData.orient)
		) {
			return createjs.Tween.IGNORE;
		}
		s._ratioToPositionData(ratio, guideData, tween.target);
	};
	s.debug = function (guideData, ctx, higlight) {
		guideData = guideData.guide || guideData;
		var err = s._findPathProblems(guideData);
		if (err) {
			console.error("MotionGuidePlugin Error found: \n" + err);
		}
		if (!ctx) { return err; }
		var i;
		var path = guideData.path;
		var pathLength = path.length;
		var width = 3;
		var length = 9;
		ctx.save();
		//ctx.resetTransform();
		ctx.lineCap = "round";
		ctx.lineJoin = "miter";
		ctx.beginPath();
		ctx.moveTo(path[0], path[1]);
		for (i = 2; i < pathLength; i += 4) {
			ctx.quadraticCurveTo(
				path[i], path[i + 1],
				path[i + 2], path[i + 3]
			);
		}
		ctx.strokeStyle = "black";
		ctx.lineWidth = width * 1.5;
		ctx.stroke();
		ctx.strokeStyle = "white";
		ctx.lineWidth = width;
		ctx.stroke();
		ctx.closePath();
		var hiCount = higlight.length;
		if (higlight && hiCount) {
			var tempStore = {};
			var tempLook = {};
			s._solveGuideData(guideData, tempStore);
			for (var i = 0; i < hiCount; i++) {
				tempStore.orient = "fixed";
				s._ratioToPositionData(higlight[i], tempStore, tempLook);
				ctx.beginPath();
				ctx.moveTo(tempLook.x, tempLook.y);
				ctx.lineTo(
					tempLook.x + Math.cos(tempLook.rotation * 0.0174533) * length,
					tempLook.y + Math.sin(tempLook.rotation * 0.0174533) * length
				);
				ctx.strokeStyle = "black";
				ctx.lineWidth = width * 1.5;
				ctx.stroke();
				ctx.strokeStyle = "red";
				ctx.lineWidth = width;
				ctx.stroke();
				ctx.closePath();
			}
		}
		ctx.restore();
		return err;
	};
	s._solveGuideData = function (source, storage) {
		var err = undefined;
		if (err = s.debug(source)) { return err; }
		var path = storage.path = source.path;
		var orient = storage.orient = source.orient;
		storage.subLines = [];
		storage.totalLength = 0;
		storage.startOffsetRot = 0;
		storage.deltaRotation = 0;
		storage.startData = { ratio: 0 };
		storage.endData = { ratio: 1 };
		storage.animSpan = 1;
		var pathLength = path.length;
		var precision = 10;
		var sx, sy, cx, cy, ex, ey, i, j, len, temp = {};
		sx = path[0]; sy = path[1];
		for (i = 2; i < pathLength; i += 4) {
			cx = path[i]; cy = path[i + 1];
			ex = path[i + 2]; ey = path[i + 3];
			var subLine = {
				weightings: [],
				estLength: 0,
				portion: 0
			};
			var subX = sx, subY = sy;
			for (j = 1; j <= precision; j++) {
				s._getParamsForCurve(sx, sy, cx, cy, ex, ey, j / precision, false, temp);
				var dx = temp.x - subX, dy = temp.y - subY;
				len = Math.sqrt(dx * dx + dy * dy);
				subLine.weightings.push(len);
				subLine.estLength += len;
				subX = temp.x;
				subY = temp.y;
			}
			storage.totalLength += subLine.estLength;
			for (j = 0; j < precision; j++) {
				len = subLine.estLength;
				subLine.weightings[j] = subLine.weightings[j] / len;
			}
			storage.subLines.push(subLine);
			sx = ex;
			sy = ey;
		}
		len = storage.totalLength;
		var l = storage.subLines.length;
		for (i = 0; i < l; i++) {
			storage.subLines[i].portion = storage.subLines[i].estLength / len;
		}
		var startRatio = isNaN(source.start) ? 0 : source.start;
		var endRatio = isNaN(source.end) ? 1 : source.end;
		s._ratioToPositionData(startRatio, storage, storage.startData);
		s._ratioToPositionData(endRatio, storage, storage.endData);
		storage.startData.ratio = startRatio;
		storage.endData.ratio = endRatio;
		storage.animSpan = storage.endData.ratio - storage.startData.ratio;
	};
	s._ratioToPositionData = function (ratio, guideData, output) {
		var lineSegments = guideData.subLines;
		var i, l, t, test, target;
		var look = 0;
		var precision = 10;
		var effRatio = (ratio * guideData.animSpan) + guideData.startData.ratio;
		l = lineSegments.length;
		for (i = 0; i < l; i++) {
			test = lineSegments[i].portion;
			if (look + test >= effRatio) { target = i; break; }
			look += test;
		}
		if (target === undefined) { target = l - 1; look -= test; }
		var subLines = lineSegments[target].weightings;
		var portion = test;
		l = subLines.length;
		for (i = 0; i < l; i++) {
			test = subLines[i] * portion;
			if (look + test >= effRatio) { break; }
			look += test;
		}
		target = (target * 4) + 2;
		t = (i / precision) + (((effRatio - look) / test) * (1 / precision));
		var pathData = guideData.path;
		s._getParamsForCurve(
			pathData[target - 2], pathData[target - 1],
			pathData[target], pathData[target + 1],
			pathData[target + 2], pathData[target + 3],
			t,
			guideData.orient,
			output
		);
		if (guideData.orient) {
			if (ratio >= 0.99999 && ratio <= 1.00001 && guideData.endAbsRot !== undefined) {
				output.rotation = guideData.endAbsRot;
			} else {
				output.rotation += guideData.startOffsetRot + (ratio * guideData.deltaRotation);
			}
		}
		return output;
	};
	s._getParamsForCurve = function (sx, sy, cx, cy, ex, ey, t, orient, output) {
		var inv = 1 - t;
		output.x = inv * inv * sx + 2 * inv * t * cx + t * t * ex;
		output.y = inv * inv * sy + 2 * inv * t * cy + t * t * ey;
		if (orient) {
			output.rotation = 57.2957795 * Math.atan2(
				(cy - sy) * inv + (ey - cy) * t,
				(cx - sx) * inv + (ex - cx) * t
			);
		}
	};
	s._findPathProblems = function (guideData) {
		var path = guideData.path;
		var valueCount = (path && path.length) || 0;
		if (valueCount < 6 || (valueCount - 2) % 4) {
			var message = "\tCannot parse 'path' array due to invalid number of entries in path. ";
			message += "There should be an odd number of points, at least 3 points, and 2 entries per point (x & y). ";
			message += "See 'CanvasRenderingContext2D.quadraticCurveTo' for details as 'path' models a quadratic bezier.\n\n";
			message += "Only [ " + valueCount + " ] values found. Expected: " + Math.max(Math.ceil((valueCount - 2) / 4) * 4 + 2, 6); //6, 10, 14,...
			return message;
		}
		for (var i = 0; i < valueCount; i++) {
			if (isNaN(path[i])) {
				return "All data in path array must be numeric";
			}
		}
		var start = guideData.start;
		if (isNaN(start) && !(start === undefined)) {
			return "'start' out of bounds. Expected 0 to 1, got: " + start;
		}
		var end = guideData.end;
		if (isNaN(end) && (end !== undefined)) {
			return "'end' out of bounds. Expected 0 to 1, got: " + end;
		}
		var orient = guideData.orient;
		if (orient) {
			if (orient != "fixed" && orient != "auto" && orient != "cw" && orient != "ccw") {
				return 'Invalid orientation value. Expected ["fixed", "auto", "cw", "ccw", undefined], got: ' + orient;
			}
		}
		return undefined;
	};
	createjs.MotionGuidePlugin = MotionGuidePlugin;
}());
//##############################################################################
//##############################################################################
(function () {
	"use strict";
	var s = createjs.TweenJS = createjs.TweenJS || {};
	s.version = "NEXT";
	s.buildDate = "Thu, 14 Sep 2017 22:19:45 GMT";
})();
/* stageWidth = 1600;
	stageHeight = 960;
	var mapWidth = 4000;
	var mapHeight = 960;
	var dw = 250, dh = 150;
	var deadzone = [dw, dh, stageWidth - dw * 2, stageHeight - dh * 2];

	//新建摄像机，设置边界，deadzone
	var camera = new Camera({
	  target: d_container.player,
	  width: stageWidth,
	  height: stageHeight,
	  bounds:[0, 0, mapWidth - stageWidth, mapHeight - stageHeight],
	  deadzone:false// deadzone
	}); */
class Camera extends createjs.Container {
	constructor(properties) {
		super();
		this.width = properties.width || 0;
		this.height = properties.height || 0;

		this.target = properties.target || null;
		this.deadzone = properties.deadzone || null;
		this.bounds = properties.bounds || null;
		this.map = properties.map || this.target.parent;
		this.scroll = properties.scroll || {
			x: 0,
			y: 0
		};
	}
	/**
	 * @language=en
	 * update.
	 * @param {Number} deltaTime
	*/
	onUpdate(deltaTime) {
		var target = this.target;
		var scroll = this.scroll;
		var bounds = this.bounds;
		var deadzone = this.deadzone;

		if (target) {
			var viewX, viewY;
			if (deadzone) {
				viewX = Math.min(Math.max(target.x - scroll.x, deadzone[0]), deadzone[0] + deadzone[2]);
				viewY = Math.min(Math.max(target.y - scroll.y, deadzone[1]), deadzone[1] + deadzone[3]);
			}
			else {
				viewX = this.width * .5;
				viewY = this.height * .5;
			}

			scroll.x = target.x - viewX;
			scroll.y = target.y - viewY;
			console.log(d_container.player.x, target.x, scroll.x)
			if (bounds) {
				scroll.x = Math.min(Math.max(scroll.x, bounds[0]), bounds[0] + bounds[2]);
				scroll.y = Math.min(Math.max(scroll.y, bounds[1]), bounds[1] + bounds[3]);
			}
		}
		else {
			scroll.x = 0;
			scroll.y = 0;
		}
		this.map.x = -scroll.x;
		this.map.y = -scroll.y;
	}
	/**
	 * @language=en
	 * Follow the target.
	 * @param {Object} target The target that the camera follow. It must has x and y properties.
	 * @param {Array} deadzone The rect area where camera isn't allowed to move[ x, y, width, height].
	*/
	follow(target, deadzone) {
		this.target = target;
		if (deadzone !== undefined) {
			this.deadzone = deadzone;
		}
		this.onUpdate();
	}
}
