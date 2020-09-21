import { Resolver, Query, Int, Arg, Mutation } from 'type-graphql';

import { Post } from '../entities/Post';

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    async posts(): Promise<Post[]> {
        return await Post.find();
    }

    @Query(() => Post, { nullable: true })
    async post(@Arg('id', () => Int) id: number): Promise<Post | undefined> {
        return await Post.findOne(id);
    }

    @Mutation(() => Post)
    async createPost(@Arg('title', () => String) title: string): Promise<Post> {
        return Post.create({ title }).save();
    }
    @Mutation(() => Post, { nullable: true })
    async updatePost(
        @Arg('id', () => Int) id: number,
        @Arg('title', () => String, { nullable: true }) title: string
    ): Promise<Post | null> {
        let post: any = await Post.findOne(id);
        if (!post) {
            return null;
        }
        if (typeof title !== 'undefined') {
            post = await Post.update({ id }, { title });
        }
        return post;
    }

    @Mutation(() => Boolean)
    async deletePost(@Arg('id', () => Int) id: number): Promise<boolean> {
        try {
            const post = await Post.findOne(id);
            if (post) {
                await Post.delete(id);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }
}
