'use strict';

const fs = require('fs');
const Koa = require('koa');
const app = new Koa();
const pathApi = require('path');
const slacker = require('koa2-middleware-slacker');
const vueServerRenderer = require('vue-server-renderer');
const lruCache = require('lru-cache');
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

const app = config.app;
const isProd = config.NODE_ENV === 'production';
let indexHTML = '';
let renderer = null;
if (isProd) {
  renderer = createRenderer(fs.readFileSync(resolve('./public/assets/server-bundle.js'), 'utf-8'))
  indexHTML = parseIndex(fs.readFileSync(resolve('./public/index.html'), 'utf-8'))
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
  staticDir: app.staticDir,
  clientDir: app.clientDir,
  viewsDir: app.viewsDir,
  viewsCache: isProd
});

app.use('/manifest.json', serve('./manifest.json'));
app.use('/public', serve('./public'));

module.exports = app;