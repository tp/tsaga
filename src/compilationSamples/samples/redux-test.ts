// tslint:disable
import fetch, { Response } from 'node-fetch';
import { createTypedForEvery, expectSaga } from '../../lib';
import actionCreatorFactory from 'typescript-fsa';
import { createSelector } from 'reselect';
import { select } from '../../lib/testing/mocks';

export type CountReducerState = {
  count: number;
};

export function sampleIdentityCountReducer(
  previousState = { count: 0 },
  message: any,
): CountReducerState {
  return previousState;
}

export const getCount = (state: CountReducerState) => state.count;

function param<T>(): (_state: any, param: T) => T {
  return (_, param) => param;
}

export const countSelector = (state: CountReducerState) => state.count;

export const stringLongerThanCountSelector = createSelector(
  [param<string>(), countSelector], // TODO: What is this pattern?
  (s, count) => {
    return s.length > count;
  },
);

const createActionCreator = actionCreatorFactory('User');
const postText = createActionCreator<{ text: string }>('set_count');
const wrongAction = createActionCreator<{ notText: string }>(
  'asdfasdfasdfasfd',
);

const forEvery = createTypedForEvery<CountReducerState>();

const textStateSelector = (state: { text: string }) => state.text;

const watchForPostText = forEvery(postText, async ($, { text }) => {
  const isLonger = await $.select(stringLongerThanCountSelector, text);

  // NOTE: Commenting this in should fail compilation, as the selector operates on another state type
  const x = await $.select(textStateSelector);

  if (isLonger) {
    await $.call(fetch, `http://localhost/api/stringCollector`, {
      method: 'POST',
      body: text,
    });
  }
});

test('Saga test', async () => {
  expectSaga(watchForPostText)
    .withReducer(sampleIdentityCountReducer)
    .withMocks([
      select(stringLongerThanCountSelector, 5 /* should be `boolean` */),
    ])
    .toCall(fetch, new Response(undefined, { status: 200 }))
    .toCall(fetch, 404)
    .dispatch(wrongAction({ notText: 'asdf' }))
    .toHaveFinalState({ count: '1' /* should be `number` */ })
    .run();

  return expectSaga(watchForPostText)
    .withReducer(sampleIdentityCountReducer)
    .dispatch(postText({ text: 'asdf' }))
    .toHaveFinalState({ count: '1' /* should be `number` */ })
    .run();
});
