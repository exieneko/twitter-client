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
3. Call `TwitterClient.new()`with your account tokens

Alternatively, use `TwitterPool` to evenly spread the requests between any number of accounts. Endpoints with get or modify user data will be unavailable

```ts
import { TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.new({
    // cookies
    auth_token: '...',
    ct0: '...',
}, {
    // options
    proxyUrl: 'http://127.0.0.1:8888'
});

// handle a possible error
if (twitter instanceof Error) {
    console.log('error:', twitter);
    return;
}
```

## Examples

### Fetching data

```ts
const twitter = await TwitterClient.newUnchecked({ ... });

const { errors, data: user } = await twitter.getUser('jack', { byUsername: true });

console.log(user?.id);
```

### Fetching a timeline

Methods that fetch timelines are generator method and will yield a slice until the timeline reaches its end. This does not apply to `TwitterPool`

When the timeline reaches the end, the returned value will be a slice with an empty `errors` array

```ts
import { TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.newUnchecked({ ... });

const timeline = twitter.getTimeline();
const { done, value: { errors, data: slice } } = await timeline.next();

console.log(slice?.entries[0].id);
```

Or use the `slice` function to get the first slice of the generator and then discard it

```ts
import { slice, TwitterClient } from '@exieneko/twitter-client';

const twitter = await TwitterClient.newUnchecked({ ... });

const { errors, data: slice } = await slice(twitter.getTimeline());

console.log(slice?.entries[0].id);
```
