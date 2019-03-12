import { Action } from 'typescript-fsa';
import { userSelected } from '../test-app/actions';
import { sleep } from '../test-app/app-library';
import { userReducer } from '../test-app/reducers';
import { watchForUserSelectorToCountIfNotChangedWithing3s } from '../test-app/sagas/user-sagas';
import { getCount } from '../test-app/selectors';
import { calls, selects, ValueMock } from './stateBasedTestHelper';
import { Saga } from './types';

export function expectSaga<AppState, InitialSagaPayload>(
  saga: Saga<AppState, InitialSagaPayload>,
): ExpectSagaStage1<AppState, InitialSagaPayload> {
  return null as any;
}

interface ExpectSagaStage1<AppState, InitialSagaPayload> {
  startedWithAction(initialAction: Action<InitialSagaPayload>): ExpectSagaStage2<AppState, InitialSagaPayload>;
}

interface ExpectSagaStage2<AppState, InitialSagaPayload> {
  andReducerAndInitialState(
    reducer: (state: AppState | undefined, action: Action<any>) => AppState,
    initialState: AppState | undefined,
  ): ExpectSagaStage3<AppState, InitialSagaPayload>;
}

type ExpectSagaStage3<AppState, InitialSagaPayload> = {
  withMocks(mocks: Array<ValueMock<AppState, any>>): ExpectSagaStage4<AppState, InitialSagaPayload>;
} & ExpectSagaStage4<AppState, InitialSagaPayload>;

interface ExpectSagaStage4<AppState, InitialSagaPayload> {
  toCall(...args: any[]): ExpectSagaStage4<AppState, InitialSagaPayload>;
  toRun(...args: any[]): ExpectSagaStage4<AppState, InitialSagaPayload>;
  toSpawn(...args: any[]): ExpectSagaStage4<AppState, InitialSagaPayload>;
  toDispatch(...args: any[]): ExpectSagaStage4<AppState, InitialSagaPayload>;
  toSelect(...args: any[]): ExpectSagaStage4<AppState, InitialSagaPayload>;

  toHaveFinalState(state: AppState): Promise<void>;
}

test('expectSaga sample', () => {
  return expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .startedWithAction(userSelected({ id: 2 }))
    .andReducerAndInitialState(userReducer, undefined)
    .withMocks([calls(sleep).receiving(), selects(getCount).receiving(5)])

    .toCall(sleep)
    .toSelect(getCount)

    .toHaveFinalState({ count: 6, selectedUser: 2, usersById: {} });
});
