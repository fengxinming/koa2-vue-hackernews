'use strict';

const fs = require('fs');
const nativePath = require('path');
const Router = require('koa-trie-router');
const vueServerRenderer = require('vue-server-renderer');
const lruCache = require('lru-cache');
const serialize = require('serialize-javascript');
const passThrough = require('stream').PassThrough;

const PROJECT_DIR = process.cwd();

function resolve(file) {
  return nativePath.resolve(PROJECT_DIR, file);
}

function createRenderer(bundle) {
  return vueServerRenderer.createBundleRenderer(bundle, {
    cache: lruCache({
      max: 1000,
      maxAge: 1000 * 60 * 15
    })
  });
}

function parseIndex(template) {
  const contentMarker = '<!-- APP -->';
  const i = template.indexOf(contentMarker);
  return {
    head: template.slice(0, i),
    tail: template.slice(i + contentMarker.length)
  };
}

function responseTime(res, start) {
  const delta = Math.ceil(Date.now() - start);
  res.setHeader('X-Response-Time', delta + 'ms');
}

module.exports = (app) => {

  const config = require('../../conf/server');

  const appConfig = config.app;
  const isProd = config.NODE_ENV === 'production';
  let indexHTML = '';
  let renderer = null;
  if (isProd) {
    renderer = createRenderer(fs.readFileSync(resolve('./public/assets/server-bundle.js'), 'utf-8'));
    indexHTML = parseIndex(fs.readFileSync(resolve('./public/index.html'), 'utf-8'));
  } else {
    require('./webpack-dev')(app, {
      bundleUpdated: bundle => {
        renderer = createRenderer(bundle);
      },
      indexUpdated: index => {
        indexHTML = parseIndex(index);
      }
    })
  }

  let router = new Router();

  router
    .get('/', async(ctx, next) => {
      if (!renderer) {
        ctx.body = '服务器偷懒了，刷新唤醒它？';
        return;
      }
      const start = Date.now();
      ctx.type = 'text/html; charset=utf-8';

      const context = { url: ctx.url };
      const renderStream = renderer.renderToStream(context);
      const res = ctx.res;
      this.body = passThrough();

      await new Promise((resolve, reject) => {

        renderStream.once('data', () => {
          responseTime(res, start);
          res.write(indexHTML.head);
        });

        renderStream.on('data', (chunk) => {
          res.write(chunk);
        });

        renderStream.on('end', () => {
          // 初始化state
          if (context.initialState) {
            res.write(
              `<script>window.__INITIAL_STATE__=${
                serialize(context.initialState, { isJSON: true })
              }</script>`
            );
          }
          res.statusCode = 200;
          res.end(indexHTML.tail);
          resolve();
        });

        renderStream.on('error', err => {
          if (err && err.code === '404') {
            res.statusCode = 404;
            res.end('404 | Page Not Found')
            return;
          }
          // 渲染错误页或者重定向
          res.statusCode = 500;
          res.end('Internal Error 500');
          console.error(`error during render : ${ctx.url}`);
          console.error(err);
          reject(err);
        });

      });
    });

  app.use(router.middleware());
};