import { SagaContext } from '../../lib';
import { ReduxLikeSagaContext } from '../../lib/redux-like';

/**
 * Redux like reducer
 *
 * The optional previous state is used for compatibility with Redux, but not an endorsement of that pattern
 */

export type CountReducerState = {
  count: number;
};

const initialState = {
  count: 0,
};

// Message designated for the reducer onluy
interface SetCountMessage {
  type: 'setCount';
  payload: {
    count: number;
  };
}

// Message designated for the saga only
export interface AddToCount {
  type: 'addToCount';
  payload: {
    plus: number;
  };
}

// in practice these should be generated / depend on the usage of the appropriate action creator
function isSetCountMessage(o: any): o is SetCountMessage {
  if (o && typeof o === 'object' && o.type === 'setCount' && typeof o.payload === 'object' && typeof o.payload.count === 'number') {
    return true;
  }

  return false;
}

export function sampleCountReducer(previousState = initialState, message: any): CountReducerState {
  if (isSetCountMessage(message)) {
    return {
      count: message.payload.count,
    };
  }

  return previousState;
}

export async function updateCountMessageOrResetSaga({ call, put, select }: ReduxLikeSagaContext, message: AddToCount) {
  const previousCount = await select(`count`);

  const newCount = previousCount + message.payload.plus;
  const optimisticUpdateAction: SetCountMessage = {
    type: 'setCount',
    payload: { count: newCount },
  };
  await put(optimisticUpdateAction);

  try {
    await call(window.fetch, '/count', {
      method: 'POST',
      body: `${newCount}`,
    });
  } catch (e) {
    const rollbackAction: SetCountMessage = {
      type: 'setCount',
      payload: { count: previousCount },
    };
    await put(rollbackAction);
  }
}
