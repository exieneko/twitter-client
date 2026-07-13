# @exieneko/twitter-client

A Twitter API client for account automation via the web API. Includes custom types and multi-account support

> [!CAUTION]
> **USE THIS AT YOUR OWN RISK**
>
> Account automation is only officially supported via the paid API. Using this package always carries the risk of getting your account suspended

## How to use

### With one account

1. Install the package with `pnpm add @exieneko/twitter-client`
2. Get your `auth_token` and `ct0` cookies from Twitter
3. Call `TwitterClient.new()` with your account tokens

```ts
import { TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.new({ ... });

const { errors, data: user } = await twitter.getUser('jack', { byUsername: true });

console.log(user);
```

### With multiple accounts

Use `TwitterPool` to evenly spread the requests between any number of accounts. Endpoints with get or modify user data will be unavailable

```ts
import { TwitterPool } from '@exieneko/twitter-client';

const pool = await TwitterPool.new([...]);

const { errors, data: tweet } = await pool.getTweetResult(123456789000n);

console.log(tweet);
```
