import {createRenderer} from "@iVue/runtime-core"


function ensureRenderer() {
    return createRenderer()
}
export function createApp(rootComponent) {
    ensureRenderer().createApp(rootComponent)
}

export * from '@iVue/reactivity'
