function Observer(data) {
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    // 遍历所有data属性
    walk: function(data) {
        var me = this;
        Object.keys(data).forEach(function(key) {
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },
    // 监听data所有属性
    defineReactive: function(data, key, val) {
        var dep = new Dep();
        // 如果val是对象，defineProperty对象里每个属性
        var childObj = observe(val);
        // 重写get，set
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                // 第一次访问的时候执行depend
                // 此时Dep.target是某个template中vue值的观察者
                // 将这个观察者加入发布者dep队列
                // 每次调用defineReactive都会创建一个新的发布者对象
                // data中的每个属性都会对应一个发布者
                // 
                if (Dep.target) {
                    dep.depend();
                }
                return val;
            },
            set: function(newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知订阅者
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }

    return new Observer(value);
}



// 发布者
var uid = 0;

function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    // 添加订阅者
    addSub: function(sub) {
        this.subs.push(sub);
    },
    // 
    depend: function() {
        // Dep.target是对应的Watch对象
        // 使得dep对象和watch对象能相互访问
        Dep.target.addDep(this);
    },
    // 移除订阅者
    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },
    // 通知所有订阅者
    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null;