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
var nock = require("nock");
var user_sagas_1 = require("../sagas/user-sagas");
var actions_1 = require("../actions");
var reducers_1 = require("../reducers");
var testHelpers_1 = require("../../lib/testHelpers");
var app_library_1 = require("../app-library");
var selectors_1 = require("../selectors");
nock.disableNetConnect();
test('Test helper with mocked call to sub saga', function () { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, testHelpers_1.testSaga(user_sagas_1.watchForUserSelectorToCountIfNotChangedWithing3s)
                    .with(actions_1.userSelected({ id: 2 })) // TODO: Should we provide an initial state (AppState) here? Then we wouldn't have to mock `select`s
                    .which(testHelpers_1.runs(app_library_1.sleep).receiving(), testHelpers_1.spawns(user_sagas_1.increaseCounter).receiving()) // TODO: Do we need an assertion for calls that are supposed to be made, but passed through / actually executed? Or maybe shouldn't `callEnv` be mocked (usually) because of the side-effects which can't be replicated here?
                    .resultingInState({ count: 0, selectedUser: null, usersById: {} })
                    .forReducer(reducers_1.userReducer)];
            case 1:
                _a.sent(); // Since we stub out increaseCounter to do nothing, no side-effect is called
                return [2 /*return*/];
        }
    });
}); });
test('Test helper with call not mocked', function () { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, testHelpers_1.testSaga(user_sagas_1.watchForUserSelectorToCountIfNotChangedWithing3s)
                    .with(actions_1.userSelected({ id: 5 }))
                    .which(testHelpers_1.runs(app_library_1.sleep).receiving(), testHelpers_1.selects(selectors_1.getCount).receiving(1)) // TODO: Fix types such that this doesn't need to be provided
                    .resultingInState({
                    count: 2,
                    selectedUser: null /* message doesn't get put into the store before saga executes. TODO: Should that happen? */,
                    usersById: {},
                })
                    .forReducer(reducers_1.userReducer)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
