import { createHmac } from 'crypto';

const randomAlpha = () =>
  Math.random()
    .toString(32)
    .slice(2)
    .split('')
    .map((x) => (Math.random() < 0.5 ? x.toUpperCase() : x))
    .join('');

const encode = (str: string) => encodeURIComponent(str).replace('!', '%21');

const createSignature = (consumerSecret: string, oauthSecret: string) => (
  url: string,
  method: string,
  opts: { [key in string]: { toString: () => string } }
) => {
  const params = Object.entries(opts)
    .map(([key, value]) => [encode(key), encode(value.toString())])
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map((x) => x.join('='))
    .join('&');

  const baseStr = `${method}&${encode(url)}&${encode(params)}`;
  const key = `${encode(consumerSecret)}&${encode(oauthSecret)}`;

  return createHmac('sha1', key).update(baseStr).digest('base64');
};

const createOAuth = (params: { [key in string]: { toString: () => string } }) =>
  `OAuth ${Object.entries(params)
    .map(([key, value]) => `${key}="${encodeURIComponent(value.toString())}"`)
    .join(',')}`;

export const createNonce = () =>
  `${Date.now().toString(32)}${randomAlpha()}${randomAlpha()}`;

export const createToken = (consumerSecret: string, oauthSecret: string) => (
  url: string,
  method: string,
  params: { [key in string]: { toString: () => string } },
  query: { [key in string]: { toString: () => string } } = {}
) => {
  return createOAuth({
    ...params,
    oauth_signature: createSignature(consumerSecret, oauthSecret)(url, method, {
      ...params,
      ...query,
    }),
  });
};
