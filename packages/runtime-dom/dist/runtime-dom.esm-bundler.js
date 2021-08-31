/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var isObject = function (val) { return typeof val == 'object' && val !== null; };
var hasOwn = function (target, key) { return Object.prototype.hasOwnProperty.call(target, key); };
var isArray = function (val) { return Array.isArray(val); };
var hasChange = function (oldVal, newVal) { return oldVal !== newVal; };
var isFunction = function (val) { return typeof val === 'function'; };
var isString = function (val) { return typeof val === 'string'; };

function createVNode(type, props, children) {
    if (props === void 0) { props = {}; }
    if (children === void 0) { children = null; }
    //  如果是组件，那么组件类型是对象
    var shapeFlags = isString(type) ? 1 /* ELEMENT */ :
        isObject(type) ? 4 /* STATEFUL_COMPONENT */ :
            0;
    var vnode = {
        type: type,
        props: props,
        children: children,
        component: null,
        el: null,
        key: props.key,
        shapeFlags: shapeFlags
    };
    if (isArray(children)) {
        // 元素配合多个儿子
        // 00000001 假如是元素
        // 00010000 假如元素中有多个儿子
        // |= 00010001 17 或运算符  在运算过程中有一个1就是1
        vnode.shapeFlags |= 16 /* ARRAY_CHILDREN */; //
    }
    else {
        // 0000010 假如是组件
        // 组件里可能是空 也可能是文本
        vnode.shapeFlags |= 8 /* TEXT_CHILDREN */;
    }
    return vnode;
    // vue2里面区分孩子是不是数组
}

function createAppApi(render) {
    return function (component) {
        var app = {
            mount: function (container) {
                // (ast -> codegen) -> render -> vnode - dom
                render(container);
                var vnode = createVNode(component);
                render(vnode, container);
            }
        };
        return app;
    };
}

function createComponentInstance(vnode) {
    var instance = {
        type: vnode.type,
        props: vnode.props,
        subTree: null,
        vnode: vnode,
        render: null,
        setupState: null,
        isMounted: false, // 目前这个组件有没有被挂载
    };
    return instance;
}
function setupComponent(instance) {
    // 其他功能属性、插槽处理
    // 状态组件的setup方法
    setupStateFullComponent(instance);
}
function setupStateFullComponent(instance) {
    var Component = instance.type;
    var setup = Component.setup;
    if (setup) {
        // props和上下文
        var setupResult = setup(instance.props, {});
        // console.log('setupResult', setupResult)
        // setup可以返回一个render函数也可以返回状态对象
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        instance.render = setupResult;
    }
    else if (isObject(setupResult)) {
        instance.setupState = setupResult;
    }
    // 如果用户用的vue2的写法，render，data。如何兼容
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    var Component = instance.type;
    // vue3 setup的优先级更高。比如返回状态或者返回render函数
    if (Component.render && !instance.render) { // vue2的方法
        instance.render = Component.render;
    }
    if (!instance.render) ;
}

