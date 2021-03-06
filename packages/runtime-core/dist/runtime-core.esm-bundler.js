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
    var shapeFlag = isString(type) ? 1 /* ELEMENT */ :
        isObject(type) ? 4 /* STATEFUL_COMPONENT */ :
            0;
    var vnode = {
        type: type,
        props: props,
        children: children,
        component: null,
        el: null,
        key: props.key,
        shapeFlag: shapeFlag
    };
    if (isArray(children)) {
        // 元素配合多个儿子
        // 00000001 假如是元素
        // 00010000 假如元素中有多个儿子
        // |= 00010001 17 或运算符  在运算过程中有一个1就是1
        vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */; //
    }
    else {
        // 0000010 假如是组件
        // 组件里可能是空 也可能是文本
        vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
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

/** @class */ ((function () {
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
})());

var convert = function (val) { return isObject(val) ? reactive(val) : val; };
/** @class */ ((function () {
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
})());
/** @class */ ((function () {
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
})());

// 初次组件渲染 render -》 patch方法 -》渲染组件 -》processComponent -> mountComponent ->
// 初次元素渲染 render -> patch方法 -> processElement -> mountElement
//
function createRenderer(options) {
    var hostCreateElement = options.createElement, hostInsert = options.insert, hostRemove = options.remove, hostSetElementText = options.setElementText; options.createTextNode; var hostPatchProp = options.patchProp;
    var mountElement = function (vnode, container, anchor) {
        var shapeFlag = vnode.shapeFlag, props = vnode.props, children = vnode.children, type = vnode.type;
        // 将真实节点和虚拟节点关联起来
        var el = vnode.el = hostCreateElement(type); // 创建真实dom
        hostInsert(el, container, anchor); // anchor不传默认为往后插入appendChild
        if (shapeFlag & 8 /* TEXT_CHILDREN */) {
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
    var patchElement = function (n1, n2, container) {
        // 复用标签
        var el = n2.el = n1.el;
        var oldProps = n1.props;
        var newProps = n2.props;
        patchProps(oldProps, newProps, el); // 新旧属性比对
        patchChildren(n1, n2, el); // 核心
    };
    // 比对孩子 diff
    function patchChildren(n1, n2, el) {
        var c1 = n1.children;
        var c2 = n2.children;
        var prevShapeFlag = n1.shapeFlag;
        var nextShapeFlag = n2.shapeFlag;
        // 新的是文本,老的是文本，
        // 新的是文本,老的是数组
        if (nextShapeFlag & 8 /* TEXT_CHILDREN */) {
            if (c1 !== c2) {
                hostSetElementText(el, c2);
            }
        }
        else {
            // 新的是数组，老的文本
            // 新的是数组，老的是数组
            if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                patchKeyedChildren(c1, c2, el);
            }
            else {
                hostSetElementText(el, ''); // 清空老的
                mountChildren(c2, el); // 将孩子遍历插入
            }
        }
    }
    // 对新旧数组孩子比对
    function patchKeyedChildren(c1, c2, el) {
        // 两方都有儿子 核心的diff算法
        // 两个儿子 要尽可能复用
        // 1）abc
        //    abde  i = 2
        // 先默认处理特殊情况
        var i = 0;
        var e1 = c1.length - 1;
        var e2 = c2.length - 1;
        while (i <= e1 && i <= e2) { // 谁先比对完毕就结束
            var n1 = c1[i];
            var n2 = c2[i];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, el); // 递归比较子节点
            }
            else {
                break;
            }
            i++;
        }
        // 2) abc    i = 0  e1=2  e2=3
        //   eabc    i=0 e1=-1 e2=0
        while (i <= e1 && i <= e2) {
            var n1 = c1[e1];
            var n2 = c2[e2];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, el);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 老的都能复用 只是向前或者向后插入了元素
        // 3) 考虑极端的情况
        // abc => abcdef （i=3  e1=2  e2= 5）
        //  abc => fedabc (i=0 e1=-1 e2=2)
        // 我怎么知道是新的比老的多？
        if (i > e1) { // 最起码能保证老节点都比较完毕了
            if (i <= e2) { // 新增的节点
                // 我怎么知道是向前插入 还是向后插入 , 如果是向前插入，那应该插入到谁的前面
                // 如果前面都一样 e2 不会动 取他的 + 1 个 比数组长度大
                // 如果后面都一样 e2 会向前 取他的 + 1 个 会比数组长度小
                var nextPos = e2 + 1;
                var anchor = nextPos < c2.length ? c2[nextPos].el : null; // 参照物
                while (i <= e2) {
                    patch(null, c2[i], el, anchor);
                    i++;
                }
            }
            // abcdef abc (i=3 e1=5 e2=2)
        }
        else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else ;
        // 最后在考虑都不一样的情况
    }
    function patchProps(oldProps, newProps, el) {
        if (oldProps !== newProps) {
            for (var key in newProps) {
                var prev = oldProps[key];
                var next = newProps[key];
                hostPatchProp(el, key, prev, next);
            }
            // 老的有，新的没，需要删调
            for (var key in oldProps) {
                if (!(key in oldProps)) {
                    hostPatchProp(el, key, oldProps[key], null);
                }
            }
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
                var subTree = instance.subTree = instance.render();
                // 用户setup设置返回的render，可以调用h，生成虚拟节点，里面会用到响应式数据，就会收集依赖了
                // 虚拟节点转真实dom
                patch(null, subTree, container);
                instance.isMounted = true; // 下次就走更新了
            }
            else {
                // 组件的更新
                console.log('更新');
                var preTree = instance.subTree;
                var nextTree = instance.render();
                patch(preTree, nextTree, container);
                instance.subTree = nextTree;
                instance.isMounted = true;
            }
        });
    };
    // 元素
    var processElement = function (n1, n2, container, anchor) {
        if (n1 === null) {
            // 元素挂载
            mountElement(n2, container, anchor);
        }
        else {
            // 组件更新
            patchElement(n1, n2);
        }
    };
    // 组件
    var processComponent = function (n1, n2, container) {
        if (n1 === null) {
            // 组件挂载
            mountComponent(n2, container);
        }
    };
    var isSameVnodeType = function (n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    };
    var patch = function (n1, n2, container, anchor) {
        if (anchor === void 0) { anchor = null; }
        console.log(n1, n2, container);
        // 1 类型不一样，key不一样,不复用
        // 2 复用节点后，比对属性
        // 3 对不儿子，一方有儿子，2方都有儿子
        // 4 都有儿子才是diff
        if (n1 && !isSameVnodeType(n1, n2)) {
            // 直接替换
            hostRemove(n1.el);
            n1 = null;
        }
        // 开始渲染
        var shapeFlag = n2.shapeFlag;
        // 例如  0b1100 & 0b0001
        //      0b1100 & 0b1000
        if (shapeFlag & 1 /* ELEMENT */) { // 普通节点
            processElement(n1, n2, container, anchor);
        }
        else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) { // 状态组件
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

export { createRenderer, h };
//# sourceMappingURL=runtime-core.esm-bundler.js.map
