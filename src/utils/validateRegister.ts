import { InputType, Field } from 'type-graphql';
@InputType()
export class UsernamePasswordInput {
    @Field()
    username: string;
    @Field()
    password: string;
}

export const validateRegister = (options: UsernamePasswordInput) => {
    if (options.password.length <= 2 && options.username.length <= 2) {
        return [
            {
                field: 'username',
                message: 'length must be greater than 2',
            },
            {
                field: 'password',
                message: 'length must be greater than 2',
            },
        ];
    }
    if (options.username.length <= 2) {
        return [
            {
                field: 'username',
                message: 'length must be greater than 2',
            },
        ];
    }

    if (options.username.includes('@')) {
        return [
            {
                field: 'username',
                message: 'cannot include an @',
            },
        ];
    }

    if (options.password.length <= 2) {
        return [
            {
                field: 'password',
                message: 'length must be greater than 2',
            },
        ];
    }

    return null;
};
