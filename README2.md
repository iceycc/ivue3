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

## [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#一-vue3架构分析)一.`Vue3`架构分析

### [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#_1-monorepo介绍)1.`Monorepo`介绍

`Monorepo` 是管理项目代码的一个方式，指在一个项目仓库(`repo`)中管理多个模块/包(package)

- 一个仓库可维护多个模块，不用到处找仓库
- 方便版本管理和依赖管理，模块之间的引用，调用都非常方便

> 缺点：仓库体积会变大。

### [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#_2-vue3项目结构)2.`Vue3`项目结构

- **`reactivity`**:响应式系统
- **`runtime-core`**:与平台无关的运行时核心 (可以创建针对特定平台的运行时 - 自定义渲染器)
- **`runtime-dom`**: 针对浏览器的运行时。包括`DOM API`，属性，事件处理等
- **`runtime-test`**:用于测试
- **`server-renderer`**:用于服务器端渲染
- **`compiler-core`**:与平台无关的编译器核心
- **`compiler-dom`**: 针对浏览器的编译模块
- **`compiler-ssr`**: 针对服务端渲染的编译模块
- **`compiler-sfc`**: 针对单文件解析
- **`size-check`**:用来测试代码体积
- **`template-explorer`**：用于调试编译器输出的开发工具
- **`shared`**：多个包之间共享的内容
- **`vue`**:完整版本,包括运行时和编译器

```bash
                            +---------------------+
                            |                     |
                            |  @vue/compiler-sfc  |
                            |                     |
                            +-----+--------+------+
                                  |        |
                                  v        v
               +---------------------+    +----------------------+
               |                     |    |                      |
     +-------->|  @vue/compiler-dom  +--->|  @vue/compiler-core  |
     |         |                     |    |                      |
+----+----+    +---------------------+    +----------------------+
|         |
|   vue   |
|         |
+----+----+   +---------------------+    +----------------------+    +-------------------+
    |         |                     |    |                      |    |                   |
    +-------->|  @vue/runtime-dom   +--->|  @vue/runtime-core   +--->|  @vue/reactivity  |
              |                     |    |                      |    |                   |
              +---------------------+    +----------------------+    +-------------------+
```



### [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#_3-安装依赖)3.安装依赖

| 依赖                        |                        |
| --------------------------- | ---------------------- |
| typescript                  | 支持typescript         |
| rollup                      | 打包工具               |
| rollup-plugin-typescript2   | rollup 和 ts的 桥梁    |
| @rollup/plugin-node-resolve | 解析node第三方模块     |
| @rollup/plugin-json         | 支持引入json           |
| execa                       | 开启子进程方便执行命令 |

```bash
npm install typescript rollup rollup-plugin-typescript2 @rollup/plugin-node-resolve @rollup/plugin-json execa -D
```



### [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#_4-workspace配置)4.`workspace`配置

```bash
npm init -y && npx tsc --init
```

```json
{
  "private":true,
  "workspaces":[
    "packages/*"
  ]
}
```

1
2
3
4
5
6

> 目录结构配置

```bash
C:.
│  package.json        # 配置运行命令 
│  rollup.config.js    # rollup配置文件
│  tsconfig.json       # ts配置文件 更改为esnext
│  yarn.lock
│  
├─packages             # N个repo
│  └─reactivity
│      │  package.json
│      └─src
│          index.ts
│              
└─scripts              # 打包命令
        build.js
```



> 配置模块名称及打包选项

```json
{
  "name": "@vue/reactivity",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "module": "dist/reactivity.esm-bundler.js",
  "author": "",
  "license": "ISC",
  "buildOptions":{
    "name":"VueReactivity",
    "formats":[
      "esm-bundler",
      "cjs",
      "global"
    ]
  }
}
```



> 创建软链`yarn install`

## [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#二-构建环境搭建)二.构建环境搭建

### [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#_1-对packages下模块进行打包)1.对`packages`下模块进行打包

> ```
> scripts/build.js
> ```

```js
const fs = require('fs');
const execa = require('execa')
// 过滤packages目录下所有模块
const targets = fs.readdirSync('packages').filter(f => {
    if (!fs.statSync(`packages/${f}`).isDirectory()) {
        return false;
    }
    return true;
})
// 开始并行打包
runParallel(targets, build)
async function runParallel(source, iteratorFn) {
    const ret = [];
    for (const item of source) {
        const p = iteratorFn(item)
        ret.push(p);
    }
    return Promise.all(ret);
}
async function build(target) {
    await execa(
        'rollup',
        [
            '-c',
            '--environment',
            `TARGET:${target}`
        ], 
        { stdio: 'inherit' }
    )
}
```



### [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#_2-rollup配置)2.`rollup`配置

> ```
> rollup.config.js
> ```

```js
import path from 'path';
import ts from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'
import resolvePlugin from '@rollup/plugin-node-resolve'
const packagesDir = path.resolve(__dirname, 'packages'); // 获取packages目录


const packageDir = path.resolve(packagesDir, process.env.TARGET); // 获取要打包的目标目录
const name = path.basename(packageDir); // 获取打包的名字

const resolve = p => path.resolve(packageDir, p);
const pkg = require(resolve(`package.json`)) // 获取目标对应的package.json

const packageOptions = pkg.buildOptions; // 打包的选项
const outputConfigs = {
    'esm-bundler': {
        file: resolve(`dist/${name}.esm-bundler.js`), // webpack打包用的
        format: `es`
    },
    'cjs': {
        file: resolve(`dist/${name}.cjs.js`), // node使用的
        format: 'cjs'
    },
    'global': {
        file: resolve(`dist/${name}.global.js`), // 全局的
        format: 'iife'
    }
}

function createConfig(format, output) {
    output.name = packageOptions.name;
    output.sourcemap = true;
    return {
        input: resolve(`src/index.ts`), // 入口
        output,
        plugins:[
            json(),
            ts({
                tsconfig:path.resolve(__dirname,'tsconfig.json')
            }),
            resolvePlugin(),
        ]
    }
}
// 根据模块配置信息选择性打包
export default packageOptions.formats.map(format => createConfig(format, outputConfigs[format]));
```



### [#](http://www.zhufengpeixun.com/advance/vue3/1.vue3-rollup.html#_3-开发环境打包)3.开发环境打包

```js
const execa = require('execa')
const target = 'reactivity'
execa('rollup', [
        '-wc',
        '--environment',
        `TARGET:${target}`
    ], {
        stdio: 'inherit'
    }
)
```

