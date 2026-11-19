# @exieneko/twitter-client

![NPM Version](https://img.shields.io/npm/v/%40exieneko%2Ftwitter-client?style=for-the-badge&logo=nodedotjs&logoColor=white&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40exieneko%2Ftwitter-client)
![NPM Last Update](https://img.shields.io/npm/last-update/%40exieneko%2Ftwitter-client?style=for-the-badge&logo=npm&logoColor=white&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40exieneko%2Ftwitter-client)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/exieneko/twitter-client?style=for-the-badge&logo=git&logoColor=white)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/%40exieneko%2Ftwitter-client?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0yMSwxNi41QzIxLDE2Ljg4IDIwLjc5LDE3LjIxIDIwLjQ3LDE3LjM4TDEyLjU3LDIxLjgyQzEyLjQxLDIxLjk0IDEyLjIxLDIyIDEyLDIyQzExLjc5LDIyIDExLjU5LDIxLjk0IDExLjQzLDIxLjgyTDMuNTMsMTcuMzhDMy4yMSwxNy4yMSAzLDE2Ljg4IDMsMTYuNVY3LjVDMyw3LjEyIDMuMjEsNi43OSAzLjUzLDYuNjJMMTEuNDMsMi4xOEMxMS41OSwyLjA2IDExLjc5LDIgMTIsMkMxMi4yMSwyIDEyLjQxLDIuMDYgMTIuNTcsMi4xOEwyMC40Nyw2LjYyQzIwLjc5LDYuNzkgMjEsNy4xMiAyMSw3LjVWMTYuNU0xMiw0LjE1TDEwLjExLDUuMjJMMTYsOC42MUwxNy45Niw3LjVMMTIsNC4xNU02LjA0LDcuNUwxMiwxMC44NUwxMy45Niw5Ljc1TDguMDgsNi4zNUw2LjA0LDcuNU01LDE1LjkxTDExLDE5LjI5VjEyLjU4TDUsOS4yMVYxNS45MU0xOSwxNS45MVY5LjIxTDEzLDEyLjU4VjE5LjI5TDE5LDE1LjkxWiIgLz48L3N2Zz4%3D&logoColor=white)

Twitter API client for account automation

## What is this?

This package exports a wrapper for the Twitter's browser API to be used with any account with an active session. The response data is parsed and returned as custom objects that only include important data in a more readable manner

Note: this kind of account automation isn't officially supported; use at your own risk

## Installation

Install the `@exieneko/twitter-client` npm package with your preferred package manager

```sh
pnpm add @exieneko/twitter-client
```

## Usage

To set up an account, log in on [twitter.com](https://twitter.com) to create a session, then export your cookies. Only the `auth_token` and `ct0` cookies are required, the others will be automatically added to requests if previous responses contained a `set-cookie` header

Initialize `TwitterClient` with your account tokens:

```ts
import { TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.new({
    auth_token: '...',
    ct0: '...',
    // optional cookies
    twid: '1234567890'
});
```

Alternatively, use the `TwitterClient.fromCookiesFile` static method to initialize the client from a file containing a JSON object:

```ts
const cookiesFilePath = './cookies.json';
const twitter = await TwitterClient.fromCookiesFile(cookiesFilePath, {
    files: {
        // set this option to a file path to create a json dump of the current cookies after every request
        cookies: cookiesFilePath
    }
});
```

## Options

`TwitterClient` and `TwitterPool` are both initialized with `Partial<TwitterOptions>`

+ `domain` - Either twitter.com or x.com
+ `files.cookies` - Dump cookies as JSON to a file
+ `files.data` - Dump parsed response data to a JSON array in a file
+ `language` - Twitter client language. Changing this setting will change the received automatic translation data, but it might cause undesirable results for logic that depends on language-specific text. Leave as `en` for consistent results
+ `logLevel` - Log level between 0-3: `0` is quiet, `1` is errors only, `2` is errors and warnings (default), `3` is everything
+ `overrides.flags` - Override feature flags. The full list can be found in [src/flags.ts](https://github.com/exieneko/twitter-client/blob/master/src/flags.ts), but note that they may be added or removed between updates
+ `overrides.headers` - Override headers sent to the API
+ `proxyUrl` - Http proxy to use

## Exports

+ `TwitterClient` - Class used as a wrapper for sending requests to the API from 1 account
+ `TwitterPool` - Class to split up requests between multiple accounts
+ `slice` - Utility function for taking the first slice in a timeline, then discarding the rest
+ `ENDPOINTS` - An object containing all preset endpoints. Custom endpoints can be used using the `fetch` method
+ `Query` - Recursive interface for creating search queries programatically

Types are exported from `/types` and `/types/utils`

## Examples

### Get data

```ts
import { TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.new({ ... });
const { errors, data: user, response } = await twitter.getUser('jack', { byUsername: true });

// `user: UserResult` here could be either `User` or `UnavailableUser`
if (user.__typename === 'User') {
    console.log(`@jack's id is: ${user.id}`);
} else {
    console.log('not found');
}
```

### Get a timeline

When fetching a timeline, an `AsyncGenerator` will be returned that can be reused to fetch the next part of the timeline. (This only applies to `TwitterClient`)

```ts
import { TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.new({ ... });
const timeline = twitter.getTimeline();

const { done, value: result } = await timeline.next();

if (result.data) {
    for (const entry of result.data.entries) {
        if (entry.content.__typename === 'Tweet') {
            console.log(`${entry.content.author.username} tweeted: "${entry.content.text}"`);
        }
    }
}
```

The `slice` function lets you get just one slice of the timeline, then discard the generator

```ts
import { TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.new({ ... });
const { data } = await slice(twitter.getTimeline());

console.log(data?.entries.at(0)?.content.__typename);
```

### Create a tweet

```ts
import { TwitterClient } from '@exieneko/twitter-client';
import { readFileSync } from 'node:fs';

const twitter = await TwitterClient.new({ ... });

// read buffer from file
const { buffer } = readFileSync('something_awesome.png');
// then upload it with its mime type (omit to have it inferred automatically)
// `createMetadata` will be called automatically for each media within `createTweet`
const { data: media } = await twitter.upload(buffer, 'image/png');

const { errors, data: tweet } = await twitter.createTweet({
    text: 'my tweet text >_<!!',
    media: [{
        id: media.id,
        altText: 'an image showing something awesome'
    }],
    replyPermission: 'Mutuals'
});

console.log(tweet.id);
```

### Multi-account use

`TwitterPool` allows using multiple accounts at once. Which account will send the request depends on its rate limit status, which is updated after every request. To avoid getting rate limited, make sure you have enough accounts in the pool for your use case

```ts
import { TwitterPool } from '@exieneko/twitter-client';

const pool = await TwitterPool.new([{ ... }, { ... }, { ... }], { /* options */ });

// least rate-limited account is used to make the request
const { data: user } = await pool.getUser('1036570822176071681');
```

Or use `TwitterPool.fromPromises` to initialize if from a `Promise<TwitterClient>[]`, which lets you assign different options to each account

```ts
import { TwitterClient, TwitterPool } from '@exieneko/twitter-client';
import type { TwitterOptions } from '@exieneko/twitter-client/types';

const options: Partial<TwitterOptions> = { debug: 0 };

const pool = await TwitterPool.fromPromises([
    TwitterClient.new({ auth_token: '...', ct0: '...' }, { ...options, proxyUrl: 'http://127.0.0.1:8000' }),
    TwitterClient.new({ auth_token: '...', ct0: '...' }, { ...options, proxyUrl: 'http://127.0.0.1:8001' }),
    TwitterClient.new({ auth_token: '...', ct0: '...' }, { ...options, proxyUrl: 'http://127.0.0.1:8002' })
]);
```

## Disclaimer

This repository isn't affiliated with Twitter Inc. This software is not intended to be used for malicious purposes, it's the responsibility of the users of this package to follow Twitter's terms of use
