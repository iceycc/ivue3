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
        let {shapeFlag, props, children, type} = vnode
        // 将真实节点和虚拟节点关联起来
        let el = vnode.el = hostCreateElement(type) // 创建真实dom
        hostInsert(el, container)
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
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
        // 复用标签
        let el = n2.el = n1.el;
        const oldProps = n1.props;
        const newProps = n2.props;
        patchProps(oldProps, newProps, el)// 新旧属性比对
        patchChildren(n1, n2, el) // 核心
    }

    // 比对孩子 diff
    function patchChildren(n1, n2, el) {
        const c1 = n1.children;
        const c2 = n2.children;
        const prevShapeFlag = n1.shapeFlag
        const nextShapeFlag = n2.shapeFlag
        // 新的是文本,老的是文本，
        // 新的是文本,老的是数组
        if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (c1 !== c2) {
                hostSetElementText(el, c2)
            }
        } else {
            // 新的是数组，老的文本
            // 新的是数组，老的是数组
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                patchKeyedChildren(c1, c2, el)
            } else {
                hostSetElementText(el, '') // 清空老的
                mountChildren(c2, el) // 将孩子遍历插入
            }
        }

    }
    // 对新旧数组孩子比对
    function patchKeyedChildren(c1, c2, el) {

    }

    function patchProps(oldProps, newProps, el) {
        if (oldProps !== newProps) {
            for (let key in newProps) {
                const prev = oldProps[key]
                const next = newProps[key]
                hostPatchProp(el, key, prev, next)
            }
            // 老的有，新的没，需要删调
            for (let key in oldProps) {
                if (!(key in oldProps)) {
                    hostPatchProp(el, key, oldProps[key], null)
                }
            }
        }
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
                let subTree = instance.subTree = instance.render()
                // 用户setup设置返回的render，可以调用h，生成虚拟节点，里面会用到响应式数据，就会收集依赖了

                // 虚拟节点转真实dom
                patch(null, subTree, container)
                instance.isMounted = true // 下次就走更新了
            } else {
                // 组件的更新
                console.log('更新')
                let preTree = instance.subTree
                let nextTree = instance.render()
                patch(preTree, nextTree, container)
                instance.subTree = nextTree
                instance.isMounted = true
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
    const isSameVnodeType = (n1, n2) => {
        return n1.type === n2.type && n1.key === n2.key
    }
    const patch = (n1, n2, container) => {
        console.log(n1, n2, container);
        // 1 类型不一样，key不一样,不复用
        // 2 复用节点后，比对属性
        // 3 对不儿子，一方有儿子，2方都有儿子
        // 4 都有儿子才是diff
        if (n1 && !isSameVnodeType(n1, n2)) {
            // 直接替换
            hostRemove(n1.el)
            n1 = null;
        }


        // 开始渲染
        let {shapeFlag} = n2
        // 例如  0b1100 & 0b0001
        //      0b1100 & 0b1000
        if (shapeFlag & ShapeFlags.ELEMENT) { // 普通节点
            processElement(n1, n2, container)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) { // 状态组件
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
