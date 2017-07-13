# Auth0-APIGateway-CustomAuthorizer
============================

[![auth0](https://img.shields.io/badge/auth0-v8.7.0-orange.svg)](http://redux.js.org/docs/introduction/)
[![serverless](https://img.shields.io/badge/serverless-v1.17.0-yellow.svg)](http://www.serverless.com)
[![react](https://img.shields.io/badge/react-v15.5.4-blue.svg)](https://github.com/facebook/react)

This repository is all about securing APIGateway using Auth0 through **Custom Authorizer** approach. There are several ways to protect APIGateway namely **IAM Authorizer**, **Cognito Pools** and **Custom Authorizer**. But, This repo is exclusive for custom authorizer approach.

## Technical Architecture:
This high level architecture would help us understand, how custom authorizer protects the APIGateway.
![Architecture diagram](https://raw.githubusercontent.com/lakshmantgld/auth0-APIGateway-CustomAuthorizer/master/readmeFiles/architecture.png)

## Overview:
============================

### APIGateway:
APIGateway is an AWS service that allows for definition, configuration and deployment of **REST API** interfaces. These interfaces can connect to a number of backend systems. One popular use case is to provide an interface to AWS Lambda functions to deliver a so-called **serverless architecture**.

### Why do we want to protect APIGateway?
APIGateway gives us **URLs**, which are REST interfaces that might be invoked from a web application. These URLs can be easily retrieved from network tab in chrome or other browsers. So, this is vulnerable to spammers and hackers who can query or mutate our database system. Prevention methods of APIGateway's abuse depends upon the type of web application, namely:

1. **ReCAPTCHA** can be used for simple web applications, where you do not have **User Sign up/Sign in** process. Here is the complete [article on implementing ReCAPTCHA](https://github.com/lakshmantgld/aws-lambda-recaptcha) to protect backend abuse.

2. **Access Tokens** can be used for web application which has **User Sign up/Sign in** process. This repository concentrates on using **Auth0's** `access_token` to prevent APIGateway's abuse.

### Auth0:
Auth0 is authentication as a service. It helps us to set up a **SSO(Single Sign On)** setup easily on native and web applications. Once the user signs in using Auth0, it returns set of **JWT** tokens which we can use to get the information about the user and also to authorize requests to backend. JWT is an authentication protocol. Explaining JWT is out of scope of this repository, refer [JWT official site](https://jwt.io/) for more information.

### Custom Authorizer in APIGateway:
This allows a Lambda function(AWS Lambda) to be invoked prior to an APIGateway execution, to perform authentication and authorization of the request. So, the custom authorizer function is invoked prior to the actual invocation of the backend.

## Gotchas:
=============================

1. Setting up Auth0's SSO(Single Sign On) is a straightforward approach, but setting up the auth0's API authentication service is little complicated. They have introduced a separate section called **APIs** in the dashboard. We need to create a **auth0 API client** and then integrate it with the **auth0 SSO client**.

2. Authentication and Authorization of **backend requests** is through **JWT** based `access_token` generated from the user login. When you use auth0's SSO, the generated `access_token` by default is not a **JWT**. You need to change some parameter in such a way, that it produces a **JWT** based `access_token`. I will go through this step in the instructions section below.

3. While designing your backend APIs, it is better to expose the **API based on the user privileges**. Say, there are two types of users namely **Customer** and **Admin**. It is better to have distinct URLs for different types of users, so that you can have corresponding API clients in auth0. This will prevent the Customer's `access_token` to authorize Admin's API.

## Instructions to protect APIGateway:

- Clone this repo:
```
git clone https://github.com/lakshmantgld/auth0-APIGateway-CustomAuthorizer.git
```

- Install the dependencies:
```
cd auth0-APIGateway-CustomAuthorizer/serverless && yarn or npm i
cd auth0-APIGateway-CustomAuthorizer/reactJS && yarn or npm i
```

#### Auth0 API Client Setup:

- Lets start with setting up the auth0's API client first and then setup SSO client. Once you create an auth0 account and log in, you will see your **Dashboard**. Click **APIs** section in the left nav-bar. Click **Create API** button in the right-top section. Fill the **Name**, **Identifier**. The Identifier can be any random endpoint, this is also called **audience** in auth0's jargon. Eg: `https://auth0-APIGateway-CustomAuthorizer.com/`. Select the **RS256** signing algorithm, which is the preferred algorithm by auth0, when compared to **HS256**.

- Once you create API client with above setup, you will see **Quick Start**, **Settings** and several other sections in the dashboard. From the code sample in **Quick Start** section, copy **jwksUri**, **audience**, **issuer** and paste those in `./serverless/config.copy.yml`. The value of `auth0Domain` in `config.copy.yml` file is same as the value of `tokenIssuer`. Finally, rename the `config.copy.yml` file to `config.yml`. This file will be used by the custom authorizer Lambda.

- I use [serverless](https://github.com/serverless/serverless/) framework for deploying Lambdas. In this example, we have three lambdas namely **auth**, **public** and **private** as you can see in the `./serverless/serverless.yml`. **public** lambda is open to the world, anyone can access the API. But the **private** lambda is secured by the custom authorizer function **auth**. The public and private lambdas are invoked by the corresponding APIGateway URLs. So, when you invoke the **private** lambda through the associated APIGateway URL, the custom authorizer function **auth** is invoked. Based on the validation/verification by the custom authorizer, the request is forwarded to the private lambda.

- The code to validate the `access_token` from the request can be found in `./serverless/handler.js`. Once you deploy the lambda by running `sls deploy -v` command inside the `./serverless/` directory, you will get the two URLS namely public and private as shown in the picture below:

![sls deploy status](https://raw.githubusercontent.com/lakshmantgld/auth0-APIGateway-CustomAuthorizer/master/readmeFiles/slsDeployStatus.png)

- Now, the public URL can be accessed by anyone, without using the `access_token`. But the private URL requires an `access_token` that is generated from user logging in using **Auth0's SSO**.

#### Testing the Protected APIs

- When you navigate to Auth0's **web Dashbaord** > **APIs section** > **Test section**, you will see the **cURL** method to get the `access_token`. This method is only for **server to APIGateway interaction**, but not for **web application to APIGateway interaction**. I will explain the web application setup in next section. Once you execute the first cURL command, you will get back the `access_token` and `token_type`.

- Now, invoke the private URL using the generated `access_token`. Sending the token to the private API is also specified in the following section. You just have to extract the `access_token` from the previous step and add an authorization header in the present step. The authorization header value should be of format `Bearer <access_token>`. Once this customized cURL is invoked, you will invoke the private lambda which will send you the message `Only logged in users can see this`. Technically, this call invokes the custom authorizer before the APIGateway execution, where it validates the sent access_token. In case of successful validation, it sends back an **IAM Allow API execution** policy, which is interpreted by APIGateway and forwards the request to the private Lambda. In case of failed validation, it returns **IAM Deny API execution** policy which gives a **403** forbidden error to the user.

- **Note:** The output of the custom authorizer must be either **Allow** or **Deny** IAM policy, it should not return any error. In case of **Deny**, user is given an **403** status code. But if you return an error, the user is given an **500** status code, which is not a good UX, confuses the user.

#### Accessing API from SSO client:

- Auth0 has an amazing documentation on creating SSO(Single Sign On) logins for variety of platforms. It is a straightforward approach. You can create a client in **web Dashbaord** > **Clients section**. Once you create the client, you will get many attributes like clientId, domain and so on. Copy the values and paste it in `./reactJS/src/auth0-variables.copy.js`. For the **apiUrl**, use the **API client's identifier**. This is the only difference from the usual SSO app. Instead of SSO's audience, you have to add API client's audience. This is the confusing step as I have mentioned in the **Gotchas** section. Having the API Client's audience will generate **JWT** based `access_token`. Make sure you also add the base APIGateway URL to `./reactJS/constants.js` file.

- The following code in reactJS, shows how apiUrl(API Client's audience) is used:
```js
auth0 = new auth0.WebAuth({
  domain: AUTH_CONFIG.domain,
  clientID: AUTH_CONFIG.clientId,
  redirectUri: AUTH_CONFIG.callbackUrl,
  audience: AUTH_CONFIG.apiUrl,
  responseType: 'token id_token',
  scope: 'openid profile read:messages'
});
```
As you can see, the audience value should be API client's audience also called apiUrl.

- After this step, running `yarn start` will open the app in `localhost:3000`. **Log In** and navigate to **Ping** section and try out **private call** button. You should see the message from private lambda.


Hope, this exhaustive guide help you to integrate **Auth0** and **APIGateway**. Thus, protecting the APIGateway from all forms of abuse.
