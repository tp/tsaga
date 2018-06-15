function call<R>(f: () => Promise<R>): Promise<R>;
function call<R, A>(f: (_0: A) => Promise<R>, _0: A): Promise<R>;
function call<R, A, B>(f: (_0: A, _1: B) => Promise<R>, _0: A, _1: B): Promise<R>;
function call(f: (...args: any[]) => Promise<any>, ...args: any[]): Promise<any> {
    return f.apply(window, ...args);
}

export interface SagaContext {
    call: typeof call
}

/**
 * Context for live/production usage
 * 
 * Executes everything unchanged
 */
export const pureContext: SagaContext = {
    call: call,
}

interface TestContextResult {
    ctx: SagaContext,
    isDone: () => void;
}

interface TestContextConfiguration {
    stubs: TestContextStub[]
}

interface TestContextStub {
    function: (x: string) => Promise<any>,
    params: [string],
    result: any
}

export function createTestContext(config: TestContextConfiguration): TestContextResult {
    const stubCall: typeof call = async (f: any, ...args: any[]): Promise<any> => {
        
        const firstStub = config.stubs.shift();
        
        if (firstStub.function !== f) {
            throw new Error(`Other function than expected called`);
        }
        
        // TODO: Check params

        return Promise.resolve(firstStub.result);
    }

    return {
        ctx: { call: stubCall },
        isDone: () => {
            if (config.stubs.length !== 0) {
                throw new Error(`stubs left`)
            }
        }
    }

}