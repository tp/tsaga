import * as ts from 'typescript';
interface ReducedDiagnostic {
    message: string;
    fileName?: string;
    line?: number;
    character?: number;
}
export declare const defaultCompilerOptions: ts.CompilerOptions;
export declare function reducedDiagnostic(diagnostic: ts.Diagnostic): ReducedDiagnostic;
export declare function getDiagnostics(fileNames: string[], options: ts.CompilerOptions): ReducedDiagnostic[];
export declare function diagnosticsForFile(fileName: string): ReducedDiagnostic[];
export {};
