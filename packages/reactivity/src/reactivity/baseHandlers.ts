import {activeEffect, effectStack, track, trigger} from "./effect";
import {hasChange, hasOwn, isArray, isObject} from "@iVue/shared";
import {reactive} from "./reactive";

// proxy 和 reflect 连用 （reflect 以后会取代掉 object上一系列法 ）
export const mutableHandlers = {
    // 目标原对象 属性 代理后的对象
    get(target, key, receiver) { // // 内置的 proxy中get和set参数是固定的
        // / 需要让传递来的fn 变成响应式的effect，数据有变化 这个fn就能重新执行
        //  当取值的时候 应该将effect 存储起来 依赖收集
        let result = Reflect.get(target, key, receiver);
        // if (typeof key == 'symbol') {
        //     return result // 源码中是不会对内置的symbol进行依赖收集
        // }
        track(target, key)
        if(result.__v_isRef){ // 如果是ref
            // 加ref包裹的或者计算属性
            return result.value;
        }
        return isObject(result) ? reactive(result) : result;
    },
    set(target, key, value, receiver) {
        // 当设置值的时候 应该通知对应的effect来更新
        // 设置的时候一般分为两种，一种是添加属性 一种是修改属性.
        // 两种类型：数组、对象
        // 如果是数组 就比较当前新增的属性 是否比长度大，大的话就是以前没有新增的
        // 调用push方法 会先进行添加属性 在去更新长度（这次长度更新是没有意义的）
        const oldValue = target[key]; // 上次结果
        const hasKey = isArray(target) && (parseInt(key, 10) == key) ? (Number(key) < target.length) : hasOwn(target, key)
        let result = Reflect.set(target, key, value, receiver)
        // effectStack.forEach(effect => effect()) //暴力循环通知订阅的effect

        if (!hasKey) {
            // console.log('增加属性', key, value)
            trigger(target, 'add', key, value)
        } else if (hasChange(oldValue, value)) {
            // console.log('修改属性', key, value);
            trigger(target, 'set', key, value)
        }
        return result
    }
}

// 默认加载页面时 会先调用一次effect，此时effect方法中的数据会进行取值操作 -》 get方法
//                让对应的属性保存当前的effect  =>  某个对象中 name属性  对应的effect有几个

// 某个对象中 name属性 变化了 ， 需要找到对应的effect列表让他依次执行
