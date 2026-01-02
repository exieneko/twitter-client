# twitter-client

A basic Twitter API client for Javascript & Typescript because I love reinventing the wheel ♡

> [!CAUTION]
> This client uses Twitter's browser API instead of the official paid one. **Use at your own risk**, as this may get your account suspended  
> Note that all requests will be made from the IP address of the server even if multiple accounts are used

## `TwitterClient` class

`TwitterClient` can be used to send requests as a single user. Allows creation, deletion and modification to user data, such as creating tweets, following users, etc

### Example

(This example implementation uses SvelteKit, adjust for your use case)

Declare the Twitter client as a property on the global `Locals` interface

```ts
// src/app.d.ts
import type { TwitterClient } from '@exieneko/twitter-client';

declare global {
    namespace App {
        interface Locals {
            twitter: TwitterClient
        }
    }
}

export {};
```

Initialize `TwitterClient` using the current user's credentials

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { TwitterClient } from '@exieneko/twitter-client';

export const handle: Handle = async ({ event, resolve }) => {
    const authToken = event.cookies.get('auth_token')!;
    const csrf = event.cookies.get('ct0')!;

    event.locals.twitter = new TwitterClient({ authToken, csrf });

    return await resolve(event);
};
```

The client can be accessed on `event.locals` in any server file

```ts
// src/routes/[userid]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
    const [, user] = await locals.twitter.getUser(params.userid);
    return { user };
}) satisfies PageServerLoad;
```

## `TwitterPool` class

`TwitterPool` can be used to avoid rate limits by sending each request as a different user.
The account pool will be sorted with each request to ensure that a different account gets chosen with each request

Only methods that don't get or modify user-dependent data are available

### Example

Define `pool` as a global variable

```ts
// src/app.d.ts
import type { TwitterPool } from '@exieneko/twitter-client';

declare global {
    namespace App {}
    var pool: TwitterPool
}
```

In a server file, set the value of the global variable and export it to use in other server files

```ts
// src/lib/server/twitter.ts
import { TwitterPool } from '@exieneko/twitter-client';

const pool = global.pool || new TwitterPool( /* ... */ );

if (process.env.NODE_ENV === 'development') {
    global.pool = pool;
}

export { pool };
```

## Types

After receiving the JSON data from Twitter, this package maps it to a custom type structure, which is easier to use

```ts
import type { Entry, Media, Tweet, User, SuspendedUser } from '@exieneko/twitter-client/types';
```
