/**
 * Types used in the app
 */
export declare type AppState = {
    count: number;
    selectedUser: number | null;
    usersById: {
        [key: number]: User | undefined;
    };
};
export declare type User = {
    id: number;
    name: string;
};
