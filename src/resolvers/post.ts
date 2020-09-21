import { MyContext } from 'src/types';
import { isAuth } from '../resolvers/middleware/isAuth';
import {
    Resolver,
    Query,
    Int,
    Arg,
    Mutation,
    InputType,
    Field,
    Ctx,
    UseMiddleware,
} from 'type-graphql';

import { Post } from '../entities/Post';

@InputType()
class InputPost {
    @Field()
    title!: string;
    @Field()
    text!: string;
}

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    async posts(): Promise<Post[]> {
        const posts = await Post.find({});
        return posts;
    }

    @Query(() => Post, { nullable: true })
    async post(@Arg('id', () => Int) id: number): Promise<Post | undefined> {
        return await Post.findOne(id);
    }

    @Mutation(() => Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg('input') input: InputPost,
        @Ctx() { req }: MyContext
    ): Promise<Post> {
        return Post.create({ ...input, creatorId: req.session.userId }).save();
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
