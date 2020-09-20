import { InputType, Field } from 'type-graphql';
import { FieldError } from '../resolvers/user';
@InputType()
export class UsernamePasswordInput {
    @Field()
    username: string;
    @Field()
    password: string;
    @Field()
    email: string;
}

export const validateRegister = (options: UsernamePasswordInput) => {
    let errors: FieldError[] = [];
    if (!options.email.includes('@')) {
        errors.push({
            field: 'email',
            message: 'invalid email',
        });
    }
    if (options.username.length <= 2) {
        errors.push({
            field: 'username',
            message: 'length must be greater than 2',
        });
    }
    if (options.username.includes('@')) {
        errors.push({
            field: 'username',
            message: 'cannot include an @',
        });
    }

    if (options.password.length <= 2) {
        errors.push({
            field: 'password',
            message: 'length must be greater than 2',
        });
    }
    return errors;
};
