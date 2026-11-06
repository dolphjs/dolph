/**
 * Loads a database driver the app is expected to install itself.
 *
 * Takes a loader instead of a package name so each `require` stays a plain string
 * that bundlers can follow. Only a missing driver gets the install hint: an error
 * from inside an installed driver is rethrown untouched.
 */
export const loadOptionalDriver = <T>(name: string, load: () => T): T => {
    try {
        return load();
    } catch (error) {
        if (error?.code === 'MODULE_NOT_FOUND' && String(error.message).includes(`'${name}'`)) {
            throw new Error(`The \`${name}\` package is not installed. Run \`npm install ${name}\` to use it with DolphJS.`, {
                cause: error,
            });
        }
        throw error;
    }
};
