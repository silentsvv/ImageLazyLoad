/**
 *
 *
 * @param {object} option {
                        selector: '[data-src]', //querySelectorAll选择元素的标识符
                        prefix: 'data-src', //存储图片src的data属性
                        scrollDelay: 25, //滚动函数执行间隔时间
                        resizeDelay: 50, //执行resize函数间隔时间
                        distance: 0, //加载距离
                        containerClass: '', //容器类名
                        container: '' //父容器
                        loadingClassName: 'loading', //图片loading类名
                        loadedClassName: 'loaded', //图片加载完成
                        preloadImage: null, //预加载图片链接,
                        rectScale: 1, //页面缩放比例
                        forAutoLoad: null, //超过多少时间，自动加载剩下图片
 * }
 * @param {function} callback 处理所有图片的回调
 * @param {function} errorFn 图片加载错误回调
 */

function LazyLoad(option, callback, errorFn) {
    var self = this;

    var util = self._util = {}; //工具对象
    util.elements         = []; //懒加载所有元素
    util.scrollFn         = null; //滚动函数
    util.resizeFn         = null; //重置函数
    util.callback         = callback; //成功回调函数
    util.errorFn          = errorFn; //错误方法
    util.count            = 0; //统计所有的图片元素
    util.beforeScrollTime = new Date(); //初始化时间
    util.scrollTimer      = null; //setInterval计时器
    util.STATUS           = 'scroll'; //操作状态
    
    self.option                  = option || {};
    self.option.selector         = self.option.selector || '[data-src]'; //querySelectorAll选择元素的标识符
    self.option.prefix           = self.option.prefix || 'data-src';  //存储图片src的data属性
    self.option.scrollDelay      = self.option.scrollDelay || 25; //滚动函数执行间隔时间
    self.option.resizeDelay      = self.option.resizeDelay || 50; //执行resize函数间隔时间
    self.option.distance         = self.option.distance || 0; //开始加载图片的距离
    self.option.containerClass   = self.option.containerClass || null; //容器类名
    self.option.container        = self.option.containerClass?document.querySelector(self.option.containerClass): null; //容器dom节点
    self.option.loadingClassName = self.option.loadingClassName || 'loading'; //图片加载中样式
    self.option.loadedClassName  = self.option.loadedClassName || 'loaded'; //图片加载完成样式
    self.option.preloadImage     = self.option.preloadImage || null; //占位图样式
    self.option.rectScale        = self.option.rectScale || 1; //页面缩放比例
    self.option.forAutoLoad      = self.option.forAutoLoad || null; //暂停滚动自动加载时间

    self._viewport = {
        bottom: window.innerHeight + self.option.distance,
        right: window.innerWidth + self.option.distance,
        left: 0 - self.option.distance,
        top: 0 - self.option.distance
    }

    self.init();
}

/**
 * 初始化
 *
 * @param 
 */
LazyLoad.prototype.init = function() {
    var self = this;
    var util = self._util;

    util.elements = self.toArray(); //dom类数组转数组
    util.count = util.elements.length;
    self.initPreloadImage();

    self.scroll(); //加载首屏图片
    util.scrollFn = self.scrollThrottle();
    util.resizeFn = self.resetViewport();

    if(self.option.container) {
        self.bindEvent(self.option.container, 'scroll', util.scrollFn);
        self.bindEvent(self.option.container, 'resize', util.resizeFn);
        self.bindEvent(self.option.container, 'resize', util.scrollFn);
    }

    self.bindEvent(window, 'scroll', util.scrollFn);
    self.bindEvent(window, 'resize', util.resizeFn);
    self.bindEvent(window, 'resize', util.scrollFn);

    if(self.option.forAutoLoad) {
        let checkStopScrollTime = self.checkStopScrollTime();
        util.scrollTimer = setInterval(checkStopScrollTime, 100);
    }
}

LazyLoad.prototype.checkStopScrollTime = function() {
    let self = this;
    let util = self._util;

    return function() {
        let now = new Date();
        if(now - util.beforeScrollTime > self.option.forAutoLoad) {
            util.STATUS = 'stop';
            clearInterval(util.scrollTimer);
            self.autoLoadImage();
        }
    }
}

LazyLoad.prototype.autoLoadImage = function() {
    var self = this;
    var util = self._util;

    if(util.STATUS == 'scroll') {
        console.log('继续滚动中');
        let checkStopScrollTime = self.checkStopScrollTime();
        util.scrollTimer = setInterval(checkStopScrollTime, 100);
        return false;
    }

    if(util.elements.length > 0) {
        let item = util.elements[0];
        let srcLink = item.getAttribute(self.option.prefix);
        let image = new Image();
        image.src = srcLink;

        image.onload = function() {
            item.src = srcLink;
            item.classList.remove(self.option.loadingClassName);
            item.classList.add(self.option.loadedClassName);
            if(--util.count <= 0) {
                if(util.callback) {
                    util.callback();
                }
                console.log('已经加载完成啦~');
                self.destroy();
                return false;
            }
            console.log('自动加载下一副');
            self.autoLoadImage();
        }

        image.onerror = function() {
            if(util.errorFn) {
                util.errorFn();
            }
        }

        util.elements.splice(0, 1);
    }
    
}

