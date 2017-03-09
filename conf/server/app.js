'use strict';

const path = require('path');

const PROJECT_DIR = process.cwd();

module.exports = {
  //公用全局属性
  public: {
    port: 5500,

    //工程根目录
    projectDir: PROJECT_DIR,

    //网页模板路径
    viewsDir: path.resolve(PROJECT_DIR, 'client', 'views'),

    //配置文件目录
    confDir: path.resolve(PROJECT_DIR, 'conf'),

    //client存放目录
    clientDir: path.resolve(PROJECT_DIR, 'client'),

    //日志文件
    logsDir: path.resolve(PROJECT_DIR, 'logs'),

    //静态文件目录
    staticDir: path.resolve(PROJECT_DIR, 'public')
  }
};