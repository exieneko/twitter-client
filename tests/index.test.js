import { describe } from 'node:test';
import { config as dotenv } from 'dotenv';
import { TwitterClient } from '../dist/index.js';

dotenv({ quiet: true });

/** @type {import('node:test').TestOptions} */
const options = {
    timeout: 15_000
};
const { assert } = console;

const twitter = await TwitterClient.new({
    authToken: process.env.AUTH_TOKEN,
    csrf: process.env.CSRF
}, {
    verbose: true
});



describe('get self', options, async () => {
    await twitter.setSelf();
    assert(typeof twitter.self.created_at === 'string');
});

describe('get a tweet', options, async () => {
    const { data: tweet } = await twitter.getTweetResult(20n);
    assert(tweet.author.username === 'jack');
});
