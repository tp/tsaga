"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CancellationToken = /** @class */ (function () {
    function CancellationToken() {
        this._canceled = false;
    }
    CancellationToken.prototype.cancel = function () {
        console.error("cancelling via token");
        this._canceled = true;
    };
    Object.defineProperty(CancellationToken.prototype, "canceled", {
        get: function () {
            return this._canceled;
        },
        enumerable: true,
        configurable: true
    });
    return CancellationToken;
}());
exports.CancellationToken = CancellationToken;
