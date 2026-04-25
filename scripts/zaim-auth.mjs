/**
 * Zaim API アクセストークン取得スクリプト
 *
 * 使い方:
 *   npm run zaim:auth
 *   (または: node --env-file=.env.local scripts/zaim-auth.mjs)
 *
 * .env.local に VITE_ZAIM_CONSUMER_KEY と VITE_ZAIM_CONSUMER_SECRET を設定しておくこと。
 * ブラウザで認証URLを開き、Zaimにログインして承認します。
 * 表示されたverifierコードをターミナルに貼り付けてください。
 */

import { createRequire } from 'module';
import { createInterface } from 'readline';

const require = createRequire(import.meta.url);
const { OAuth } = require('oauth');

const CONSUMER_KEY = process.env.VITE_ZAIM_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.VITE_ZAIM_CONSUMER_SECRET;

if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error(
    'エラー: VITE_ZAIM_CONSUMER_KEY / VITE_ZAIM_CONSUMER_SECRET が未設定です。\n' +
    '.env.local に設定したうえで `npm run zaim:auth` を実行してください。'
  );
  process.exit(1);
}

const oauth = new OAuth(
  'https://api.zaim.net/v2/auth/request',
  'https://api.zaim.net/v2/auth/access',
  CONSUMER_KEY,
  CONSUMER_SECRET,
  '1.0',
  'oob',
  'HMAC-SHA1'
);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

try {
  // Step 1: Get request token
  console.log('リクエストトークンを取得中...');
  const [requestToken, requestTokenSecret] = await new Promise((resolve, reject) => {
    oauth.getOAuthRequestToken((err, token, tokenSecret) => {
      if (err) reject(err);
      else resolve([token, tokenSecret]);
    });
  });

  console.log('\n=== Step 1: ブラウザで以下のURLを開いて認証してください ===');
  console.log(`\nhttps://auth.zaim.net/users/auth?oauth_token=${requestToken}\n`);

  // Step 2: Get verifier from user
  const verifier = await ask('認証後に表示されたコード（verifier）を入力してください: ');

  // Step 3: Get access token
  console.log('\nアクセストークンを取得中...');
  const [accessToken, accessTokenSecret] = await new Promise((resolve, reject) => {
    oauth.getOAuthAccessToken(
      requestToken,
      requestTokenSecret,
      { oauth_verifier: verifier.trim() },
      (err, token, tokenSecret) => {
        if (err) reject(err);
        else resolve([token, tokenSecret]);
      }
    );
  });

  console.log('\n=== 成功！以下の2行を .env.local に追記（または更新）してください ===\n');
  console.log(`VITE_ZAIM_ACCESS_TOKEN=${accessToken}`);
  console.log(`VITE_ZAIM_ACCESS_TOKEN_SECRET=${accessTokenSecret}`);

  // Verify by calling /v2/home/user/verify
  console.log('\n認証テスト中...');
  const userData = await new Promise((resolve, reject) => {
    oauth.get(
      'https://api.zaim.net/v2/home/user/verify',
      accessToken,
      accessTokenSecret,
      (err, data) => {
        if (err) reject(err);
        else resolve(JSON.parse(data));
      }
    );
  });

  console.log(`認証成功！ユーザー: ${userData.me?.name || JSON.stringify(userData.me)}`);

} catch (err) {
  console.error('\nエラー:', JSON.stringify(err, null, 2));
} finally {
  rl.close();
}
