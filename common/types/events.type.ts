export type Listener<T = any> = {
    listener: (...args: T[]) => void | boolean;
    priority: number;
    once: boolean;
};

export type ListenerDecType = {
    listener: Function;
    priority: number;
    once: boolean;
};
