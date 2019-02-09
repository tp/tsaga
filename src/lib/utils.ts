import { BoundEffect, Effect } from './types';

export const isBoundEffect = (effect: Effect<any, any, any>): effect is BoundEffect<any, any, any> => {
  return effect instanceof BoundEffect;
};