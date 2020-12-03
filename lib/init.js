const { promisify } = require('util')
const figlet = promisify(require('figlet'))

const clear = require('clear')
const chalk = require('chalk')
const open = require('open')
const log = content => console.log(chalk.green(content))

const { clone } = require('./download')

const spawn = async (...args) => {
    const { spawn } = require('child_process') // 子进程
    return new Promise(resolve => {
        const proc = spawn(...args)

        proc.stdout.pipe(process.stdout) // 正常流插入主进程流
        proc.stderr.pipe(process.stderr) // 错误流插入主进程流

        proc.on('close', () => {
            resolve()
        })
    })
}

module.exports = async name => {
    try {
        // 打印欢迎界面
        clear()
        const data = await figlet('BEAUTY AURORA')
        log(data)

        // clone
        log(`🚀创建项目： ${name}`)
        await clone('github:johninch/vue-template', name)

        // 自动安装依赖
        log('🔨安装依赖')
        await spawn('npm', ['install'], { cwd: `./${name}` }) // cwd指定运行位置
        log(`
👌安装完成~

To Get Start：
================================================
    cd ${name}
    npm run serve
================================================
        `)

        // 打开浏览器
        open(`http://localhost:8080`);
        await spawn('npm', ['run', 'serve'], { cwd: `./${name}` })

    } catch (err) {
        log(err)
    }
}
