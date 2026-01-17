# twitter-client

Twitter API client for Javascript & Typescript, because I love reinventing the wheel ♡

> [!CAUTION]
> This client uses Twitter's browser API instead of the official paid one  
> Using this package may get your account suspended. **Use at your own risk!**

## About

This package provides a `TwitterClient` class for sending requests to Twitter from a single account. This allows full control over the account, including editing your profile and sending tweets

The `Pool` class can be used for spreading requests out across several automated accounts, but only methods that don't create or modify user-dependent data are allowed

## Usage

To use this package, you need a Twitter account to log in with

Since this package will not create a new session using your username and password, you'll need to get the necessary tokens  
Log in on [twitter.com](https://twitter.com) and get the values for the "auth_token" and "ct0" cookies

```ts
import { TwitterClient } from '@exieneko/twitter-client';
import type { User } from '@exieneko/twitter-client/types';

const twitter = new TwitterClient({
    // Your account tokens are entered when initializing the client
    // To allow multiple accounts, use `Pool` which requires an array of tokens instead
    authToken: 'xxxxxxxxxx', // <- auth_token
    csrf: 'xxxxxxxxxxxxxxx'  // <- ct0
});

const [errors, tweet] = await twitter.createTweet({ text: 'Hello world!' });

// Errors is always an array, containing errors from the Twitter API, if there are any
// Errors aren't always fatal and some data can still be returned
if (errors.length > 0) {
    console.error(errors[0].message);
}

// The 2nd element in the array is optional/undefined
if (tweet?.__typename === 'Tweet') {
    const user: User = tweet.author;
    // ...
}
```

## Limitations

Twitter has some protections in place to prevent automated requests. This package attempts to bypass as many as possible, but Twitter may change their API over time and it's possible for this package to become outdated

Broken features:

+ `verifyCredentials`
+ `unblockUser`
+ and possibly some other v1.1 endpoints in the future
