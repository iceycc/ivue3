import {effectStack} from "./effect";

// proxy 和 reflect 连用 （reflect 以后会取代掉 object上一系列法 ）
export const mutableHandlers = {
    // 目标原对象 属性 代理后的对象
    get(target, key, receiver) { // // 内置的 proxy中get和set参数是固定的
        // / 需要让传递来的fn 变成响应式的effect，数据有变化 这个fn就能重新执行
        // todo 当取值的时候 应该将effect 存储起来 依赖收集
        return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
        let result = Reflect.set(target, key, value, receiver)
        // 当设置值的时候 应该通知对应的effect来更新
        effectStack.forEach(effect => effect())
        return result
    }
}

// 默认加载页面时 会先调用一次effect，此时effect方法中的数据会进行取值操作 -》 get方法
//                让对应的属性保存当前的effect  =>  某个对象中 name属性  对应的effect有几个

// 某个对象中 name属性 变化了 ， 需要找到对应的effect列表让他依次执行
