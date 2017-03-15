'use strict';

const Koa = require('koa');
const app = new Koa();
const slacker = require('koa2-middleware-slacker');

const router = require('./router');
const config = require('../../conf/server');

const appConfig = config.app;

slacker(app, appConfig);

router(app);

module.exports = app;