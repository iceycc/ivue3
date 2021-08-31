import {isArray, isObject, isString, ShapeFlags} from "@iVue/shared"

export function createVNode(type, props = {} as any, children = null) {
    //  如果是组件，那么组件类型是对象
    const shapeFlags = isString(type) ? ShapeFlags.ELEMENT :
        isObject(type) ? ShapeFlags.STATEFUL_COMPONENT :
            0

    let vnode = {
        type,
        props,
        children,
        component: null, // 组件的实例，保存组件对应的实例
        el: null,
        key: props.key,
        shapeFlags
    }
    if (isArray(children)) {
        // 元素配合多个儿子
        // 00000001 假如是元素
        // 00010000 假如元素中有多个儿子
        // |= 00010001 17 或运算符  在运算过程中有一个1就是1
        vnode.shapeFlags |= ShapeFlags.ARRAY_CHILDREN; //
    } else {
        // 0000010 假如是组件
        // 组件里可能是空 也可能是文本
        vnode.shapeFlags |= ShapeFlags.TEXT_CHILDREN
    }

    return vnode

    // vue2里面区分孩子是不是数组

}
