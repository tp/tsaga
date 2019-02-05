"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var path = require("path");
exports.defaultCompilerOptions = {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2016,
    module: ts.ModuleKind.CommonJS,
    jsxFactory: 'react',
};
function reducedDiagnostic(diagnostic) {
    if (diagnostic.file) {
        var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
        var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        return {
            message: message,
            fileName: path.basename(diagnostic.file.fileName),
            line: line,
            character: character,
        };
    }
    else {
        return {
            message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        };
    }
}
exports.reducedDiagnostic = reducedDiagnostic;
function getDiagnostics(fileNames, options) {
    var program = ts.createProgram(fileNames, options);
    var emitResult = program.emit();
    var diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    return diagnostics.map(reducedDiagnostic);
}
exports.getDiagnostics = getDiagnostics;
function diagnosticsForFile(fileName) {
    return getDiagnostics([fileName], exports.defaultCompilerOptions);
}
exports.diagnosticsForFile = diagnosticsForFile;
