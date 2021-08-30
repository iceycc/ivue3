import {hasChange, isArray, isObject} from "@iVue/shared";
import {reactive} from "./reactive";
import {track, trigger} from "./effect";

const convert = (val) => isObject(val) ? reactive(val) : val

class RefImpl {
    public readonly __v_isRef = true
    public _value
    public _rawValue //  可能是普通值 可能是对象

    constructor(rawValue) {
        this._rawValue = rawValue
        this._value = rawValue
    }

    get value() {
        // 依赖收集 {this:{value:[effect,effect]}}
        track(this, 'value') // depend
        return this._value
    }

    set value(newValue) {
        // 如果值有变化再去触发更新，如果值没发生变化 就不要再次触发更新了
        if (hasChange(newValue, this._rawValue)) {
            // 修改值，同时触发收集的effect
            this._value = convert(newValue)
            trigger(this, 'set', 'value') // notify
        }
    }
}

export function ref(rawValue) {
    return new RefImpl(rawValue)
}

class ObjectRefImpl {
    constructor(public object, public key) {
    }

    // 通过类的属性访问器完成 代理
    get value() {
        return this.object[this.key]
    }

    set value(newValue) {
        this.object[this.key] = newValue
    }
}

export function toRefs(object) {
    const result = isArray(object) ? new Array(object.length) : {}
    for (let key in object) {
        result[key] = new ObjectRefImpl(object, key)
    }
    return result;
}
