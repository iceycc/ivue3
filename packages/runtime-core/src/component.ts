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
        console.log('setupResult', setupResult)
    }
}

export function setupEffect() {

}


