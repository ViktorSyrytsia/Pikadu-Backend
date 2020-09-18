import { Resolver, Query, Ctx, Int, Arg, Mutation } from 'type-graphql';

import { Post } from '../entities/Post';
import { MyContext } from 'src/types';

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    async posts(@Ctx() { em }: MyContext): Promise<Post[]> {
        return await em.find(Post, {});
    }

    @Query(() => Post, { nullable: true })
    async post(
        @Arg('id', () => Int) id: number,
        @Ctx()
        { em }: MyContext
    ): Promise<Post | null> {
        return await em.findOne(Post, { id });
    }

    @Mutation(() => Post)
    async createPost(
        @Arg('title', () => String) title: string,
        @Ctx()
        { em }: MyContext
    ): Promise<Post> {
        const post = em.create(Post, { title });
        await em.persistAndFlush(post);
        return post;
    }
    @Mutation(() => Post, { nullable: true })
    async updatePost(
        @Arg('id', () => Int) id: number,
        @Arg('title', () => String, { nullable: true }) title: string,
        @Ctx()
        { em }: MyContext
    ): Promise<Post | null> {
        const post = await em.findOne(Post, { id });
        if (!post) {
            return null;
        }
        if (typeof title !== 'undefined') {
            post.title = title;
            await em.persistAndFlush(post);
        }
        return post;
    }

    @Mutation(() => Boolean)
    async deletePost(
        @Arg('id', () => Int) id: number,
        @Ctx()
        { em }: MyContext
    ): Promise<boolean> {
        try {
            const post = await em.findOne(Post, { id });
            if (post) {
                await em.nativeDelete(Post, { id });
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }
}
