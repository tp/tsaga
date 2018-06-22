import * as ts from 'typescript';

interface ReducedDiagnostic {
  message: string;
  fileName?: string;
  line?: number;
  character?: number;
}

function getDiagnostics(fileNames: string[], options: ts.CompilerOptions): ReducedDiagnostic[] {
  let program = ts.createProgram(fileNames, options);
  let emitResult = program.emit();

  let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

  const result: ReducedDiagnostic[] = [];

  for (const diagnostic of allDiagnostics) {
  }

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      result.push({
        message,
        fileName: diagnostic.file.fileName,
        line,
        character,
      });
    } else {
      result.push({
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      });
    }
  });

  return result;
}

test('Test forces compiler errors when invalid types are used', async () => {
  const diagnostics = getDiagnostics([`${__dirname}/../redux-test.ts`], {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2016,
    module: ts.ModuleKind.CommonJS,
    jsxFactory: 'react',
  });

  expect(diagnostics).toMatchSnapshot();

  expect(diagnostics.length).toBe(4); // explicit alignment with comments in file, to catch accidental snapshot overwrite
});
