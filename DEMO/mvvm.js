function MVVM(options) {
    this.$options = options || {};
    var data = this._data = this.$options.data;
    var me = this;

    // 数据代理
    // 使得访问 vm.xx 返回 vm.data.xx
    Object.keys(data).forEach(function(key) {
        me._proxyData(key);
    });
    // 访问计算属性的时候返回get 或计算属性值
    this._initComputed();
    // 监听data
    observe(data, this);
    // 监听template中所有{{}}和v-指令或者事件的值
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    // 手动添加监听的方法
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },
    // 为data上的所有对象属性添加get和set
    _proxyData: function(key, setter, getter) {
        var me = this;
        setter = setter || 
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    },
    // 访问计算属性的时候返回get 或计算属性值
    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};