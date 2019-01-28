import actionCreatorFactory from 'typescript-fsa';
import { User } from './types';

const createActionCreator = actionCreatorFactory('User');
export const setCount = createActionCreator<{ count: number }>('set_count');
export const userSelected = createActionCreator<{ id: number }>('selected');
export const userLoaded = createActionCreator<{ user: User }>('loaded');