var effect = function (fn, options) {
    // 需要让传递来的fn 变成响应式的effect，数据有变化 这个fn就能重新执行
    var effect = createReactiveEffect(fn, options); //fn用户传递的函数
    if (!options || (options && !options.lazy)) {
        effect();
    }
    return effect;
};
// effect 应该和数据关联起来
var effectStack = []; // 这个栈为了保证当前effect 和属性能对应上
var activeEffect = null;
var id = 0;
function createReactiveEffect(fn, options) {
    var effect = function reactiveEffect() {
        if (!effectStack.includes(effect)) { // 不要放重复的effect，防止死循环
            try {
                effectStack.push(effect);
                activeEffect = effect;
                return fn(); // 让函数执行, 执行完毕后才会执行后面
            }
            finally {
                effectStack.pop();
                activeEffect = effectStack[effectStack.length - 1];
            }
        }
    };
    effect.id = id++;
    effect.options = options;
    return effect;
}
// 某个对象中的 某个属性依赖了哪些些effect
// {{}:{name:[effect,effect]}}
// 对象是key使用map，防止内存泄露用 wekMap
var targetMap = new WeakMap(); // 收集被劫持的对象
// 收集effect依赖
function track(target, key) {
    if (activeEffect === undefined)
        return;
    var depsMap = targetMap.get(target);
    if (!depsMap) {
        // 给targetmap添加一条记录
        targetMap.set(target, (depsMap = new Map()));
    }
    var dep = depsMap.get(key);
    if (!dep) { // 收集effect
        // 给对象的某个属性创建一个set属性用户存放effect回调函数，不能重复
        depsMap.set(key, (dep = new Set()));
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect); // 收集effect，给该对象的属性增加一条effect，下次更新会通知所以effect更新。
    }
}
// 触发某个对象的某个属性的set或add操作
function trigger(target, type, key, value) {
    var depsMap = targetMap.get(target);
    if (!depsMap)
        return; // 属性变了但是没有依赖收集，直接跳过
    // 修改
    if (key !== undefined) {
        var effects = depsMap.get(key); // set的对象
        run(effects);
        return;
    }
    if (key === 'length' && isArray(target)) {
        depsMap.forEach(function (dep, k) {
            // 如果改变了长度要更新，小于之前的值也要更新
            if (k >= value) {
                run(dep);
            }
        });
        return;
    }
    switch (type) {
        case 'add': // 添加属性就触发
            // arr.push
            if (isArray(target)) {
                if (parseInt(key) == key) {
                    run(depsMap.get('length'));
                }
            }
            break;
    }
}
// 执行effect
function run(effects) {
    effects && effects.forEach(function (effect) {
        // effect 有两种 1.渲染 2.计算属性对应的effect
        // 计算属性
        if (!effect)
            return;
        if (effect.options && effect.options.scheduler) {
            effect.options.scheduler();
        }
        else {
            effect();
        }
    });
}
// effect1(()=>{
//     state.name
//     effect2(()=>{
//         state.age
//     })
//     state.address
// })
// 默认先调用effect1 内部对state.name取值 ， 把name属性和 activeEffect(effect1) 关联起来
// 调用effect2 内部对state.age取值， 把age 和 activeEffect(effect2) 关联起来
// effect2 执行完毕 activeEffect 指向effect1
// state.address 再次取值 此时关联到了 effect1
// 数据变化effect就会重新执行
// effect(()=>{
//     state.name++;
// })

// proxy 和 reflect 连用 （reflect 以后会取代掉 object上一系列法 ）
var mutableHandlers = {
    // 目标原对象 属性 代理后的对象
    get: function (target, key, receiver) {
        // / 需要让传递来的fn 变成响应式的effect，数据有变化 这个fn就能重新执行
        //  当取值的时候 应该将effect 存储起来 依赖收集
        var result = Reflect.get(target, key, receiver);
        // if (typeof key == 'symbol') {
        //     return result // 源码中是不会对内置的symbol进行依赖收集
        // }
        track(target, key);
        if (result.__v_isRef) { // 如果是ref
            // 加ref包裹的或者计算属性
            return result.value;
        }
        return isObject(result) ? reactive(result) : result;
    },
    set: function (target, key, value, receiver) {
        // 当设置值的时候 应该通知对应的effect来更新
        // 设置的时候一般分为两种，一种是添加属性 一种是修改属性.
        // 两种类型：数组、对象
        // 如果是数组 就比较当前新增的属性 是否比长度大，大的话就是以前没有新增的
        // 调用push方法 会先进行添加属性 在去更新长度（这次长度更新是没有意义的）
        var oldValue = target[key]; // 上次结果
        var hasKey = isArray(target) && (parseInt(key, 10) == key) ? (Number(key) < target.length) : hasOwn(target, key);
        var result = Reflect.set(target, key, value, receiver);
        // effectStack.forEach(effect => effect()) //暴力循环通知订阅的effect
        if (!hasKey) {
            // console.log('增加属性', key, value)
            trigger(target, 'add', key, value);
        }
        else if (hasChange(oldValue, value)) {
            // console.log('修改属性', key, value);
            trigger(target, 'set', key, value);
        }
        return result;
    }
};
// 默认加载页面时 会先调用一次effect，此时effect方法中的数据会进行取值操作 -》 get方法
//                让对应的属性保存当前的effect  =>  某个对象中 name属性  对应的effect有几个
// 某个对象中 name属性 变化了 ， 需要找到对应的effect列表让他依次执行

