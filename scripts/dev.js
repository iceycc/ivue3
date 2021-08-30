const execa = require('execa')
const target = process.argv[3]
const isWc = process.argv[2]
execa('rollup', [
        isWc, // '-wc',
        '--environment',
        `TARGET:${target}`
    ], {
        stdio: 'inherit'
    }
)
