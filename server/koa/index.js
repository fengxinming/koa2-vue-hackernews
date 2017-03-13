'use strict';

const nativePath = require('path');
const Koa = require('koa');
const app = new Koa();
const slacker = require('koa2-middleware-slacker');

const router = require('./router');
const config = require('../../conf/server');

const appConfig = config.app;
const isProd = config.NODE_ENV === 'production';

const PROJECT_DIR = process.cwd();

slacker(app, {
  favicon: false,
  staticDir: appConfig.staticDir,
  staticPath: appConfig.staticPath,
  staticMappings: {
    [nativePath.join(PROJECT_DIR, './manifest.json')]: '/manifest.json'
  },
  clientDir: appConfig.clientDir,
  viewsDir: appConfig.viewsDir,
  viewsCache: isProd
});

router(app);

module.exports = app;