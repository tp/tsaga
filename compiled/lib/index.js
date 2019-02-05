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
var typescript_fsa_1 = require("typescript-fsa");
var CancellationToken_1 = require("./CancellationToken");
var environment_1 = require("./environment");
exports.Environment = environment_1.Environment;
var SagaCancelledError_1 = require("./SagaCancelledError");
var testHelpers_1 = require("./testHelpers");
exports.testSaga = testHelpers_1.testSaga;
exports.runs = testHelpers_1.runs;
exports.selects = testHelpers_1.selects;
exports.forks = testHelpers_1.forks;
exports.spawns = testHelpers_1.spawns;
var stateBasedTestHelper_1 = require("./stateBasedTestHelper");
exports.testSagaWithState = stateBasedTestHelper_1.testSagaWithState;
function createTypedForEvery() {
    return function (actionCreator, saga) {
        return {
            actionCreator: actionCreator,
            innerFunction: saga,
            type: 'every',
        };
    };
}
exports.createTypedForEvery = createTypedForEvery;
function createTypedForLatest() {
    return function (actionCreator, saga) {
        return {
            actionCreator: actionCreator,
            innerFunction: saga,
            type: 'latest',
        };
    };
}
exports.createTypedForLatest = createTypedForLatest;
function tsagaReduxMiddleware(sagas) {
    var _this = this;
    // TODO: Remove completed sagas from this (currently leaks all results)
    var sagaPromises = [];
    var cancellationTokens = new Map();
    var awaitingMessages = [];
    function waitForMessage(actionCreator) {
        console.error("waitForMessage called");
        return new Promise(function (resolve, reject) {
            awaitingMessages.push({ actionCreator: actionCreator, promiseResolve: resolve });
            console.error("awaitingMessages", awaitingMessages);
        });
    }
    var middleWare = function (api) {
        return function next(next) {
            return function (action) {
                next(action);
                for (var _i = 0, awaitingMessages_1 = awaitingMessages; _i < awaitingMessages_1.length; _i++) {
                    var config = awaitingMessages_1[_i];
                    if (typescript_fsa_1.isType(action, config.actionCreator)) {
                        config.promiseResolve(action);
                    }
                }
                awaitingMessages = awaitingMessages.filter(function (config) { return !typescript_fsa_1.isType(action, config.actionCreator); });
                for (var _a = 0, sagas_1 = sagas; _a < sagas_1.length; _a++) {
                    var saga = sagas_1[_a];
                    if (typescript_fsa_1.isType(action, saga.actionCreator)) {
                        var cancellationToken = void 0;
                        if (saga.type === 'latest') {
                            var runningSagaCancellationToken = cancellationTokens.get(saga);
                            if (runningSagaCancellationToken) {
                                runningSagaCancellationToken.cancel();
                            }
                            cancellationToken = new CancellationToken_1.CancellationToken();
                            cancellationTokens.set(saga, cancellationToken);
                        }
                        var context = new environment_1.Environment(api, waitForMessage, cancellationToken);
                        sagaPromises.push(saga
                            .innerFunction(context, action)
                            .then(function (e) { return 'completed'; })
                            .catch(function (e) {
                            if (e instanceof SagaCancelledError_1.SagaCancelledError) {
                                return 'cancelled';
                            }
                            console.error("Saga failed", e);
                            return 'failed';
                        }));
                    }
                }
            };
        };
    };
    // TODO: Add support to also await forks
    var sagaCompletion = function () { return __awaiter(_this, void 0, void 0, function () {
        var promises;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    promises = sagaPromises.slice(0);
                    return [4 /*yield*/, Promise.all(promises)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    return { middleware: middleWare, sagaCompletion: sagaCompletion };
}
exports.tsagaReduxMiddleware = tsagaReduxMiddleware;
