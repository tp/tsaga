import { User } from './types';
export declare function sleep(timeoutMS: number): Promise<void>;
export declare function loadUser(id: number): Promise<User>;
