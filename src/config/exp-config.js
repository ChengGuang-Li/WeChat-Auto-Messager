const USER_CONFIG = require('./index.js');

const config = process.env.USER_INFO ? /* istanbul ignore next */ JSON.parse(process.env.USER_INFO) : USER_CONFIG;

module.exports = config;