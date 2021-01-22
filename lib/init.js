const path = require('path');
const { promisify } = require('util');
const program = require('commander')
const inquirer = require('inquirer');
const fs = require('fs-extra');
const semver = require('semver');
const chalk = require('chalk');
// const chalkAnimation = require('chalk-animation');
const gradient = require('gradient-string');
const boxen = require('boxen');
const validatePkgName = require('validate-npm-package-name');
const figlet = promisify(require('figlet'));
const clear = require('clear');
// const open = require('open');
const auraPkgJson = require('../package.json');

const { spinner, isSafeToCreateProjectIn, handleDotfiles, handleReadme, copyTemplateToDest, clone, changeNodeDir, installVendors, finishCreate } = require('./utils');

let projectName;
let projectCustom = {};
const originCwd = process.cwd();

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
    const createdDir = path.join(originCwd, projectName)

    fs.pathExists(createdDir).then(exists => {
        if (exists) {
            fs.removeSync(createdDir)
        }
    })

    throw err;
});

function handleInstall(appPath) {
    const templateDependenciesPath = path.join(appPath, 'dependencies.json');

    if (fs.pathExistsSync(templateDependenciesPath)) {
        // 先装devDependencies
        const devDependencies = require(templateDependenciesPath).devDependencies;

        const pkgToInstall = Object.keys(devDependencies).map(key => `${key}@${devDependencies[key]}`);

        spinner.start('');

        installVendors(pkgToInstall, true).then(
            result => {
                // 再装dependencies
                const dependencies = require(templateDependenciesPath).dependencies;

                if (dependencies) {
                    const pkgToInstall = Object.keys(dependencies).map(key => `${key}@${dependencies[key].replace(/^[\^~]/, '')}`)

                    installVendors(pkgToInstall, false).then(
                        result => {
                            finishCreate(appPath, projectCustom.name);
                        }, err => {
                            spinner.fail(`\`${err.command} ${err.args.join(' ')}\` 运行失败`);
                        });
                } else {
                    finishCreate(appPath, projectCustom.name);
                }
            }, err => {
                spinner.fail(`\`${err.command} ${err.args.join(' ')}\` 运行失败`);
            });

        fs.removeSync(path.resolve(appPath, 'template'));
        fs.removeSync(templateDependenciesPath);
        fs.removeSync(path.join(appPath, 'packageTemp.js'));
    }
}

function generatePkgJson(root) {
    let tempPkgJson = require(path.join(root, 'packageTemp.js'));

    // 合并 appPkg.json
    let appPkgJson = {
        name: projectCustom.name,
        version: projectCustom.version,
        private: true,
        description: projectCustom.description,
        author: projectCustom.author,
        vendor: [],
        ...tempPkgJson
    };

    // eslint-disable-next-line default-case
    switch (projectCustom.libs) {
        case 1:
            appPkgJson.vendor.push('jquery');
            break;
        case 2:
            appPkgJson.vendor.push('react', 'react-dom');
            break;
        case 3:
            appPkgJson.vendor.push('jquery', 'react', 'react-dom');
            break;
    }

    appPkgJson.vendor.push('./static/css/vendor.scss');

    if (projectCustom.enableSW) {
        appPkgJson.vendor.push('utils/serviceWorker/register');
    }

    appPkgJson.engines['aurora-cli'] = auraPkgJson.version; // 指定解释器引擎，还可以指定 node的工作版本，以及 可以安装这个包的npm版本

    // 开启装饰器支持
    if (projectCustom.supportDecorator) {
        appPkgJson.babel.plugins.push(['@babel/plugin-proposal-decorators', { legacy: true }]);
    }

    appPkgJson.dependencies = appPkgJson.dependencies || {};
    appPkgJson.devDependencies = appPkgJson.devDependencies || {};

    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(appPkgJson, null, 2));
}

async function createApp(name) {
    let appPath = path.resolve(name);

    console.log();
    console.log(`🚀 ${chalk.cyan.bold('创建新项目')}${chalk.greenBright(`(${appPath})`)}`);

    fs.ensureDirSync(name); // 同步，确保目录存在，如果不存在就创建

    console.log();
    console.log(`📦 ${chalk.cyan.bold('拉取模板')}`);
    console.log();

    await clone('github:johninch/aurora-cli-react-template', appPath);
    // await clone('github:johninch/vue-template', name)

    console.log(`${chalk.yellowBright.bold('٩( ๑╹ ꇴ╹)۶')} ${chalk.cyan.bold('拉取成功!')}`)

    console.log();
    console.log(`🚪 ${chalk.cyan.bold('切换工作目录')}`);
    console.log();
    changeNodeDir(appPath);

    // 将模板路径 template/application的所有文件，复制到 appPath
    copyTemplateToDest(path.join(process.cwd(), './template', projectCustom.type), appPath);

    generatePkgJson(appPath);

    handleDotfiles(appPath);
    handleReadme(appPath, projectCustom);

    console.log();
    console.log(`🔨 ${chalk.cyan.bold('即将安装项目依赖，稍等一下吧...')}  ${chalk.yellowBright.bold('～(￣▽￣～)~')}`);
    console.log();

    handleInstall(appPath);
}