var reactive = function (target) {
    // 你给我一个对象 我需要让这个对象变成响应式对象
    // 在vue2.0的时候 defineProprety直接循环对象中的每一个属性， 无法对不存在的属性做处理.递归处理多级对象
    // vue3.0 没有循环 对原对象进行代理,vue3不存在的属性也可以监控到,vue3 没有以上来就递归
    return createReactiveObject(target, mutableHandlers); // 高阶函数，可以根据不同的参数实现不同的功能
};
var reactiveMap = new WeakMap(); // 映射表中的key必须是对象，而且不会有内存泄漏的问题
function createReactiveObject(target, options) {
    // // 如果这个target 是一个对象
    if (!isObject(target))
        return target; // 不是对象直接返回即可
    // 如果对象已经被代理过了，就不要再次代理了
    var exists = reactiveMap.get(target);
    if (exists) {
        return exists;
    }
    var proxy = new Proxy(target, options);
    reactiveMap.set(target, proxy); // {需要代理的对象：代理后的值}
    return proxy;
}

var ComputedRefImpl = /** @class */ (function () {
    function ComputedRefImpl(getter, setter) {
        var _this = this;
        this.setter = setter;
        this.__v_isReadonly = true;
        this.__v_isRef = true;
        this._dirty = true;
        // 默认getter执行的时候会依赖于一个effect （计算属性默认就是一个effect）
        this.effect = effect(getter, {
            lazy: true,
            scheduler: function () {
                _this._dirty = true; // 依赖的值变化了, 重制缓存
                trigger(_this, 'set', 'value');
            }
        });
    }
    Object.defineProperty(ComputedRefImpl.prototype, "value", {
        get: function () {
            if (this._dirty) { // 增加缓存
                this._value = this.effect();
                track(this, 'value'); // 取值时收集依赖 {this:{'value':[effect]}
                this._dirty = false;
            }
            return this._value;
        },
        set: function (newValue) {
            this.setter(newValue);
        },
        enumerable: false,
        configurable: true
    });
    return ComputedRefImpl;
}());
function computed(getterOrOptions) {
    // 分别拿到get和set
    var getter;
    var setter;
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions;
        setter = function () {
            console.log('computed not set value');
        };
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter);
}

var convert = function (val) { return isObject(val) ? reactive(val) : val; };
var RefImpl = /** @class */ (function () {
    function RefImpl(rawValue) {
        this.__v_isRef = true;
        this._rawValue = rawValue;
        this._value = rawValue;
    }
    Object.defineProperty(RefImpl.prototype, "value", {
        get: function () {
            // 依赖收集 {this:{value:[effect,effect]}}
            track(this, 'value'); // depend
            return this._value;
        },
        set: function (newValue) {
            // 如果值有变化再去触发更新，如果值没发生变化 就不要再次触发更新了
            if (hasChange(newValue, this._rawValue)) {
                // 修改值，同时触发收集的effect
                this._value = convert(newValue);
                trigger(this, 'set', 'value'); // notify
            }
        },
        enumerable: false,
        configurable: true
    });
    return RefImpl;
}());
function ref(rawValue) {
    return new RefImpl(rawValue);
}
var ObjectRefImpl = /** @class */ (function () {
    function ObjectRefImpl(object, key) {
        this.object = object;
        this.key = key;
    }
    Object.defineProperty(ObjectRefImpl.prototype, "value", {
        // 通过类的属性访问器完成 代理
        get: function () {
            return this.object[this.key];
        },
        set: function (newValue) {
            this.object[this.key] = newValue;
        },
        enumerable: false,
        configurable: true
    });
    return ObjectRefImpl;
}());
function toRefs(object) {
    var result = isArray(object) ? new Array(object.length) : {};
    for (var key in object) {
        result[key] = new ObjectRefImpl(object, key);
    }
    return result;
}

