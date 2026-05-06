import { DolphServiceHandler } from '../../../../../classes';
import { Dolph, NotFoundException } from '../../../../../common';
import { CreateUserDto, UpdateUserDto } from './user.dto';

type UserRecord = CreateUserDto & { id: string; createdAt: string };

export class UserService extends DolphServiceHandler<Dolph> {
    private readonly users: UserRecord[] = [];

    constructor() {
        super('user-service');
        this.seed();
    }

    private seed() {
        this.users.push(
            { id: 'u-1', username: 'alpha', role: 'admin', age: 30, createdAt: new Date().toISOString() },
            { id: 'u-2', username: 'bravo', role: 'user', age: 24, createdAt: new Date().toISOString() },
        );
    }

    list(role?: string) {
        if (!role) return this.users;
        return this.users.filter((u) => u.role === role);
    }

    create(input: CreateUserDto) {
        const user = { ...input, id: `u-${this.users.length + 1}`, createdAt: new Date().toISOString() };
        this.users.push(user);
        return user;
    }

    getById(id: string) {
        const user = this.users.find((u) => u.id === id);
        if (!user) throw new NotFoundException('user not found');
        return user;
    }

    update(id: string, body: UpdateUserDto) {
        const user = this.getById(id);
        Object.assign(user, body);
        return user;
    }

    remove(id: string) {
        const index = this.users.findIndex((u) => u.id === id);
        if (index < 0) throw new NotFoundException('user not found');
        return this.users.splice(index, 1)[0];
    }
}