function inquirerPrompt() {
    return inquirer
        .prompt([
            {
                name: 'type',
                type: 'list',
                choices: [
                    { name: '普通项目(application)', value: 'application' },
                    { name: '其他项目类型', value: 'other' },
                ],
                message: `${chalk.cyan.bold('请选择该项目用途？')}`,
                default: 'application'
            }
        ])
        .then((answers) => {
            Object.assign(projectCustom, answers);

            const questions = [
                {
                    name: 'version',
                    type: 'input',
                    message: `${chalk.cyan.bold('请输入项目版本号(version):')}`,
                    default: answers.type === 'application' ? '1.0.0' : '0.0.1',
                    validate: function(input) {
                        return semver.valid(input) ? true : `${chalk.cyan(input)} 不是一个有效的版本号`;
                    }
                },
                {
                    name: 'name',
                    type: 'input',
                    message: `${chalk.cyan.bold('请输入项目名称(name):')}`,
                    default: path.basename(path.resolve(projectName)),
                    validate: function(input) {
                        const result = validatePkgName(input);

                        if (result.validForNewPackages) {
                            return true;
                        }

                        return (
                            `${chalk.cyan(input)
                            } 不是一个有效的package名称：\n${chalk.red((result.errors || result.warnings).map(text => `* ${text}`).join('\n'))}`
                        );
                    }
                },
                {
                    name: 'description',
                    type: 'input',
                    message: `${chalk.cyan.bold('请输入项目描述(description):')}`,
                },
                {
                    name: 'author',
                    type: 'input',
                    message: `${chalk.cyan.bold('请输入项目所属者（组织）的名字或邮箱:')}`,
                    validate: function(input) {
                        return !!input || '该字段不能为空';
                    }
                }
            ];

            if (answers.type === 'application') {
                questions.push(
                    {
                        name: 'libs',
                        type: 'list',
                        choices: [
                            { name: '无框架依赖', value: 0 },
                            { name: 'jquery 项目', value: 1 },
                            { name: 'react 项目', value: 2 },
                            // { name: 'jquery + react 项目', value: 3 }
                        ],
                        message: `${chalk.cyan.bold(`请选择项目框架${chalk.grey('（将会默认安装所选相关框架依赖）')}:`)}`,
                        default: 2
                    },
                    {
                        name: 'supportDecorator',
                        type: 'confirm',
                        message: `${chalk.cyan.bold(`是否开启装饰器${chalk.grey('@Decoators')}特性?`)}`,
                        default: true
                    },
                    {
                        name: 'isSpa',
                        type: 'confirm',
                        message: `${chalk.cyan.bold(`该项目是否为SPA${chalk.grey('（单页面应用）')}?`)}`,
                        default: true
                    },
                );
            }

            return inquirer.prompt(questions);
        });
}

function initProgram() {
    program.version(auraPkgJson.version);

    program
        .command('init <name>')
        .description('create project <name>')
        .usage(`init ${chalk.greenBright('<name>')} [options]`)
        // .arguments('<name>')
        .action(name => {
            projectName = name;
        })
        .option('--verbose', 'print additional logs')
        .option('--info', 'print environment debug info')
        .on('--help', () => {
            console.log(
                `    只有项目目录名 ${chalk.greenBright('<project-directory>')} 是必填参数。`
            );

            console.log();

            console.log(
                `    如果你有任何问题，请直接联系johninch`
            );

            console.log(
                `      ${chalk.cyan('https://github.com/johninch')}`
            );

            console.log();
        })

    program.parse(process.argv)

    if (typeof projectName === 'undefined') {
        spinner.fail('请指定要创建的项目目录名:');
        console.log(`  ${chalk.cyan(program.name())}${chalk.greenBright(' <项目目录>')}`);
        console.log();
        console.log('例如:');
        console.log(`  ${chalk.cyan(program.name())}${chalk.greenBright(' my-react-app')}`);
        console.log();
        process.exit(1);
    }

    if (!isSafeToCreateProjectIn(path.resolve(projectName))) {
        spinner.fail(`该文件夹（${chalk.greenBright(projectName)}）已经存在，且存在导致冲突的文件.`);
        console.log('  请使用一个新的文件夹名：');
        console.log();
        console.log(`   ${chalk.cyan(program.name())} ${chalk.greenBright(projectName)}${chalk.cyan(' --upgrade')}`);
        console.log();
        process.exit(1);
    }
}

async function showLogo() {
    // 打印欢迎界面
    clear()

    const data = await figlet.textSync('AURORA', {
        font: 'Speed',
        // font: 'Bloody',
        // font: 'Jazmine',
        // font: 'Lean',
        // font: 'ANSI Shadow',
        // font: '3D-ASCII',
        // font: 'Slant',
        // font: 'Slant Relief',
        // font: 'Small Slant',
        // font: 'NScript',
        // font: 'Impossible',
        // font: 'Isometric1',
        // font: '3-D',
        // font: 'Alligator',
        // font: 'Catwalk',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: false
    });

    console.log(boxen(gradient.teen(data), { float: 'center', padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));
    // console.log(boxen(chalk.bold(data), { float: 'center', padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));
    // chalkAnimation.glitch('Lorem ipsum dolor sit amet');\
}

const init = async () => {
    try {
        await showLogo();

        initProgram();

        const answers = await inquirerPrompt();

        Object.assign(projectCustom, answers);

        if (projectCustom.type === 'application') {
            createApp(projectName);
        } else {
            throw new Error('暂不支持');
        }
    } catch (err) {
        chalk.red(err);
    }
};

module.exports = init;
