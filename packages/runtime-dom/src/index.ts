import {createRenderer} from "@iVue/runtime-core"
import {nodeOps} from './nodeOpts'
import {patchProp} from "./patchProp";

function ensureRenderer() {
    // 根据平台传人一些dom操作，创建、删除、添加、属性更新
    return createRenderer({...nodeOps, patchProp})
}

export function createApp(rootComponent) { // // rootComponent -> App
    const app = ensureRenderer().createApp(rootComponent) // 核心调用内层的runtime-core 中的createApp
    const {mount} = app;
    app.mount = function (container) {
        // 外层需要做元素清空操作
        container = document.querySelector(container)
        container.innerHTML = ''; // 清空容器中的内容
        mount(container) // 调用底层mount方法
    }
    return app
}

export * from '@iVue/reactivity'
