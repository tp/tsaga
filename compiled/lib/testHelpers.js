"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = require("assert");
// type SilentAssertion = {
//   type: 'dispatch',
// }
// TODO: Should call provide the env implictly if the target function desires it?
// A function without `env` should have no side effect and can just be called directly
// TODO: Allow T to be provided for Promise<T>
// TODO: Affordances for effects and effect creators
// TODO: Do we need plain effect in here? Or should always creators be passed?
// Otherwise the call-site could be written as either `run(f, x)` or `run(f(x))`…
function runs(f) {
    // export function runs<R, T extends (...args: any[]) => void>(f: T): ValueMockBuilder<void> {
    return {
        receiving: function (value) {
            return {
                type: 'call',
                func: f,
                value: value,
            };
        },
    };
}
exports.runs = runs;
function spawns(f) {
    // export function runs<R, T extends (...args: any[]) => void>(f: T): ValueMockBuilder<void> {
    return {
        receiving: function (value) {
            return {
                type: 'spawn',
                func: f,
                value: value,
            };
        },
    };
}
exports.spawns = spawns;
function selects(f) {
    return {
        receiving: function (value) {
            return {
                type: 'select',
                func: f,
                value: value,
            };
        },
    };
}
exports.selects = selects;
function forks(f) {
    return {
        receiving: function (value) {
            return {
                type: 'select',
                func: f,
                value: value,
            };
        },
    };
}
exports.forks = forks;
function testSaga(saga) {
    var _this = this;
    return {
        with: function (action) {
            return {
                which: function () {
                    var effects = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        effects[_i] = arguments[_i];
                    }
                    effects = effects.slice(0);
                    return {
                        // TODO: run Add run to execute without final state check?
                        resultingInState: function (finalState) {
                            return {
                                forReducer: function (reducer) { return __awaiter(_this, void 0, void 0, function () {
                                    var state, testContext;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                state = reducer(undefined, { type: '___INTERNAL___SETUP_MESSAGE' });
                                                testContext = {
                                                    run: function (f) {
                                                        var args = [];
                                                        for (var _i = 1; _i < arguments.length; _i++) {
                                                            args[_i - 1] = arguments[_i];
                                                        }
                                                        // ((...args: any[]) => any) | Effect<any, any>
                                                        for (var _a = 0, effects_1 = effects; _a < effects_1.length; _a++) {
                                                            var effect = effects_1[_a];
                                                            if (effect.type === 'call' && effect.func === f /* TODO: & check args */) {
                                                                return effect.value;
                                                            }
                                                        }
                                                        console.error(effects);
                                                        // TODO: Should we expect a mock for all, or just call through?
                                                        throw new Error("No mock value provided for run(" + (f.name || 'unnamed function') + ")");
                                                    },
                                                    select: function (selector) {
                                                        var args = [];
                                                        for (var _i = 1; _i < arguments.length; _i++) {
                                                            args[_i - 1] = arguments[_i];
                                                        }
                                                        for (var _a = 0, effects_2 = effects; _a < effects_2.length; _a++) {
                                                            var effect = effects_2[_a];
                                                            if (effect.type === 'select' && effect.func === selector) {
                                                                return effect.value;
                                                            }
                                                        }
                                                        console.error("select", effects);
                                                        throw new Error("No mock value provided for select(" + (selector.name || 'unnamed selector') + ")");
                                                    },
                                                    dispatch: function (action) {
                                                        console.log(action);
                                                        // TODO: Support assertions on dispatched message, or is it fine to just check the final state?
                                                        state = reducer(state, action);
                                                    },
                                                    fork: function (f) {
                                                        var args = [];
                                                        for (var _i = 1; _i < arguments.length; _i++) {
                                                            args[_i - 1] = arguments[_i];
                                                        }
                                                        // TODO: Create detached context / add cancellation to tests?
                                                        for (var _a = 0, effects_3 = effects; _a < effects_3.length; _a++) {
                                                            var effect = effects_3[_a];
                                                            if (effect.type === 'fork' && effect.func === f) {
                                                                return effect.value;
                                                            }
                                                        }
                                                        console.error("fork: calling through");
                                                        return f.apply(void 0, [testContext].concat(args));
                                                        // throw new Error(`Not implemented: fork`);
                                                    },
                                                    spawn: function (f) {
                                                        var args = [];
                                                        for (var _i = 1; _i < arguments.length; _i++) {
                                                            args[_i - 1] = arguments[_i];
                                                        }
                                                        for (var _a = 0, effects_4 = effects; _a < effects_4.length; _a++) {
                                                            var effect = effects_4[_a];
                                                            if (effect.type === 'spawn' && effect.func === f) {
                                                                return effect.value;
                                                            }
                                                        }
                                                        console.error("spawn: calling through");
                                                        return f.apply(void 0, [testContext].concat(args));
                                                    },
                                                    take: function () {
                                                        throw new Error("Not implemented: take");
                                                    },
                                                };
                                                return [4 /*yield*/, saga.saga(
                                                    /**
                                                     * Fine, since the outside interface is equal, it's just not of the same `class`
                                                     *
                                                     * TODO: We might want to use `InterfaceOf` everywhere instead of exposing the concrete class
                                                     */
                                                    testContext, action)];
                                            case 1:
                                                _a.sent();
                                                assert_1.deepStrictEqual(state, finalState);
                                                console.error('saga done');
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                            };
                        },
                    };
                },
            };
        },
    };
}
exports.testSaga = testSaga;
