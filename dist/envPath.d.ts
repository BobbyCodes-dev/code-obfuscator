/**
 * On Windows, return process.env with MSYS2/MinGW bin dirs prepended to PATH
 * so gcc/g++ and Rust GNU linker are found. Otherwise return process.env.
 */
export declare function getWinEnv(): NodeJS.ProcessEnv;
