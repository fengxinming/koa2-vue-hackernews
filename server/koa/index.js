'use strict';

const fs = require('fs');
const Koa = require('koa');
const app = new Koa();
const slacker = require('koa2-middleware-slacker');
const vueServerRenderer = require('vue-server-renderer');
const lruCache = require('lru-cache');
const serialize = require('serialize-javascript');
const config = require('../../conf/server');


function createRenderer(bundle) {
  return vueServerRenderer.createBundleRenderer(bundle, {
    cache: lruCache({
      max: 1000,
      maxAge: 1000 * 60 * 15
    })
  });
}

function parseIndex(template) {
  const contentMarker = '<!-- APP -->'
  const i = template.indexOf(contentMarker)
  return {
    head: template.slice(0, i),
    tail: template.slice(i + contentMarker.length)
  }
}

const appConfig = config.app;
const isProd = config.NODE_ENV === 'production';
let indexHTML = '';
let renderer = null;
if (isProd) {
  renderer = createRenderer(fs.readFileSync(resolve('./static/assets/server-bundle.js'), 'utf-8'))
  indexHTML = parseIndex(fs.readFileSync(resolve('./static/index.html'), 'utf-8'))
} else {
  require('./webpack-dev')(app, {
    bundleUpdated: bundle => {
      renderer = createRenderer(bundle)
    },
    indexUpdated: index => {
      indexHTML = parseIndex(index)
    }
  })
}

slacker(app, {
  staticDir: appConfig.staticDir,
  staticPath: appConfig.staticPath,
  staticMappings: {
    './manifest.json': '/manifest.json'
  },
  clientDir: appConfig.clientDir,
  viewsDir: appConfig.viewsDir,
  viewsCache: isProd
});

app.use(function (ctx) {
  if (!renderer) {
    ctx.body = '服务器偷懒了，刷新唤醒它？';
    return;
  }

  ctx.type = 'text/html; charset=utf-8';

  var s = Date.now();
  const context = { url: ctx.url };
  const renderStream = renderer.renderToStream(context);
  const res = ctx.res;

  renderStream.once('data', () => {
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
      )
    }
    res.end(indexHTML.tail);
    console.log(`whole request: ${Date.now() - s}ms`)
  })

  renderStream.on('error', err => {
    if (err && err.code === '404') {
      res.status(404).end('404 | Page Not Found')
      return;
    }
    // Render Error Page or Redirect
    res.status(500).end('Internal Error 500');
    console.error(`error during render : ${ctx.url}`);
    console.error(err);
  })
})

module.exports = app;