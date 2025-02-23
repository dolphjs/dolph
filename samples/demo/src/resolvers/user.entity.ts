import { Field, Int, ObjectType } from 'type-graphql';

@ObjectType()
class User {
    @Field((type) => Int)
    id: number;

    @Field((type) => String)
    name: string;

    @Field((type) => String, { nullable: true })
    email?: string;
}

export { User };
