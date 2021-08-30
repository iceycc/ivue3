import {nodeResolve} from '@rollup/plugin-node-resolve'; // 解析第三方模块的插件
import serve from 'rollup-plugin-serve'; // 启动本地服务的插件
import path from 'path'

export default {
    input:'public/index.js',
    output:{
        // amd iife commonjs umd..
        format:'umd', // 立即执行 自执行函数
        file: path.resolve(__dirname,'dist/web.bundle.js'), // 出口文件
    },
    plugins:[
        nodeResolve({ // 第三方文件解析
            extensions:['.js']
        }),
        serve({
            openPage:'/public/index.html',
            contentBase:'',
            port:3000
        })
    ]
}
