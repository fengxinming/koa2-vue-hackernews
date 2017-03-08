'use strict';

const Koa = require('koa');
const app = new Koa();
const pathApi = require('path');
const slacker = require('koa2-middleware-slacker');

const PROJECT_DIR = process.cwd();

const STATIC_DIR = pathApi.resolve(PROJECT_DIR, './public');

const CLIENT_DIR = pathApi.resolve(PROJECT_DIR, './client');

const VIEWS_DIR = pathApi.resolve(CLIENT_DIR, './views');

slacker(app, {
  staticDir: STATIC_DIR,
  clientDir: CLIENT_DIR,
  viewsDir: VIEWS_DIR,
  viewsCache: process.env.NODE_ENV === 'development'
});

module.exports = app;