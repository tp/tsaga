"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_fsa_1 = require("typescript-fsa");
var actions_1 = require("./actions");
var initialState = {
    count: 0,
    selectedUser: null,
    usersById: {},
};
function userReducer(state, action) {
    if (state === void 0) { state = initialState; }
    var _a;
    if (typescript_fsa_1.isType(action, actions_1.userSelected)) {
        // console.error(`reducer: user selected`);
        return __assign({}, state, { selectedUser: action.payload.id });
    }
    else if (typescript_fsa_1.isType(action, actions_1.userLoaded)) {
        // console.error(`reducer: user loaded`);
        return __assign({}, state, { usersById: __assign({}, state.usersById, (_a = {}, _a[action.payload.user.id] = action.payload.user, _a)) });
    }
    else if (typescript_fsa_1.isType(action, actions_1.setCount)) {
        console.error("reducer: set count", action.payload);
        return __assign({}, state, { count: action.payload.count });
    }
    else {
        // console.error(`reducer unhandled action`, action);
        return state;
    }
}
exports.userReducer = userReducer;
