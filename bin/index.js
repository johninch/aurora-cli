#!/usr/bin/env node
const semver = require('semver');
const chalk = require('chalk');
const ora = require('ora');
const spinner = ora();

const currentNodeVersion = process.versions.node;

if (semver.lt(currentNodeVersion, '10.0.0')) {
    spinner.fail(
        `你当前node版本为 ${chalk.red(currentNodeVersion)
        }。\n` +
        `  该项目要求node版本必须 ${chalk.cyan('>= 10.0.0')
        } 。\n` +
        `  请升级你的node！`
    );

    process.exit(1);
}

const init = require('../lib/init.js');

init();
