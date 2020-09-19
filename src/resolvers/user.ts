import { User } from 'src/entities/User';
import { MyContext } from 'src/types';
import { Resolver, Mutation, InputType, Field, Arg, Ctx } from 'type-graphql';
import argon2 from 'argon2';

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string;
    @Field()
    password: string;
}

@Resolver()
export class UserResolver {
    @Mutation()
    async signUp(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em }: MyContext
    ) {
        const hashPassword = await argon2.hash(options.password);
        const user = em.create(User, {
            username: options.username,
            password: hashPassword,
        });
        await em.persistAndFlush(user);
    }
}
