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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var redux_1 = require("redux");
var nock = require("nock");
var lib_1 = require("../../lib");
var reducers_1 = require("../reducers");
var actions_1 = require("../actions");
var sagas_1 = require("../sagas");
nock.disableNetConnect();
test('waitFor functionality test', function () { return __awaiter(_this, void 0, void 0, function () {
    var waitForSaga, _a, middleware, sagaCompletion, store, finalState;
    var _this = this;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                waitForSaga = sagas_1.forLatest(actions_1.userSelected, function (_a, payload) {
                    var dispatch = _a.dispatch, select = _a.select, run = _a.run, take = _a.take;
                    return __awaiter(_this, void 0, void 0, function () {
                        var count;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    console.error("waitfor saga started");
                                    return [4 /*yield*/, take(actions_1.setCount)];
                                case 1:
                                    count = (_b.sent()).count;
                                    dispatch(actions_1.setCount({ count: count + 5 }));
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                _a = lib_1.tsagaReduxMiddleware([waitForSaga]), middleware = _a.middleware, sagaCompletion = _a.sagaCompletion;
                store = redux_1.createStore(reducers_1.userReducer, redux_1.applyMiddleware(middleware));
                store.dispatch(actions_1.userSelected({ id: -1 })); // Just to trigger saga
                console.error("about to dispatch set count");
                store.dispatch(actions_1.setCount({ count: 3 }));
                return [4 /*yield*/, sagaCompletion()];
            case 1:
                _b.sent();
                finalState = store.getState();
                expect(finalState.count).toEqual(8);
                return [2 /*return*/];
        }
    });
}); });
