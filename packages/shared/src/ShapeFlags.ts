export const enum ShapeFlags {
    ELEMENT = 1, //  普通元素
    FUNCTIONAL_COMPONENT = 1 << 1, // 函数组件   位移  10 2
    STATEFUL_COMPONENT = 1 << 2, // 带状态组件    //  100 4
    TEXT_CHILDREN = 1 << 3, // 文本孩子          //  1000 8
    ARRAY_CHILDREN = 1 << 4, // 数组孩子       //   10000 16
}


// 一个二进制是由8个位组成

// 00001000  当前位的值 * 当前是几进制 ^ 当前所在位-1
// 1 * 2 ^ 3
