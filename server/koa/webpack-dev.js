'use strict';

const path = require('path');
const webpack = require('webpack');
const MFS = require('memory-fs');
const clientConfig = require('../../build/webpack.client.config');
const serverConfig = require('../../build/webpack.server.config');

function expressTokoa2(middleware) {
  return (ctx, next) => {
    const req = ctx.req;
    middleware(req, {
      locals: {
        set webpackStats(val) {
          ctx.state.webpackStats = val;
        },

        get webpackStats() {
          return ctx.state.webpackStats;
        }
      },
      setHeader() {
        ctx.set.apply(ctx, arguments);
      },
      set statusCode(val) {
        ctx.statue = val;
      },
      get statusCode() {
        return ctx.statue;
      },
      end(content) {
        ctx.body = content;
      },
      writeHead(status, headers) {
        ctx.status = status;
        ctx.set(headers);
      },
      write(data) {
        ctx.body += data;
      }
    }, next);
  };
}

module.exports = function setupDevServer(app, opts) {
  clientConfig.entry.app = ['webpack-hot-middleware/client', clientConfig.entry.app];
  clientConfig.output.filename = '[name].js';
  clientConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
  )

  // dev middleware
  const clientCompiler = webpack(clientConfig);
  const devMiddleware = require('webpack-dev-middleware')(clientCompiler, {
    publicPath: clientConfig.output.publicPath,
    stats: {
      colors: true,
      chunks: false
    }
  });
  app.use(expressTokoa2(devMiddleware));
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
  app.use(expressTokoa2(hotMiddleware));

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