// 初次组件渲染 render -》 patch方法 -》渲染组件 -》processComponent -> mountComponent ->
// 初次元素渲染 render -> patch方法 -> processElement -> mountElement
//
function createRenderer(options) {
    var hostCreateElement = options.createElement, hostInsert = options.insert; options.remove; var hostSetElementText = options.setElementText; options.createTextNode; var hostPatchProp = options.patchProp;
    var mountElement = function (vnode, container) {
        console.log(vnode, container);
        var shapeFlags = vnode.shapeFlags, props = vnode.props, children = vnode.children, type = vnode.type;
        // 将真实节点和虚拟节点关联起来
        var el = vnode.el = hostCreateElement(type); // 创建真实dom
        hostInsert(el, container);
        if (shapeFlags & 8 /* TEXT_CHILDREN */) {
            hostSetElementText(el, children); // 文本节点，渲染文本节点
        }
        else {
            mountChildren(children, el);
        }
        if (props) {
            for (var key in props) {
                if (props.hasOwnProperty(key)) {
                    hostPatchProp(el, key, null, props[key]);
                }
            }
        }
    };
    function mountChildren(children, container) {
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var child = children_1[_i];
            patch(null, child, container);
        }
    }
    var mountComponent = function (vnode, container) {
        // vue是组件级更新的，每个组件应该有个effect/渲染effect 类比vue渲染watcher
        // 组件的创建 拿到外面去
        // 1 根据虚拟节点 创建实例
        var instance = vnode.component = createComponentInstance(vnode);
        // 2 找到setup方法
        setupComponent(instance); // instance = {type,props,component,render}
        // 3 设置渲染effect
        setupRenderEffect(instance, vnode, container);
    };
    // 设置每个组件都会提供一个effect方法
    var setupRenderEffect = function (instance, vnode, container) {
        effect(function () {
            if (!instance.isMounted) { // 组件没有被渲染
                console.log('初始化');
                var subTree = instance.subTree = instance.render(instance);
                // 用户setup设置返回的render，可以调用h，生成虚拟节点，里面会用到响应式数据，就会收集依赖了
                // 虚拟节点转真实dom
                patch(null, subTree, container);
                instance.isMounted = true; // 下次就走更新了
            }
        });
    };
    // 元素
    var processElement = function (n1, n2, container) {
        if (n1 === null) {
            // 元素挂载
            mountElement(n2, container);
        }
    };
    // 组件
    var processComponent = function (n1, n2, container) {
        if (n1 === null) {
            // 组件挂载
            mountComponent(n2, container);
        }
    };
    var patch = function (n1, n2, container) {
        // 开始渲染
        var shapeFlags = n2.shapeFlags;
        // 例如  0b1100 & 0b0001
        //      0b1100 & 0b1000
        if (shapeFlags & 1 /* ELEMENT */) { // 普通节点
            processElement(n1, n2, container);
        }
        else if (shapeFlags & 4 /* STATEFUL_COMPONENT */) { // 状态组件
            processComponent(n1, n2, container);
        }
    };
    // options 不同平台传入的不同， 我们core中不关心options里的api具体是什么 ，只需要调用即可
    var render = function (vnode, container) {
        // 初次渲染 /  更新渲染(有prevVnode)
        patch(null, vnode, container);
    };
    return {
        createApp: createAppApi(render) // 方便拓展，改造成高阶函数方便传人参数
    };
}
// 核心包很多方法

function h(type, props, children) {
    return createVNode(type, props, children);
}

var nodeOps = {
    createElement: function (type) {
        return document.createElement(type);
    },
    insert: function (child, parent, anchor) {
        if (anchor === void 0) { anchor = null; }
        // anchor == null appendChild
        parent.insertBefore(child, anchor);
    },
    remove: function (child) {
        var parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    setElementText: function (node, text) {
        node.textContent = text;
    },
    createTextNode: function (content) {
        return document.createTextNode(content);
    }
};

function patchStyle(el, prev, next) {
    // 如果原生next属性没有值
    var style = el.style;
    if (!next) {
        el.removeAttribute('style');
    }
    else {
        for (var key in next) { // 新的全量覆盖老的
            style[key] = next[key];
        }
        if (prev) { // 老的有，新的没，移除
            for (var key in prev) {
                if (!next[key]) {
                    style[key] = '';
                }
            }
        }
    }
}
function patchClass(el, next) {
    if (next == null) {
        next = '';
    }
    el.className = next;
}
function patchAttr(el, key, next) {
    if (next == null) {
        el.removeAttribute(key);
    }
    el.setAttribute(key, next);
}
function patchProp(el, key, prevValue, nextValue) {
    switch (key) {
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        case 'class':
            patchClass(el, nextValue);
            break;
        default:
            patchAttr(el, key, nextValue);
    }
}

function ensureRenderer() {
    // 根据平台传人一些dom操作，创建、删除、添加、属性更新
    return createRenderer(__assign(__assign({}, nodeOps), { patchProp: patchProp }));
}
function createApp(rootComponent) {
    var app = ensureRenderer().createApp(rootComponent); // 核心调用内层的runtime-core 中的createApp
    var mount = app.mount;
    app.mount = function (container) {
        // 外层需要做元素清空操作
        container = document.querySelector(container);
        container.innerHTML = ''; // 清空容器中的内容
        mount(container); // 调用底层mount方法
    };
    return app;
}

export { computed, createApp, createRenderer, effect, h, reactive, ref, toRefs };
//# sourceMappingURL=runtime-dom.esm-bundler.js.map
