//@ts-ignore
import { Elm } from './Elm/Main.elm';
import { querySplit } from '../utils';

type RootProps = {
  oauth_token?: string;
  oauth_token_secret?: string;
  q?: string;
};

const node = document.getElementById('mounted');

const query = querySplit<RootProps>(location.search.slice(1));

const app = Elm.Main.init({
  node,
  flags: {
    accessToken: query.oauth_token || null,
    accessSecret: query.oauth_token_secret || null,
    query: query.q || null,
  },
});
