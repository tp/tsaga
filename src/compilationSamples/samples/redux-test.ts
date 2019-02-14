// tslint:disable
import fetch, { Response } from 'node-fetch';
import { testSagaWithState, createTypedForEvery, calls, selects } from '../../lib';
import actionCreatorFactory from 'typescript-fsa';
import { createSelector } from 'reselect';

export type CountReducerState = {
  count: number;
};

export function sampleIdentityCountReducer(previousState = { count: 0 }, message: any): CountReducerState {
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
const wrongAction = createActionCreator<{ notText: string }>('asdfasdfasdfasfd');

const forEvery = createTypedForEvery<CountReducerState>();

const textStateSelector = (state: { text: string }) => state.text;

const watchForPostText = forEvery(postText, async ($, { text }) => {
  const isLonger = await $.select(stringLongerThanCountSelector, text);

  // NOTE: Commenting this in should fail compilation, as the selector operates on another state type
  const x = await $.select(textStateSelector);

  if (isLonger) {
    await $.call(fetch, `http://localhost/api/stringCollector`, { method: 'POST', body: text });
  }
});

test('Saga test', async () => {
  testSagaWithState(
    watchForPostText,
    //  TODO: This should also fail on alternate message with the same payload (should take the action creator from the watcher, not saga)
    wrongAction({ notText: 'asdf' }) /* should be `postText` */,
    [
      selects(stringLongerThanCountSelector /* TODO: `sample` */).receiving(5 /* should be `boolean` */),
      calls(
        fetch /* TODO: Accept additional params,  undefined / should be `string` /, { method: 'POST', body: '' } */,
      ).receiving(new Response(undefined, { status: 200 })),
      calls(fetch /* '', { method: 'POST', body: '' } */).receiving(404 /* should be `Response` */),
    ],
    undefined,
    sampleIdentityCountReducer,
    { count: '1' /* should be `number` */ },
  );

  return testSagaWithState(
    watchForPostText,
    postText({ text: 'asdf' }),
    [],
    undefined,
    sampleIdentityCountReducer,
    { count: '1' /* should be `number` */ }, // this is only reached, if the correct action is passed
  );
});
