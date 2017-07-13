/* eslint-disable global-require, import/first, no-unused-expressions, no-console */
if (!global._babelPolyfill) require('babel-polyfill');

import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

// IAM policy generator that is returned at the end of custom Authorizer.
const getPolicyDocument = (effect, resource) => {
  let policyDocument = {};

  policyDocument.Version = '2012-10-17';
  policyDocument.Statement = [];

  let statementOne = {};
  statementOne.Action = 'execute-api:Invoke';
  statementOne.Effect = effect;
  statementOne.Resource = resource;
  policyDocument.Statement[0] = statementOne;

  return policyDocument;
};

// Extract and return the Bearer Token from the Lambda event parameters
const getToken = (event) => {
  let token;

  if (!event.type || event.type !== 'TOKEN') {
    throw new Error("Expected 'event.type' parameter to have value TOKEN");
  }

  let tokenString = event.authorizationToken;
  if (!tokenString) {
    throw new Error("Expected 'event.authorizationToken' parametere to be set");
  }

  let match = tokenString.match(/^Bearer (.*)$/);
  if (!match || match.length < 2) {
    throw new Error("Invalid Authorization token -" + tokenString + " does not match the bearer");
  }
  return match[1];

};

module.exports.auth = (event, context, callback) => {
  console.log(event);

  // jwt.decode may throw error in case of validating wrong/expired access_token
  try {
    let token, client, decoded, kid;

    token = getToken(event);
    client = jwksClient({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri: process.env.JWKS_URI
    });

    decoded = jwt.decode(token, {complete: true});
    kid = decoded.header.kid;

    client.getSigningKey(kid, (err, key) => {
      if (err) {
        console.log("getSigningKey error:", err);
        callback(null, {policyDocument: getPolicyDocument('Deny', event.methodArn)});
      } else {
        let signingKey = key.publicKey || key.rsaPublicKey;
        let options = {
          audience: process.env.AUDIENCE,
          issuer: process.env.TOKEN_ISSUER
        };

        jwt.verify(token, signingKey, options, (err, decoded) => {
          if (err) {
            console.log("jwt.verify error:", err);
            callback(null, {policyDocument: getPolicyDocument('Deny', event.methodArn)});
          } else {
            callback(null, {principalId: decoded.sub, policyDocument: getPolicyDocument('Allow', event.methodArn), context: {scope: decoded.scope}});
          }
        });

      }
    });
  } catch (err) {
    callback(null, {policyDocument: getPolicyDocument('Deny', event.methodArn)});
  }

};

// Public API
module.exports.public = (event, context, callback) => {
  callback(null, { message: 'Welcome to our Public API!' });
};

// Private API
module.exports.private = (event, context, callback) => {
  callback(null, { message: 'Only logged in users can see this' });
};
