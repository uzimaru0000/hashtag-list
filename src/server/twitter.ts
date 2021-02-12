import { createNonce, createToken } from './auth';
import fetch from 'node-fetch';
import { querySplit, queryBuilder } from '../utils';

const END_POINT = 'https://api.twitter.com';

const request = (consumerSecret: string, accessSecret: string) => (
  url: string,
  method: string,
  params: { [key in string]: { toString: () => string } },
  query: { [key in string]: { toString: () => string } } = {},
  body?: string
) =>
  fetch(`${url}${queryBuilder(query)}`, {
    method,
    headers: {
      Authorization: createToken(consumerSecret, accessSecret)(
        url,
        method,
        params,
        query
      ),
    },
    body: body,
  });

export type RequestTokenResponse = {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: boolean;
};

export const requestToken = (consumerSecret: string) => (
  consumerKey: string,
  callbackURL: string
): Promise<RequestTokenResponse> => {
  const url = `${END_POINT}/oauth/request_token`;
  const method = 'POST';
  const params = {
    oauth_nonce: createNonce(),
    oauth_callback: callbackURL,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_consumer_key: consumerKey,
    oauth_version: '1.0',
  };

  return request(consumerSecret, '')(url, method, params)
    .then((x) => {
      if (x.ok) {
        return x;
      } else {
        const token = createToken(consumerSecret, '')(url, method, params, {});

        throw {
          nonce: params.oauth_nonce,
          timestamp: params.oauth_timestamp,
          token,
        };
      }
    })
    .then((x) => x.text())
    .then((x) => querySplit<RequestTokenResponse>(x));
};

export type AccessTokenResponse = {
  oauth_token: string;
  oauth_token_secret: string;
  user_id: string;
  screen_name: string;
};

export const getAccessToken = async (
  oauthToken: string,
  oauthVerifier: string
) =>
  fetch(
    `${END_POINT}/oauth/access_token?oauth_token=${oauthToken}&oauth_verifier=${oauthVerifier}`,
    {
      method: 'POST',
    }
  )
    .then((x) => x.text())
    .then((x) => querySplit<AccessTokenResponse>(x));

export const search = (consumerSecret: string, accessSecret: string) => async (
  consumerKey: string,
  oauthToken: string,
  q: string,
  sinceID: string = '0000000'
) => {
  const url = `${END_POINT}/1.1/search/tweets.json`;
  const method = 'GET';
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: createNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_token: oauthToken,
    oauth_version: '1.0',
  };
  const query = {
    q,
    since_id: sinceID,
  };

  const res = await request(consumerSecret, accessSecret)(
    url,
    method,
    params,
    query
  ).then((x) => x.json());

  return res;
};
