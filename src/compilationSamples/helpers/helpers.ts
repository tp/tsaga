import * as path from 'path';
// tslint:disable-next-line:no-implicit-dependencies (Just used in tests)
import * as ts from 'typescript';

interface ReducedDiagnostic {
  message: string;
  fileName?: string;
  line?: number;
  character?: number;
}

export const defaultCompilerOptions: ts.CompilerOptions = {
  noEmit: true,
  strict: true,
  target: ts.ScriptTarget.ES2016,
  module: ts.ModuleKind.CommonJS,
  jsxFactory: 'react',
};

export function reducedDiagnostic(
  diagnostic: ts.Diagnostic,
): ReducedDiagnostic {
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start!,
    );
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n',
    );

    return {
      message,
      fileName: path.basename(diagnostic.file.fileName),
      line,
      character,
    };
  } else {
    return {
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    };
  }
}

export function getDiagnostics(
  fileNames: string[],
  options: ts.CompilerOptions,
): ReducedDiagnostic[] {
  const program = ts.createProgram(fileNames, options);
  const emitResult = program.emit();

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  return diagnostics.map(reducedDiagnostic);
}

export function diagnosticsForFile(fileName: string) {
  return getDiagnostics([fileName], defaultCompilerOptions);
}
