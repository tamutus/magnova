export const expectEnv = (key: string) => {
    if (process.env[key])
        return process.env[key] as string;
    else
        throw new Error(`Environment variable ${key} must be set`);
}