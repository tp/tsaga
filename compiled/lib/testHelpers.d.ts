import { AnySaga } from '.';
import { Environment } from './environment';
export declare function runs<P extends any[], T>(f: (...args: P) => T): ValueMockBuilder<T extends Promise<infer PT> ? PT : T>;
export declare function spawns<P extends any[], T>(f: (env: Environment<any, any>, ...args: P) => T): ValueMockBuilder<T extends Promise<infer PT> ? PT : T>;
export declare function selects<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>>;
export declare function forks<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>>;
declare type ValueMockBuilder<T> = {
    receiving: (value: T) => ValueMock<T>;
};
declare type ValueMock<T> = {
    type: 'select' | 'call' | 'spawn' | 'fork';
    func: Function;
    value: T;
};
interface SagaTest1 {
    with: (action: any) => SagaTest2;
}
interface SagaTest2 {
    which: (...effects: ValueMock<any>[]) => SagaTestBuilder3;
}
interface SagaTestBuilder3 {
    resultingInState: (state: any) => SagaTestBuilder4;
}
interface SagaTestBuilder4 {
    forReducer: (reducer: Function) => Promise<void>;
}
export declare function testSaga(saga: AnySaga): SagaTest1;
export {};
