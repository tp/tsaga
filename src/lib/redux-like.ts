import { SagaContext } from '.';

/**
 * Implementation of a saga contetext that support `redux` like `selects`
 *
 * As a proof-of-concept before building full `redux` support in a future library
 */

// Dummy selector
// type Selector<State, P1, R> = <P2, P3>(state: State, p1?: P1, p2?: P2, p3?: P3) => R;

interface Action {
  type: string;
  payload: any;
}

type Put = (action: Action) => Promise<void>;

function select<T>(selector: (state: any) => T): T;
function select<P1, T>(selector: (state: any, p1: P1) => T, p1: P1): T;
function select<P1, P2, T>(selector: (state: any, p2: P2) => T, p1: P1, p2: P2): T;
function select<T>(...x: any[]): T {
  throw new Error(`not to be called`);
}

type ReduxContext = {
  select: typeof select;
  put: Put;
};

// TODO: Constraint to AppState type to ensure that it won't fail at runtime due to an obvious type mismatch
export type ReduxLikeSagaContext = SagaContext & ReduxContext;
