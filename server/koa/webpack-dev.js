'use strict';

const path = require('path');
const webpack = require('webpack');
const MFS = require('memory-fs');
const clientConfig = require('./webpack.client.config');
const serverConfig = require('./webpack.server.config');

function middleware(doIt, req, res) {
  var originalEnd = res.end;

  return function (done) {
    res.end = function () {
      originalEnd.apply(this, arguments);
      done(null, 0);
    };
    doIt(req, res, function () {
      done(null, 1);
    })
  }
}

module.exports = function setupDevServer(app, opts) {
  clientConfig.entry.app = ['webpack-hot-middleware/client', clientConfig.entry.app]
  clientConfig.output.filename = '[name].js'
  clientConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
  )

  // dev middleware
  const clientCompiler = webpack(clientConfig)
  const devMiddleware = require('webpack-dev-middleware')(clientCompiler, {
    publicPath: clientConfig.output.publicPath,
    stats: {
      colors: true,
      chunks: false
    }
  })
  app.use(async function (ctx, next) {
    ctx.webpack = devMiddleware;
    var req = this.req;
    var runNext = await middleware(devMiddleware, req, {
      end: function (content) {
        ctx.body = content;
      },
      setHeader: function () {
        ctx.set.apply(ctx, arguments);
      }
    });
    if (runNext) {
      await next();
    }
  });
  clientCompiler.plugin('done', () => {
    const fs = devMiddleware.fileSystem;
    const filePath = path.join(clientConfig.output.path, '../index.html');
    if (fs.existsSync(filePath)) {
      const index = fs.readFileSync(filePath, 'utf-8');
      opts.indexUpdated(index);
    }
  })

  // hot middleware
  const hotMiddleware = require('webpack-hot-middleware')(clientCompiler);
  app.use(async function (ctx, next) {
    let nextStep = await middleware(hotMiddleware, this.req, this.res);
    if (nextStep && next) {
      await next();
    }
  });

  // watch and update server renderer
  const serverCompiler = webpack(serverConfig);
  const mfs = new MFS();
  const outputPath = path.join(serverConfig.output.path, serverConfig.output.filename);
  serverCompiler.outputFileSystem = mfs;
  serverCompiler.watch({}, (err, stats) => {
    if (err) {
      throw err;
    }
    stats = stats.toJson();
    stats.errors.forEach(err => console.error(err));
    stats.warnings.forEach(err => console.warn(err));
    opts.bundleUpdated(mfs.readFileSync(outputPath, 'utf-8'));
  })
}