/**
 * 销毁监听事件
 *
 * @param 
 */
LazyLoad.prototype.destroy = function() {
    var self = this;
    var util = self._util;

    if(self.option.container) {
        self.unbindEvent(self.option.container, 'scroll', util.scrollFn);
        self.unbindEvent(self.option.container, 'resize', util.resizeFn);
        self.unbindEvent(self.option.container, 'resize', util.scrollFn);
    }

    self.unbindEvent(window, 'scroll', util.scrollFn);
    self.unbindEvent(window, 'resize', util.resizeFn);
    self.unbindEvent(window, 'resize', util.scrollFn);
}

/**
 * 添加监听事件
 *
 * @param {node} ele dom节点
 * @param {string} type 监听事件
 * @param {function} fn 监听函数
 */
LazyLoad.prototype.bindEvent = function(ele, type, fn) {
    if (ele.attachEvent) {
        ele.attachEvent && ele.attachEvent('on' + type, fn);
    } else {
        ele.addEventListener(type, fn, { capture: false, passive: true });
    }
}

/**
 * 移除监听事件
 *
 * @param {node} ele dom节点
 * @param {string} type 监听事件
 * @param {function} fn 监听函数
 */
LazyLoad.prototype.unbindEvent = function(ele, type, fn) {
    if (ele.attachEvent) {
        ele.attachEvent && ele.detachEvent('on' + type, fn);
    } else {
        ele.removeEventListener(type, fn, { capture: false, passive: true });
    }
}

/**
 * 重置viewport大小
 *
 * @param 
 */
LazyLoad.prototype.resetViewport = function() {
    let self = this;

    return throttle(function() {
        this._viewport = {
            bottom: window.innerHeight + self.option.distance,
            right: window.innerWidth + self.option.distance,
            left: 0 - self.option.distance,
            top: 0 - self.option.distance
        }
    }, self.option.resizeDelay, self);
}

/**
 * 滚动事件触发函数
 *
 * @param 
 */
LazyLoad.prototype.scroll = function() {
    var self = this;
    var util = self._util;
    util.STATUS = 'scroll';
    util.beforeScrollTime = new Date();

    for(let i = 0, len = util.elements.length; i < len; i++) {
        let item = util.elements[i];
        let result = self.checkInView(item, self._viewport); //检测是否在页面中
        if(result) {
            let srcLink = item.getAttribute(self.option.prefix);
            let image = new Image();
            image.src = srcLink;

            image.onload = function() {
                item.src = srcLink;
                item.classList.remove(self.option.loadingClassName);
                item.classList.add(self.option.loadedClassName);
                if(--util.count <= 0) {
                    if(util.callback) {
                        util.callback();
                    }
                }
            }

            image.onerror = function() {
                if(util.errorFn) {
                    util.errorFn();
                }
            }

            util.elements.splice(i, 1);

            //手动减少长度
            i--;
            if(--len <= 0) {
                console.log('已经加载完成啦~');
                self.destroy();
            }
        }
    }
}

LazyLoad.prototype.initPreloadImage = function() {
    var self = this;
    var util = self._util;
    
    for(let i = 0, len = util.elements.length; i < len; i++) {
        let item = util.elements[i];
        
        item.classList.add(self.option.loadingClassName);
        if(self.option.preloadImage) {
            item.src = self.option.preloadImage;
        }
    }
}

/**
 * 函数节流后的滚动函数
 *
 * @param 
 */
LazyLoad.prototype.scrollThrottle = function() {
    let self = this;
    
    return throttle(function() {
        this.scroll();
    }, self.option.scrollDelay, self);
}

/**
 * dom类数组转数组
 *
 * @param 
 */
LazyLoad.prototype.toArray = function() {
    let array = [];
    let self = this;
    let doms = document.querySelectorAll(self.option.selector);

    for(let i = 0, len = doms.length; i < len; i++) {
        array.push(doms[i]);
    }

    return array;
}

/**
 * 查看是否显示在页面
 *
 * @param {node} ele node节点
 * @param {object} viewport 坐标信息对象
 */
LazyLoad.prototype.checkInView = function(ele, viewport) {
    let self = this;
    let rect = ele.getBoundingClientRect();
    rect.right = rect.right*self.option.rectScale;
    rect.bottom = rect.bottom*self.option.rectScale;
    rect.left = rect.left*self.option.rectScale;
    rect.top = rect.top*self.option.rectScale;

    return rect.right*self.option.rectScale >= viewport.left &&
        rect.bottom*self.option.rectScale >= viewport.top && 
        rect.left*self.option.rectScale <= viewport.right && 
        rect.top*self.option.rectScale <= viewport.bottom;
}

/**
 * 函数节流
 * 
 * @param {function} fn 函数
 * @param {number} minDelay 间隔时间
 * @param {object} scope 引用对象
 */
function throttle(fn, minDelay, scope) {
    var lastCall = 0;
    return function() {
        var now = +new Date();
        if (now - lastCall < minDelay) {
            return;
        }
        lastCall = now;
        fn.apply(scope, arguments);
    };
}
