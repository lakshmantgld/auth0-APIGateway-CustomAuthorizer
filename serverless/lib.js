/* eslint-disable no-console */
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
const getToken = (params) => {
  let token;

  if (!params.type || params.type !== 'TOKEN') {
    throw new Error("Expected 'event.type' parameter to have value TOKEN");
  }

  let tokenString = params.authorizationToken;
  if (!tokenString) {
    throw new Error("Expected 'event.authorizationToken' parametere to be set");
  }

  let match = tokenString.match(/^Bearer (.*)$/);
  if (!match || match.length < 2) {
    throw new Error("Invalid Authorization token -" + tokenString + " does not match the bearer");
  }
  return match[1];

};

module.exports.authenticate = (params, cb) => {
  console.log(params);

  let token = getToken(params);

  let client = jwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    jwksUri: process.env.JWKS_URI
  });

  let decoded = jwt.decode(token, {complete: true});
  let kid = decoded.header.kid;

  client.getSigningKey(kid, (err, key) => {
    if (err) {
      cb(err);
    } else {
      let signingKey = key.publicKey || key.rsaPublicKey;
      jwt.verify(token, signingKey, {audience: process.env.AUDIENCE, issuer: process.env.TOKEN_ISSUER}, (err, decoded) => {
        if (err) {
          cb(err);
        } else {
          cb (null, {principalId: decoded.sub, policyDocument: getPolicyDocument('Allow', params.methodArn), context: {scope: decoded.scope}});
        }
      });
    }
  });
}
