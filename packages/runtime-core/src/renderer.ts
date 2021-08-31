import {createAppApi} from "./apiCreateApp";
import {ShapeFlags} from "@iVue/shared";
import {createComponentInstance, setupComponent} from "./component";
import {effect} from "@iVue/reactivity";
import {patchProp} from "../../runtime-dom/src/patchProp";
// 初次组件渲染 render -》 patch方法 -》渲染组件 -》processComponent -> mountComponent ->
// 初次元素渲染 render -> patch方法 -> processElement -> mountElement
//
export function createRenderer(options) {
    let {
        createElement: hostCreateElement,
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElementText,
        createTextNode: hostCreateNode,
        patchProp: hostPatchProp
    } = options
    const mountElement = (vnode, container) => {
        console.log(vnode, container)
        let {shapeFlags, props, children, type} = vnode
        // 将真实节点和虚拟节点关联起来
        let el = vnode.el = hostCreateElement(type) // 创建真实dom
        hostInsert(el, container)
        if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children) // 文本节点，渲染文本节点
        } else {
            mountChildren(children, el)
        }
        if (props) {
            for (let key in props) {
                if (props.hasOwnProperty(key)) {
                    hostPatchProp(el, key, null, props[key])
                }
            }
        }
    }

    function mountChildren(children, container) {
        for (let child of children) {
            patch(null, child, container)
        }
    }

    const patchElement = (n1, n2, container) => {

    }
    const mountComponent = (vnode, container) => {
        // vue是组件级更新的，每个组件应该有个effect/渲染effect 类比vue渲染watcher
        // 组件的创建 拿到外面去

        // 1 根据虚拟节点 创建实例
        const instance = vnode.component = createComponentInstance(vnode)
        // 2 找到setup方法
        setupComponent(instance) // instance = {type,props,component,render}
        // 3 设置渲染effect
        setupRenderEffect(instance, vnode, container)

    }
    // 设置每个组件都会提供一个effect方法
    const setupRenderEffect = (instance, vnode, container) => {
        effect(() => { // effect默认会执行
            if (!instance.isMounted) { // 组件没有被渲染
                console.log('初始化')
                let subTree = instance.subTree = instance.render(instance)
                // 用户setup设置返回的render，可以调用h，生成虚拟节点，里面会用到响应式数据，就会收集依赖了

                // 虚拟节点转真实dom
                patch(null, subTree, container)
                instance.isMounted = true // 下次就走更新了
            } else {
                // 组件的更新
            }
        })
    }
    const patchComponent = (n1, n2, container) => {

    }
    // 元素
    const processElement = (n1, n2, container) => {
        if (n1 === null) {
            // 元素挂载
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
