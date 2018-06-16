import { SagaContext } from '.';

/**
 * Implementation of a saga contetext that support `redux` like `selects`
 *
 * As a proof-of-concept before building full `redux` support in a future library
 */

// Dummy selector
type Selector = (selector: string) => Promise<number>;

interface Action {
  type: string;
  payload: any;
}

type Put = (action: Action) => Promise<void>;

// TODO: Constraint to AppState type to ensure that it won't fail at runtime due to an obvious type mismatch
export type ReduxLikeSagaContext = SagaContext & { select: Selector; put: Put };
