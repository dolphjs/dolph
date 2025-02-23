import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { User } from './user.entity';

@Resolver((of) => User)
export class UserResolver {
    private users: User[] = [];

    @Query((returns) => [User])
    async getUsers(@Ctx() context: any) {
        console.log(context.token);
        return this.users;
    }

    @Mutation((returns) => User)
    async addUser(
        @Arg('name', (type) => String) name: string,
        @Arg('email', (type) => String, { nullable: true }) email?: string,
    ): Promise<User> {
        const user = { id: this.users.length + 1, name, email };
        this.users.push(user);
        return user;
    }
}
