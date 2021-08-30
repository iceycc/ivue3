let proxy = new Proxy({
    name: '1334',
    getName() {
        console.log(this.name)
    }
}, {
    get: function (target, propKey, receiver) {
        console.log(`getting ${propKey}!`);
        return Reflect.get(target, propKey, receiver);
    },
    set: function (target, propKey, value, receiver) {
        console.log(`setting ${propKey}!`);
        return Reflect.set(target, propKey, value, receiver);
    },
    has(target, propKey) {
        return propKey in target;
    },
    deleteProperty(target, p) {
        return Reflect.delete(target, p)
    },
    constructor() {

    },
    apply(target, bindThis, ...args) {
        return Reflect.apply(bindThis, ...args)
    }
})
let obj1 = {
    name: 'obj222',
}
proxy.getName.apply(obj1)


function pipe(value) {
    // 实现链式调用
    let funcStack = []
    let handlers = {
        double: (v) => v * 2,
        pow: (v) => v * v,
        reverseInt: (v) => v.toString().split('').reverse().join('')
    }

    let proxy = new Proxy({}, {
        get(target, p, receiver) {
            if (p === 'get') {
                return funcStack.reduce((value, func) => {
                    return func(value)
                }, value)
            }
            funcStack.push(handlers[p])
            return proxy
        }
    })
    return proxy
}

console.log(pipe(3).pow.double.reverseInt.get);

