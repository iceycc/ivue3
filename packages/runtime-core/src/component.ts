import {isFunction, isObject} from "@iVue/shared"
import {effect} from "@iVue/reactivity";

export function createComponentInstance(vnode) {
    const instance = {
        type: vnode.type,
        props: vnode.props,
        subTree: null, // 组件对应资源是的虚拟节点  vue2中 _vnode组件中渲染的节点，$vnode组件本身的虚拟节点
        vnode: vnode,
        render: null, // setup返回函数时
        setupState: null, // setup返回对象时
        isMounted: false,// 目前这个组件有没有被挂载
    }
    return instance
}

export function setupComponent(instance) {
    // 其他功能属性、插槽处理
    // 状态组件的setup方法
    setupStateFullComponent(instance)

}

function setupStateFullComponent(instance) {
    const Component = instance.type
    let {setup} = Component
    if (setup) {
        // props和上下文
        const setupResult = setup(instance.props, {})
        // console.log('setupResult', setupResult)
        // setup可以返回一个render函数也可以返回状态对象
        handleSetupResult(instance, setupResult)
    }
}

function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        instance.render = setupResult
    } else if (isObject(setupResult)) {
        instance.setupState = setupResult
    }
    // 如果用户用的vue2的写法，render，data。如何兼容
    finishComponentSetup(instance)

}

function finishComponentSetup(instance) {
    const Component = instance.type
    // vue3 setup的优先级更高。比如返回状态或者返回render函数
    if (Component.render && !instance.render) { // vue2的方法
        instance.render = Component.render
    }
    if (!instance.render) {
        // todo 如果没有render函数，找外层template -》 ast -》 codegen render -》 render函数
        // instance.render = ()=>{}
    }
    // 变量合并 数据要和vue2中的代码合并
    applyOptions(instance, Component)
}

function applyOptions(instance, Component) {
    //todo 各种合并 data 、 computed等等
}





