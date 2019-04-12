function Compile(el, vm) {
    // Mvvm对象
    this.$vm = vm;
    // 保证$el是DOM节点
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        // 将目标节点的所有子节点保存在一个代码碎片里
        this.$fragment = this.node2Fragment(this.$el);
        // 初始化，找出所有template中相关的vue元素，添加绑定事件
        this.init();
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        // 编译所有节点【读取节点中的信息】
        this.compileElement(this.$fragment);
    },
    // 编译
    compileElement: function(el) {
        var childNodes = el.childNodes,
            me = this;

        // 深拷贝节点，并遍历之，只拿node中的信息，不改，所以深拷贝保证安全
        [].slice.call(childNodes).forEach(function(node) {
            // 获取节点中所有文本信息
            var text = node.textContent;
            var reg = /\{\{(.*)\}\}/;
            // 处理节点属性和事件
            if (me.isElementNode(node)) {
                me.compile(node);
            } else if (me.isTextNode(node) && reg.test(text)) {
                // 处理节点文本
                me.compileText(node, RegExp.$1.trim());
            }
            // 递归处理子节点
            if (node.childNodes && node.childNodes.length) {
                me.compileElement(node);
            }
        });
    },
    // 处理节点属性和事件
    compile: function(node) {
        var nodeAttrs = node.attributes,
            me = this;
        // 遍历属性
        [].slice.call(nodeAttrs).forEach(function(attr) {
            var attrName = attr.name;
            // 判断是否为v-打头的指令
            if (me.isDirective(attrName)) {
                var exp = attr.value;
                // 指令名
                var dir = attrName.substring(2);
                // 事件指令
                if (me.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                } else {
                    // 普通指令
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }
                // 移除指令信息
                node.removeAttribute(attrName);
            }
        });
    },
    // 处理文本节点
    compileText: function(node, exp) {
        // 和v-text一个处理方式
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    // v-text
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    // v-html
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },
    // v-model
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },
    // v-class
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },
    // 指令绑定（节点， Mvvm对象， 指令值， 指令名）
    // 初始化的时候直接将DOM中的值转换成实际值，bind的过程就是compile的过程
    // 并添加观察者
    bind: function(node, vm, exp, dir) {
        // dom节点更新方法
        var updaterFn = updater[dir + 'Updater'];
        // 各指令对应方法，更新节点内容（节点， 绑定的实际值）
        // 首次更新html的值。初始化，并在合适时候再次更新这些值
        // 首次更新这些值的时候分两步
        // 1.拿到值
        // 此时会触发这些值的get方法
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));
        // 订阅（Mvvm对象， 指令值， 通知执行方法）
        new Watcher(vm, exp, function(value, oldValue) {
            // 观察者发出通知时，更新节点内容，并多加一个新值和旧值
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理（节点， Mvvm对象， 指令值， 指令名）
    eventHandler: function(node, vm, exp, dir) {
        // 事件类型
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            // 给节点添加对应事件，执行对应的方法
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },
    // 根据指令值获取对象中的实际值（Mvvm对象，指令值）
    // 此处这两个方法
    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        // 此处拿值首先触发data的get方法，拿options中的值
        // 然后继续触发options中data的get
        // 由于此时还没有target。直接拿到了值
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },
    // 更新值
    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};


var updater = {
    // 更新文本
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },
    // 更新html
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },
    // 更新类名
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },
    // 更新value
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};