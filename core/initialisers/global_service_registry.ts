/**
 * Application-wide singleton service registry.
 *
 * All service classes resolved through `@Component` are stored here after
 * their first instantiation.  On subsequent resolution attempts — whether
 * inside the same component or a different one — the cached instance is
 * returned instead of constructing a new one.
 *
 * This gives DolphJS NestJS-style "singleton" scope by default: every
 * service class has exactly one instance for the lifetime of the process,
 * shared across all components that declare it.
 */
class GlobalServiceRegistryClass {
    private static instance: GlobalServiceRegistryClass;
    private readonly registry = new Map<new (...args: any[]) => any, any>();

    private constructor() {}

    public static getInstance(): GlobalServiceRegistryClass {
        if (!GlobalServiceRegistryClass.instance) {
            GlobalServiceRegistryClass.instance = new GlobalServiceRegistryClass();
        }
        return GlobalServiceRegistryClass.instance;
    }

    /** Returns true if an instance for this class already exists. */
    public has(serviceClass: new (...args: any[]) => any): boolean {
        return this.registry.has(serviceClass);
    }

    /** Retrieves the cached singleton instance. */
    public get<T>(serviceClass: new (...args: any[]) => T): T | undefined {
        return this.registry.get(serviceClass) as T | undefined;
    }

    /** Stores a newly-created instance. Should only be called once per class. */
    public set<T>(serviceClass: new (...args: any[]) => T, instance: T): void {
        this.registry.set(serviceClass, instance);
    }

    /**
     * Resets the registry.
     * Intended for use in tests only — do not call in production code.
     */
    public _reset(): void {
        this.registry.clear();
    }
}

export const GlobalServiceRegistry = GlobalServiceRegistryClass.getInstance();
