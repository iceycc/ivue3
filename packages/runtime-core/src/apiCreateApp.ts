import { createVNode } from "./vnode"

export function createAppApi(render) { //

    return (component) => {
        let app = {
            mount(container) {
                // (ast -> codegen) -> render -> vnode - dom
                render(container)
                const vnode = createVNode(component)
                render(vnode, container)
            }
        }
        return app;
    }
}
