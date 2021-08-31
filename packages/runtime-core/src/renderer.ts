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
    const mountElement = (vnode, container, anchor) => {
        let {shapeFlag, props, children, type} = vnode
        // 将真实节点和虚拟节点关联起来
        let el = vnode.el = hostCreateElement(type) // 创建真实dom
        hostInsert(el, container, anchor) // anchor不传默认为往后插入appendChild
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
        // 两方都有儿子 核心的diff算法

        // 两个儿子 要尽可能复用
        // 1）abc
        //    abde  i = 2
        // 先默认处理特殊情况
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = c2.length - 1;
        while (i <= e1 && i <= e2) { // 谁先比对完毕就结束
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, el); // 递归比较子节点
            } else {
                break;
            }
            i++;
        }
        // 2) abc    i = 0  e1=2  e2=3
        //   eabc    i=0 e1=-1 e2=0
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, el);
            } else {
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
                const nextPos = e2 + 1;
                const anchor = nextPos < c2.length ? c2[nextPos].el : null// 参照物
                while (i <= e2) {
                    patch(null, c2[i], el, anchor);
                    i++;
                }
            }
            // abcdef abc (i=3 e1=5 e2=2)
        } else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        } else {
            // todo 乱序比对 比对两方儿子的差异
            //  最长递增子序列
            // abc   eabcf


        }
        // 最后在考虑都不一样的情况
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
    const processElement = (n1, n2, container, anchor) => {
        if (n1 === null) {
            // 元素挂载
            mountElement(n2, container, anchor)
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
    const patch = (n1, n2, container, anchor = null) => {
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
            processElement(n1, n2, container, anchor)
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
