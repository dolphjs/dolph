export type Listener<T = any> = {
    listener: (...args: T[]) => void | boolean;
    priority: number;
    once: boolean;
};

export type ListenerDecType<T = any> = {
    listener: Function;
    priority: number;
    once: boolean;
};
