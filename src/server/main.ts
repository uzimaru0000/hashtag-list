import micro, { send } from 'micro';
import redirect from 'micro-redirect';
import { router, get } from 'microrouter';
import { requestToken, search, getAccessToken } from './twitter';

const options = {
  consumerKey: process.env.API_KEY,
  consumerSecret: process.env.API_KEY_SECRET,
  callbackURL: process.env.CALLBACK_URL,
};

const route = router(
  get('/', (_, res) => {
    send(res, 200, { message: 'Server is running!!' });
  }),
  get('/auth/twitter', async (_, res) => {
    try {
      const { oauth_token } = await requestToken(options.consumerSecret)(
        options.consumerKey,
        options.callbackURL
      );

      redirect(
        res,
        303,
        `https://api.twitter.com/oauth/authenticate?oauth_token=${oauth_token}`
      );
    } catch (e) {
      const err = await e.json();
      send(res, 500, err);
    }
  }),
  get('/auth/twitter/callback', async (req, res) => {
    const { oauth_token, oauth_verifier } = req.query;
    if (!oauth_token || !oauth_verifier) {
      send(res, 401, { message: 'Unauthorized' });
      return;
    }

    const {
      oauth_token: accessToken,
      oauth_token_secret: accessSecret,
    } = await getAccessToken(oauth_token, oauth_verifier);

    if (!accessToken || !accessSecret) {
      send(res, 401, { message: 'Unauthorized' });
      return;
    }

    redirect(
      res,
      303,
      `/?oauth_token=${accessToken}&oauth_token_secret=${accessSecret}`
    );
  }),
  get('/api/search', async (req, res) => {
    try {
      const [accessToken, accessSecret] = (
        req.headers.authorization || ''
      ).split(':');

      if (!accessToken || !accessSecret) {
        send(res, 401, { code: 401, message: 'Unauthorized' });
        return;
      }

      if (!req.query.q) {
        send(res, 400, { code: 400, message: 'bad request' });
        return;
      }

      const result = await search(options.consumerSecret, accessSecret)(
        options.consumerKey,
        accessToken,
        `${req.query.q} -filter:retweets`,
        req.query.since_id
      );
      send(res, 200, result);
    } catch (e) {
      console.log(e);
      send(res, 500, { message: 'Internal Server Error' });
    }
  })
);

micro(route).listen(3000, () => {
  console.log('server is running from localhost:3000');
});
