import {isArray} from "@iVue/shared";

export const effect = (fn, options) => {
    // 需要让传递来的fn 变成响应式的effect，数据有变化 这个fn就能重新执行
    const effect = createReactiveEffect(fn, options); //fn用户传递的函数
    effect();
}

// effect 应该和数据关联起来
export const effectStack = []; // 这个栈为了保证当前effect 和属性能对应上
export let activeEffect = null
let id = 0

function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        if (!effectStack.includes(effect)) {// 不要放重复的effect，防止死循环
            try {
                effectStack.push(effect);
                activeEffect = effect
                return fn() // 让函数执行, 执行完毕后才会执行后面
            } finally {
                effectStack.pop();
                activeEffect = effectStack[effectStack.length - 1]
            }
        }
    }
    effect.id = id++
    return effect
}

// 某个对象中的 某个属性依赖了哪些些effect
// {{}:{name:[effect,effect]}}
// 对象是key使用map，防止内存泄露用 wekMap
const targetMap = new WeakMap() // 收集被劫持的对象

// 收集effect依赖
export function track(target, key) {
    if (activeEffect === undefined) return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        // 给targetmap添加一条记录
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) { // 收集effect
        // 给对象的某个属性创建一个set属性用户存放effect回调函数，不能重复
        depsMap.set(key, (dep = new Set()))
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect) // 收集effect，给该对象的属性增加一条effect，下次更新会通知所以effect更新。
    }
}

// 触发某个对象的某个属性的set或add操作
export function trigger(target, type, key, value) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return // 属性变了但是没有依赖收集，直接跳过
    // 修改
    if (key !== undefined) {
        let effects = depsMap.get(key) // set的对象
        run(effects)
        return
    }
    if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, k) => {
            // 如果改变了长度要更新，小于之前的值也要更新
            if (k >= value) {
                run(dep)
            }
        })
        return
    }
    switch (type) {
        case 'add': // 添加属性就触发
                    // arr.push
            if (isArray(target)) {
                if (parseInt(key) == key) {
                    run(depsMap.get('length'))
                }
            }
            break;
        case 'set':
            break;
        default:
    }
}

function run(effects) {
    effects && effects.forEach(effect => effect())
}

// effect1(()=>{
//     state.name
//     effect2(()=>{
//         state.age
//     })
//     state.address
// })

// 默认先调用effect1 内部对state.name取值 ， 把name属性和 activeEffect(effect1) 关联起来
// 调用effect2 内部对state.age取值， 把age 和 activeEffect(effect2) 关联起来
// effect2 执行完毕 activeEffect 指向effect1
// state.address 再次取值 此时关联到了 effect1

// 数据变化effect就会重新执行
// effect(()=>{
//     state.name++;
// })
