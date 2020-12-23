const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const spinner = ora({ spinner: 'arrow', discardStdin: false });
const execSync = require('child_process').execSync;
const { promisify } = require('util');
const download = promisify(require('download-git-repo'))
const { spawn } = require('child_process'); // 子进程
const open = require('open');

const asyncSpawn = async (...args) => {
    return new Promise(resolve => {
        const proc = spawn(...args)

        proc.stdout.pipe(process.stdout) // 正常流插入主进程流
        proc.stderr.pipe(process.stderr) // 错误流插入主进程流

        proc.on('close', () => {
            resolve()
        })
    })
}

const isSafeToCreateProjectIn = (root) => {
    var validFiles = ['.DS_Store', 'Thumbs.db', '.git', '.gitignore', '.idea', 'README.md', 'LICENSE'];

    return (
        !fs.existsSync(root) ||
        fs.readdirSync(root).every(function(file) {
            return validFiles.indexOf(file) >= 0;
        })
    );
}

const handleDotfiles = (appPath) => {
    var dotfiles = [
        'tern-project',
        'tern-webpack-config.js',
        'editorconfig',
        'babelrc',
        'eslintrc',
        'gitignore',
        'npmignore'
    ];

    // dotfiles 添加 . prefix
    dotfiles.forEach(function(file) {
        if (fs.existsSync(path.join(appPath, file))) {
            fs.move(path.join(appPath, file), path.join(appPath, '.' + file), { overwrite: true }, function(err) {
                if (err) {
                    if (err.code === 'EEXIST' && (file === 'gitignore' || file === 'npmignore')) {
                        var data = fs.readFileSync(path.join(appPath, file), 'utf8');

                        fs.appendFileSync(path.join(appPath, '.' + file), data);
                        fs.unlinkSync(path.join(appPath, file));
                    } else {
                        spinner.fail('create ' + file + ' error!');

                        throw err;
                    }
                }
            });
        }
    });
}

const handleReadme = (appPath, projectCustom) => {
    // 替换 README模板中的name和description
    if (fs.pathExistsSync(path.join(appPath, 'README.md'))) {
        var data = fs.readFileSync(path.join(appPath, 'README.md'), 'utf8');

        fs.outputFileSync(
            path.join(appPath, 'README.md'),
            data
                .replace(/\{name\}/g, projectCustom.name)
                .replace(/\{description\}/g, projectCustom.description || 'created by aurora-cli')
        );
    }
};

const changeNodeDir = (to) => {
    console.log(`原进程目录: ${process.cwd()}`);
    try {
        process.chdir(to);
        console.log(`变更后目录: ${process.cwd()}`);
    } catch (err) {
        console.error(`变更目录失败: ${err}`);
    }
}

const clone = async (repo, desc) => {
    spinner.start('下载中...')
    await download(repo, desc)
    spinner.succeed('下载完成')
}

const copyTemplateToDest = (templatePath, dest) => {
    if (fs.existsSync(templatePath)) {
        // 将 templatePath 目录中的文件都 拷贝到 app目录下，app下如果有同名的文件，则默认是覆盖式复制的
        // Note that if src is a directory it will copy everything inside of this directory, not the entire directory itself
        // Note that if src is a file, dest cannot be a directory
        fs.copySync(templatePath, dest);
    } else {
        throw new Error(chalk.cyan(templatePath) + ' not exists!');
    }
}

const shouldUseCnpm = () => {
    try {
        execSync('cnpm --version', {
            stdio: 'ignore'
        });

        return true;
    } catch (e) {
        return false;
    }
}

const installVendors = promisify((packageToInstall, saveDev, callback) => {
    let command;
    let args;

    if (shouldUseCnpm()) {
        command = 'cnpm';
    } else {
        command = 'npm';
    }

    args = ['install', saveDev ? '--save-dev' : '--save', '--save-exact'].concat(packageToInstall);

    const child = spawn(command, args, {
        stdio: 'inherit'
    });

    child.on('close', (code) => {
        if (code) {
            callback({ command, args });
        } else {
            // code === 0 是成功
            callback()
        }
    });

    process.on('exit', () => {
        child.kill();
    });
})

const finishCreate = async (root, name) => {
    console.log();
    spinner.succeed('👌 项目：' + chalk.green(name) + ' 已创建成功');
    spinner.succeed('🛣 路径：' + chalk.green(root));
    console.log();
    console.log('在该项目，你可以运行以下几个命令：');
    console.log();
    console.log(chalk.cyan('  npm start'));
    console.log('    启动本地服务，进行开发.');
    console.log();
    console.log(chalk.cyan('  npm run build:dev'));
    console.log('    构建测试包，部署测试.');
    console.log();
    console.log(chalk.cyan('  npm run pack'));
    console.log('    构建线上包，部署线上.');
    console.log();
    console.log('运行下面的命令切换到项目目录开始工作:');
    console.log(chalk.green('  cd ' + name));

    // // 打开浏览器
    // await asyncSpawn('npm', ['start'], { cwd: `./${name}` })
    // open(`http://localhost:8080`);
}

module.exports = {
    spinner,
    isSafeToCreateProjectIn,
    handleDotfiles,
    handleReadme,
    copyTemplateToDest,
    clone,
    changeNodeDir,
    asyncSpawn,
    shouldUseCnpm,
    installVendors,
    finishCreate
}
