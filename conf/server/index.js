'use strict';

const fs = require('fs');
const path = require('path');
const deepAssign = require('deep-assign');

//环境标识
const NODE_ENV = process.env.NODE_ENV || 'development';

const defaults = module.exports = {
  NODE_ENV: NODE_ENV
};

(fs.readdirSync(__dirname)).forEach((file) => {
  const extIndex = file.indexOf('.js');
  if (extIndex > 0 && file !== 'index.js') {
    const key = file.slice(0, extIndex);
    const obj = require(path.join(__dirname, file));
    defaults[key] = deepAssign({}, obj.public, obj[NODE_ENV]);
  }
});