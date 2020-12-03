#!/usr/bin/env node
// 指定脚本解释器为node

const chalk = require('chalk');
const ora = require('ora');
const semver = require('semver');
// const validatePkgName = require('validate-npm-package-name');

const spinner = ora();

const currentNodeVersion = process.versions.node;

if (semver.lt(currentNodeVersion, '6.0.0')) {
    spinner.fail(
        '你当前node版本为 ' +
        chalk.red(currentNodeVersion) +
        '。\n' +
        '  该项目要求node版本必须 ' +
        chalk.cyan('>= 6.0.0') +
        ' 。\n' +
        '  请升级你的node！'
    );

    process.exit(1);
}








const program = require('commander')
const pkg = require('../package.json')

program.
    version(pkg.version)


// // projectName容错
// if (typeof projectName === 'undefined') {
//     spinner.fail('请指定要' + (program.upgrade ? '升级' : '创建') + '的项目目录名:');
//     console.log('  ' + chalk.cyan(program.name()) + chalk.green(' <项目目录>'));
//     console.log();
//     console.log('例如:');
//     console.log('  ' + chalk.cyan(program.name()) + chalk.green(' my-react-app'));
//     console.log();
//     process.exit(1);
// }




inquirer
    .prompt([
        {
            name: 'type',
            type: 'list',
            choices: [
                { name: '普通项目(application)', value: 'application' },
                { name: 'npm包项目(package)', value: 'package' }
            ],
            message: '请选择该项目用途？',
            default: 'application'
        }
    ])
    .then(function(answers) {
        Object.assign(projectCustom, answers);

        const questions = [
            {
                name: 'version',
                type: 'input',
                message: '请输入项目版本号(version):',
                default: answers.type === 'application' ? '1.0.0' : '0.0.1',
                validate: function(input) {
                    return semver.valid(input) ? true : chalk.cyan(input) + ' 不是一个有效的版本号';
                }
            },
            {
                name: 'name',
                type: 'input',
                message: '请输入项目名称(name):',
                default: path.basename(path.resolve(projectName)),
                validate: function(input) {
                    const result = validatePkgName(input);

                    if (result.validForNewPackages) {
                        return true;
                    } else {
                        return (
                            chalk.cyan(input) +
                            ' 不是一个有效的package名称：\n' +
                            chalk.red((result.errors || result.warnings).map(text => '* ' + text).join('\n'))
                        );
                    }
                }
            },
            {
                name: 'description',
                type: 'input',
                message: '请输入项目描述(description):'
            },
            {
                name: 'author',
                type: 'input',
                message: '请输入项目所属者（组织）的名字或邮箱:',
                validate: function(input) {
                    return !!input || '该字段不能为空';
                }
            }
        ];

        if (answers.type === 'application') {
            questions.push(
                {
                    name: 'useCdn',
                    type: 'confirm',
                    message:
                        '该项目是否需要托管静态资源到cdn服务器?' +
                        chalk.grey('（默认仅支持ssh rsync方式上传到cdn）'),
                    default: false
                },
                {
                    name: 'host',
                    type: 'input',
                    message: '请输入cdn服务器host地址:',
                    default: 'https://static.example.com',
                    validate: function(input) {
                        return /^http/.test(input) ? true : '请输入一个服务器地址';
                    },
                    when: function(answers) {
                        return answers.useCdn;
                    }
                },
                {
                    name: 'pathname',
                    type: 'input',
                    message: '请输入项目在cdn服务器上的存储文件夹名:',
                    default: '/' + path.basename(projectName),
                    validate: function(input) {
                        return /\s|\//.test(input.replace(/^\//, ''))
                            ? '文件夹名不能包含 空格、/ 等其它字符'
                            : true;
                    },
                    when: function(answers) {
                        return answers.useCdn;
                    }
                },
                {
                    name: 'useLocals',
                    type: 'confirm',
                    message: '是否要支持多语言/国际化？',
                    default: false
                },
                {
                    name: 'locals',
                    type: 'input',
                    message: '请输入要支持的语言' + chalk.grey('（半角逗号相隔）') + '：',
                    default: 'zh_CN,en_US',
                    validate: function(input) {
                        return input ? true : '该字段不能为空';
                    },
                    when: function(answers) {
                        return answers.useLocals;
                    }
                },
                {
                    name: 'libs',
                    type: 'list',
                    choices: [
                        { name: '无框架依赖', value: 0 },
                        { name: 'jquery 项目', value: 1 },
                        { name: 'react 项目', value: 2 },
                        { name: 'jquery + react 项目', value: 3 }
                    ],
                    message: '请选择项目框架' + chalk.grey('（将会默认安装所选相关框架依赖）') + ':',
                    default: 2
                },
                {
                    name: 'supportDecorator',
                    type: 'confirm',
                    message: '是否开启装饰器' + chalk.grey('@Decoators') + '特性?',
                    default: true
                },
                {
                    name: 'proxy',
                    type: 'input',
                    message: '项目接口代理服务器地址' + chalk.grey('（没有请留空）') + '：',
                    validate: function(input) {
                        return !input || /^http/.test(input) ? true : '请输入一个服务器地址';
                    }
                },
                {
                    name: 'isSpa',
                    type: 'confirm',
                    message: '该项目是否为SPA' + chalk.grey('（单页面应用）') + '?',
                    default: true
                },
                {
                    name: 'enableSW',
                    type: 'confirm',
                    message: '是否启用' + chalk.red('Service Worker Precache') + '离线功能支持?',
                    default: false
                }
            );
        }

        if (answers.type === 'package') {
            questions.push(
                {
                    name: 'entryFile',
                    type: 'input',
                    default: 'src/index.ts',
                    message: '请输入项目入口文件:',
                    validate: function(input) {
                        return !!input || '该字段不能为空';
                    }
                },
                {
                    name: 'exportName',
                    type: 'input',
                    default: function(answers) {
                        return answers.name.split('/').slice(-1)[0];
                    },
                    message: '请输入模块导出名称:',
                    validate: function(input) {
                        return /^[\w-]+$/.test(input) || '只能输入数字、字母和短横杠字符';
                    }
                }
            );
        }

        return inquirer.prompt(questions).then(function(answers) {
            Object.assign(projectCustom, answers);

            if (projectCustom.type === 'application') {
                createApp(projectName);
            } else {
                createLibrary(projectName);
            }
        });
    });

function createApp(name) {

}





// program
//     .command('init <name>')
//     .description('init project   ')
//     .action(require('../lib/init'))

// // program
// //     .command('refresh')
// //     .description('refresh routers and menu')
// //     .action(require('../lib/refresh'))

// program.parse(process.argv) // 解析主进程参数
