function patchStyle(el, prev, next) {
    // 如果原生next属性没有值
    const style = el.style
    if (!next) {
        el.removeAttribute('style')
    } else {
        for (let key in next) { // 新的全量覆盖老的
            style[key] = next[key]
        }
        if (prev) {// 老的有，新的没，移除
            for (let key in prev) {
                if (!next[key]) {
                    style[key] = '';
                }
            }
        }
    }
}

function patchClass(el, next) {
    if (next == null) {
        next = ''
    }
    el.className = next;
}

function patchAttr(el, key, next) {
    if (next == null) {
        el.removeAttribute(key)
    }
    el.setAttribute(key, next)
}

export function patchProp(el, key, prevValue, nextValue) {
    switch (key) {
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        case 'class':
            patchClass(el, nextValue);
            break;
        default:
            patchAttr(el, key, nextValue)

    }
}
