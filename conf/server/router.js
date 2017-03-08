'use strict';

const path = require('path');

const PROJECT_DIR = process.cwd();

module.exports = {
  //公用全局属性
  public: {
    routes: {
      exclude: [],
      dir: path.resolve(PROJECT_DIR, 'server', 'routes')
    },
    apis: {
      dir: path.resolve(PROJECT_DIR, 'server', 'apis')
    }
  }
};