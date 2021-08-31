'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var isObject = function (val) { return typeof val == 'object' && val !== null; };
var isArray = function (val) { return Array.isArray(val); };
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
        console.log('setupResult', setupResult);
    }
}

function createRenderer(options) {
    var mountComponent = function (vnode, container) {
        // vue是组件级更新的，每个组件应该有个effect/渲染effect 类比vue渲染watcher
        // 组件的创建 拿到外面去
        // 1 根据虚拟节点 创建实例
        var instance = vnode.component = createComponentInstance(vnode);
        // 2 找到setup方法
        setupComponent(instance);
    };
    // 组件
    var processComponent = function (n1, n2, container) {
        if (n1 === null) {
            // 组件挂载
            mountComponent(n2);
        }
    };
    var patch = function (n1, n2, container) {
        // 开始渲染
        var shapeFlags = n2.shapeFlags;
        // 例如  0b1100 & 0b0001
        //      0b1100 & 0b1000
        if (shapeFlags & 1 /* ELEMENT */) ;
        else if (shapeFlags & 4 /* STATEFUL_COMPONENT */) { // 状态组件
            processComponent(n1, n2);
        }
    };
    // options 不同平台传入的不同， 我们core中不关心options里的api具体是什么 ，只需要调用即可
    var render = function (vnode, container) {
        // 初次渲染 /  更新渲染(有prevVnode)
        patch(null, vnode);
    };
    return {
        createApp: createAppApi(render) // 方便拓展，改造成高阶函数方便传人参数
    };
}
// 核心包很多方法

exports.createRenderer = createRenderer;
//# sourceMappingURL=runtime-core.cjs.js.map
