"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_fsa_1 = require("typescript-fsa");
var createActionCreator = typescript_fsa_1.default('User');
exports.setCount = createActionCreator('set_count');
exports.userSelected = createActionCreator('selected');
exports.userLoaded = createActionCreator('loaded');
