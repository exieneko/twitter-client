# Twitter Client

Twitter API client for Typescript without needing an API key

> [!CAUTION]
> **USE THIS AT YOUR OWN RISK**
>
> This package makes requests to Twitter's browser API instead of the official, paid one. This kind of account automation may get your account suspended
>
> Read below to learn what you can do to [protect your account](#how-to-protect-your-account)

## About

This package is made to more easily automate Twitter accounts without having to pay for the Twitter API. All requests will be sent to the browser API, like if you were using the web or mobile app. The JSON data returned by the API is intentionally hard to work with, so this package also formats it into a more developer-friendly structure

## Usage

1. Create a session for the account you want to use by logging in on [twitter.com](https://twitter.com)
2. Get the value of the `auth_token` and `ct0` cookies from the devtools
3. Install the package with `npm i @exieneko/twitter-client`
4. Initialize `TwitterClient` (or `TwitterPool` for multi-account) with the `new()` static method

```ts
import { TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.new({
    authToken: '...',
    csrf: '...'
}, {
    // All options are displaying their default values
    domain: 'twitter.com',
    language: 'en',
    longTweetBehavior: 'Force',
    proxyUrl: undefined,
    userAgent: '(chrome)',
    verbose: false
});

const { errors, data } = await twitter.createTweet({ text: 'Hello world!' });

console.dir(errors, { depth: null });
console.dir(data, { depth: null });
```

## How to protect your account

Note that any form of account automation that doesn't use the official API has some amount of risk. This is just to explain what you can do to minimize it

### Don't send too many requests

Sending requests too often can trigger Twitter's bot detection. This usually happens when creating infinite loops

Something like this is bad because it creates a loop that fetches until the timeline is finished, which may take a lot of requests, and they will execute immediately after the previous request finished

```ts
for await (const { errors, data } of twitter.getTweet('123456789')) {
    // This is a bad idea most of the time, unless the loop can exit
    // early if a condition is met, and a delay is implemented that prevents
    // the loop from moving onto the next iteration immediately
}
```

Instead, you should fetch new slices only when you need them

```ts
import { TwitterClient } from '@exieneko/twitter-client';
import type { Entry, Timeline, TweetKind } from '@exieneko/twitter-client/types';

let tweets: Entry<TweetKind>[] = [];

const twitter = await TwitterClient.new(...);
const timeline = twitter.getTweet('123456789');

// Execute every time a new slice is needed
const { value } = await timeline.next();
const { errors, data } = value;

if (data?.entries) {
    tweets.push(...data.entries);
}
```

### Don't spam the `CreateTweet` endpoint

This endpoint uses additional protections against automation. When sending a request to this endpoint, you may get a unique "This request looks like it might be automated" error. If you get this error, **repeating this request will likely get your account will be suspended**

```ts
const { errors, data } = await twitter.createTweet({ text: 'meow' });

if (errors.at(0)?.code === 226) {
    // If this is true, stop calling createTweet to retry
}
```
