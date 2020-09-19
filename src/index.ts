import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import redis from 'redis';
import session from 'express-session';
import conncetRedis from 'connect-redis';

import config from './mikro-orm.config';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { __prod__ } from './constants';
import { MyContext } from './types';

const main = async () => {
    const orm = await MikroORM.init(config);
    await orm.getMigrator().up();

    const app = express();

    const RedisStore = conncetRedis(session);
    const redisClient = redis.createClient();

    app.use(
        session({
            name: 'qid',
            store: new RedisStore({ client: redisClient, disableTouch: true }),
            secret: 'secret',
            saveUninitialized: false,
            resave: false,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
                httpOnly: true,
                sameSite: 'lax',
                secure: __prod__,
            },
        })
    );

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver, UserResolver],
            validate: false,
        }),
        context: ({ req, res }): MyContext => ({ em: orm.em, req, res }),
    });

    apolloServer.applyMiddleware({ app });

    app.listen(4000, () => {
        console.log('Server started at port 4000');
    });
};

main().catch((err) => {
    console.error(err);
});
