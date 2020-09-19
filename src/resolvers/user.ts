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

import { User } from '../entities/User';
import { MyContext } from 'src/types';
import {
    UsernamePasswordInput,
    validateRegister,
} from '../utils/validateRegister';

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
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const errors = validateRegister(options);
        console.log(errors);

        if (errors) {
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
