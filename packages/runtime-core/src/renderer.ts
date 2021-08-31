import {createAppApi} from "./apiCreateApp";
import {ShapeFlags} from "@iVue/shared";
import {createComponentInstance, setupComponent, setupEffect} from "./component";

export function createRenderer(options) {
    const mountElement = (n2, container) => {

    }
    const patchElement = (n1, n2, container) => {

    }
    const mountComponent = (vnode, container) => {
        // vue是组件级更新的，每个组件应该有个effect/渲染effect 类比vue渲染watcher
        // 组件的创建 拿到外面去

        // 1 根据虚拟节点 创建实例
        const instance = vnode.component = createComponentInstance(vnode)
        // 2 找到setup方法
        setupComponent(instance)
        // 3 设置渲染effect
        setupEffect()
    }
    const patchComponent = (n1, n2, container) => {

    }
    // 元素
    const processElement = (n1, n2, container) => {
        if (n1 === null) {
            // 组件挂载
            mountElement(n2, container)
        } else {
            // 组件更新
            patchElement(n1, n2, container)
        }
    }
    // 组件
    const processComponent = (n1, n2, container) => {
        if (n1 === null) {
            // 组件挂载
            mountComponent(n2, container)
        } else {
            // 组件更新
            patchComponent(n1, n2, container)
        }
    }

    const patch = (n1, n2, container) => {
        // 开始渲染
        let {shapeFlags} = n2
        // 例如  0b1100 & 0b0001
        //      0b1100 & 0b1000
        if (shapeFlags & ShapeFlags.ELEMENT) { // 普通节点
            processElement(n1, n2, container)
        } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) { // 状态组件
            processComponent(n1, n2, container)

        }
    }


    // options 不同平台传入的不同， 我们core中不关心options里的api具体是什么 ，只需要调用即可
    const render = (vnode, container) => { // 渲染器
        // 初次渲染 /  更新渲染(有prevVnode)
        patch(null, vnode, container)
    }
    return {
        createApp: createAppApi(render) // 方便拓展，改造成高阶函数方便传人参数
    }
}

// 核心包很多方法
