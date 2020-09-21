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
import { getConnection } from 'typeorm';

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
    user?: User | undefined;
}

@Resolver()
export class UserResolver {
    @Query(() => User, { nullable: true })
    me(@Ctx() { req }: MyContext) {
        if (!req.session.userId) {
            return null;
        }
        return User.findOne(req.session.userId);
    }

    @Mutation(() => UserResponse)
    async changePassword(
        @Arg('token') token: string,
        @Arg('newPassword') newPassword: string,
        @Ctx() { redis, req }: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 2) {
            return {
                errors: [
                    {
                        field: 'newPassword',
                        message: 'New password length must be greater than 2',
                    },
                ],
            };
        }
        const key = 'forget-password:' + token;
        const userId = await redis.get(key);
        if (!userId) {
            return {
                errors: [
                    {
                        field: 'token',
                        message: 'Invalid token',
                    },
                ],
            };
        }
        const userIdNum = parseInt(userId);
        const user = await User.findOne(userIdNum);
        if (!user) {
            return {
                errors: [
                    {
                        field: 'token',
                        message: 'User no longer exist',
                    },
                ],
            };
        }
        await User.update(
            { id: userIdNum },
            { password: await argon2.hash(newPassword) }
        );

        await redis.del(key);

        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() { redis }: MyContext
    ): Promise<Boolean> {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return true;
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
        @Ctx() { req }: MyContext
    ): Promise<any> {
        const errors = validateRegister(options);
        if (errors.length > 0) {
            return { errors };
        }
        const user = await User.findOne({
            where: { username: options.username },
        });
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

        try {
            const hashPassword = await argon2.hash(options.password);
            const result = await getConnection()
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({
                    username: options.username,
                    password: hashPassword,
                    email: options.email,
                })
                .returning('*')
                .execute();
            req.session.userId = result.raw[0];
            return { user: result.raw[0] };
        } catch (error) {
            return {
                errors: [
                    {
                        field: 'username',
                        message: error.message,
                    },
                    {
                        field: 'password',
                        message: error.message,
                    },
                    {
                        field: 'email',
                        message: error.message,
                    },
                ],
            };
        }
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('usernameOrEmail') usernameOrEmail: string,
        @Arg('password') password: string,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const user = await User.findOne(
            usernameOrEmail.includes('@')
                ? { where: { email: usernameOrEmail } }
                : { where: { username: usernameOrEmail } }
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
