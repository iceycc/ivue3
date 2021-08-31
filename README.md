## 相关命令
- `npm run build` 会将packages下的包并发打包，并监听文件变化
- `npm run serve` 本地调试用，会启动一个静态服务器，public下为相关测试用例
- `npm run build:dev` 指定package单独打包

## 项目目录
```
├── README.md
├── package.json
├── packages
│   ├── reactivity
│   ├── runtime-core
│   ├── runtime-dom
│   ├── sharedm
│   └── vue
├── public
│   ├── index.html
│   └── index.js
├── rollup.config.js
├── rollup.config.web.js
├── scripts
│   ├── build.js
│   └── dev.js
├── tsconfig.json
└── yarn.lock
```

## 区别介绍

- 源码采用 `monorepo` 方式进行管理，将模块拆分到package目录中
- `Vue3` 采用`ts`开发,增强类型检测。 `Vue2` 则采用`flow`
- `Vue3`的性能优化，支持tree-shaking, 不使用就不会被打包
- `Vue2` 后期引入RFC , 使每个版本改动可控 [rfcs](https://github.com/vuejs/rfcs/tree/master/active-rfcs)

> [文档地址](https://v3.cn.vuejs.org/)

> 内部代码优化

- `Vue3` 劫持数据采用proxy `Vue2` 劫持数据采用`defineProperty`。 `defineProperty`有性能问题和缺陷
- `Vue3`中对模板编译进行了优化，编译时 生成了Block tree，可以对子节点的动态节点进行收集，可以减少比较，并且采用了 `patchFlag` 标记动态节点
- `Vue3` 采用`compositionApi` 进行组织功能，解决反复横跳，优化复用逻辑 （mixin带来的数据来源不清晰、命名冲突等）, 相比`optionsApi` 类型推断更加方便
- 增加了 `Fragment`,`Teleport`，`Suspense`组件

## reactivity
- reactive实现 Proxy
- effect实现
- 依赖收集

## computed

## ref
- .value主要是为了把普通值变成响应式
- 可以将普通值变成响应式的，也可以设置对象，但是会加一个value


## vue3虚拟dom， shapeFlag
- shapeFlag 二进制 结合 位运算符
## vue3 diff算法
