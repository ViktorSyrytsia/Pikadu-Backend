import {
    Resolver,
    Mutation,
    Field,
    Arg,
    Ctx,
    ObjectType,
    Query,
} from 'type-graphql';
import argon2 from 'argon2';
import { v4 } from 'uuid';

import { User } from '../entities/User';
import { MyContext } from 'src/types';
import {
    UsernamePasswordInput,
    validateRegister,
} from '../utils/validateRegister';
import { sendEmail } from '../utils/sendEmail';

@ObjectType()
export class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
export class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[];

    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver()
export class UserResolver {
    @Query(() => User, { nullable: true })
    async me(@Ctx() { em, req }: MyContext) {
        if (!req.session.userId) {
            return null;
        }
        const user = await em.findOne(User, { id: req.session.userId });
        return user;
    }

    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() { em, redis }: MyContext
    ): Promise<Boolean> {
        const user = await em.findOne(User, { email });
        if (!user) {
            return true;
            // return {
            //     errors: [
            //         {
            //             field: 'username',
            //             message: "This username doesn't exist",
            //         },
            //     ],
            // };
        }
        const token = v4();
        await redis.set(
            'forget-password:' + token,
            user.id,
            'ex',
            1000 * 60 * 60 * 24
        );
        sendEmail(
            email,
            'Password recovery',
            `<a href='http://localhost:3000/change-password/${token}'>Reset password</a>`
        );
        return true;
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const errors = validateRegister(options);
        if (errors.length > 0) {
            return { errors };
        }

        const user = await em.findOne(User, { username: options.username });
        if (user) {
            return {
                errors: [
                    {
                        field: 'username',
                        message: 'User with this username already exist',
                    },
                ],
            };
        }
        const hashPassword = await argon2.hash(options.password);
        const newUser = em.create(User, {
            username: options.username,
            password: hashPassword,
            email: options.email,
        });
        await em.persistAndFlush(newUser);
        req.session.userId = newUser.id;
        return {
            user: {
                ...newUser,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
            },
        };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('usernameOrEmail') usernameOrEmail: string,
        @Arg('password') password: string,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(
            User,
            usernameOrEmail.includes('@')
                ? { email: usernameOrEmail }
                : { username: usernameOrEmail }
        );
        if (!user) {
            return {
                errors: [
                    {
                        field: 'usernameOrEmail',
                        message: "This username doesn't exist",
                    },
                ],
            };
        }
        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: 'password',
                        message: 'Wrong password',
                    },
                ],
            };
        }
        req.session.userId = user.id;
        return {
            user,
        };
    }
    @Mutation(() => Boolean)
    logout(@Ctx() { req, res }: MyContext) {
        return new Promise((resolve) =>
            req.session.destroy((err) => {
                res.clearCookie('qid');
                if (err) {
                    console.log(err);
                    resolve(false);
                    return;
                }
                resolve(true);
            })
        );
    }
}
