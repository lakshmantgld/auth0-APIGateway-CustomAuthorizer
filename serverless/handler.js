/* eslint-disable global-require, import/first, no-unused-expressions, no-console */
if (!global._babelPolyfill) require('babel-polyfill');

import lib from './lib';

module.exports.auth = (event, context) => {
  // lib contains the logic for authenticating the access_token
  lib.authenticate(event, (err, data) => {
    if (err) {
      if (!err) {
        context.fail("unhandled error!!");
      }
      context.fail("Unauthorized!!");
    } else {
      context.succeed(data);
    }
  });
};

// Public API
module.exports.public = (event, context, cb) => {
  cb(null, { message: 'Welcome to our Public API!' });
};

// Private API
module.exports.private = (event, context, cb) => {
  cb(null, { message: 'Only logged in users can see this' });
};
