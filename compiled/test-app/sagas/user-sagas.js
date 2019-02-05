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
var sagas_1 = require("../sagas");
var actions_1 = require("../actions");
var selectors_1 = require("../selectors");
var app_library_1 = require("../app-library");
/**
 * consumer
 *
 *
 */
// saga, no typing needed as they are provided by the forEvery.
// But then the question becomes, when is the forEvery being bound?
// Would the reader monad pattern be better suitable? Would require type annotations on the saga (as it's not yet connected to any particular store)?
// Also can we better match the message type to the `action` parameter, such that they are always in sync and type safe?
exports.watchForUserSelectToLoad = sagas_1.forLatest(actions_1.userSelected, function (_a, _b) {
    var dispatch = _a.dispatch, select = _a.select, run = _a.run;
    var id = _b.id;
    return __awaiter(_this, void 0, void 0, function () {
        var currentUserId, user, user_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    currentUserId = select(selectors_1.getSelectedUserId);
                    if (currentUserId !== id) {
                        throw new Error("State does not match expectation based on action ,\n        currentUserId = " + currentUserId + " \n\n        action.payload.id = " + id);
                    }
                    user = select(selectors_1.getUserById, id);
                    if (!!user) return [3 /*break*/, 2];
                    return [4 /*yield*/, run(app_library_1.loadUser, id)];
                case 1:
                    user_1 = _c.sent();
                    dispatch(actions_1.userLoaded({ user: user_1 }));
                    return [3 /*break*/, 3];
                case 2:
                    console.log("not loading user, already present");
                    _c.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
});
//   export const watchForUserSelectLatest = forLatest(userSelected, watchForUserSelect.saga);
//
exports.increaseCounter = function (_a) {
    var dispatch = _a.dispatch, select = _a.select, run = _a.run;
    var count = select(selectors_1.getCount);
    console.error("about to set new count:", count + 1);
    dispatch(actions_1.setCount({ count: count + 1 }));
    // console.error(`count set`, select(getCount));
};
exports.watchForUserSelectorToCountIfNotChangedWithing3s = sagas_1.forLatest(actions_1.userSelected, function (_a, payload) {
    var dispatch = _a.dispatch, select = _a.select, run = _a.run, spawn = _a.spawn;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // console.error(env);
                    console.error("about to sleep");
                    return [4 /*yield*/, run(app_library_1.sleep, 3000)];
                case 1:
                    _b.sent();
                    console.error("sleep done");
                    return [4 /*yield*/, spawn(exports.increaseCounter)];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
});
exports.watchForUserSelectorToCountImmediately = sagas_1.forEvery(actions_1.userSelected, exports.watchForUserSelectorToCountIfNotChangedWithing3s.innerFunction);
