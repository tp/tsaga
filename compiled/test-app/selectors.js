"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCount = function (state) { return state.count; };
exports.getSelectedUserId = function (state) { return state.selectedUser; };
exports.getUserById = function (state, id) { return state.usersById[id]; };
