import {
    Resolver,
    Mutation,
    InputType,
    Field,
    Arg,
    Ctx,
    ObjectType,
    Query,
} from 'type-graphql';
import argon2 from 'argon2';

import { User } from '../entities/User';
import { MyContext } from 'src/types';

@InputType()
class UsernamePasswordInput {
    @Field(() => String)
    username: string;
    @Field(() => String)
    password: string;
}

@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
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

    @Mutation(() => UserResponse)
    async signUp(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        if (options.username.length <= 2) {
            return {
                errors: [
                    {
                        field: 'username',
                        message: 'Invalid username',
                    },
                ],
            };
        }
        if (options.password.length <= 5) {
            return {
                errors: [
                    {
                        field: 'username',
                        message: 'Invalid password',
                    },
                ],
            };
        }
        const user = em.findOne(User, { username: options.username });
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
            username: options.username.toLowerCase(),
            password: hashPassword,
        });
        await em.persistAndFlush(user);
        req.session.userId = newUser.id;
        return {
            user: newUser,
        };
    }

    @Mutation(() => UserResponse)
    async signIn(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, {
            username: options.username.toLowerCase(),
        });
        if (!user) {
            return {
                errors: [
                    {
                        field: 'username',
                        message: "This username doesn't exist",
                    },
                ],
            };
        }
        const valid = await argon2.verify(user.password, options.password);
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
}
