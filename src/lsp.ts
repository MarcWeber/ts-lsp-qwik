// qwik-routes-lsp.ts
import { createConnection, ProposedFeatures, TextDocuments, CompletionItem, CompletionItemKind, Diagnostic } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { cache, config, locale_str, Route, scanRoutes, scanRoutesSetCache, validateDocument } from './lib';
import { lstat } from 'fs';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params) => {
    config.rootPath = params.rootPath || '';
    scanRoutesSetCache();
    return {
        capabilities: {
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: ['='], 
            },
            diagnosticProvider: { 
                interFileDependencies: false, 
                workspaceDiagnostics: false
            },
        },
    };
});

connection.onDidChangeWatchedFiles(() => scanRoutesSetCache());

// connection.onCompletion(({ textDocument, position }) => {
//     const doc = documents.get(textDocument.uri);
//     if (!doc) return [];

//     const line = doc.getText({ start: { line: position.line, character: 0 }, end: { line: position.line, character: Infinity } });
//     if (!line.includes('href=')) return [];

//     return cache.routes.map(r => ({
//         label: r.isLocalized ? `{$localize\`/__/${r.path.slice(1)}/\`}` : `${r.path}/`,
//         kind: CompletionItemKind.File,
//     }) as CompletionItem);
// });

connection.onCompletion(({ textDocument, position }) => {
    const doc = documents.get(textDocument.uri);
    if (!doc) return [];

    const line = doc.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character }
    });

    // Match cases: href="|" or href={'/|'}
    const hrefMatch = line.match(/href\s*=$/);
    if (!hrefMatch) return [];

    // Generate route completions
    return cache.routes.map(r => {
        const rep = r.path.slice(1).replace(locale_str, '__')
        const insertText = r.isLocalized
            ? `{$localize\`/${rep}/\`}`
            : `"${r.path}/"`
        return {
            label: r.path,
            kind: CompletionItemKind.File,
            insertText
        } as CompletionItem;
    }) 
});

documents.onDidChangeContent(({ document }) => {
    const diagnostics = validateDocument(document);
    // console.log('Diagnostics:', diagnostics); // Debug output
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
});

connection.onRequest('textDocument/diagnostic', ({ textDocument }) => {
    const doc = documents.get(textDocument.uri);
    if (!doc) return [];
    const diagnostics = validateDocument(doc);
    // console.log('Requested Diagnostics:', diagnostics); // Debug output
    return {items: diagnostics};
});

// Handle workspace/diagnostic explicitly
connection.onRequest('workspace/diagnostic', () => {
    console.log('Received workspace/diagnostic request');
    return { items: [] }; // Return empty diagnostics for workspace
});


// Extensibility: Add dynamic route
export function addDynamicRoute(route: Route): void {
    config.dynamicRoutes.push(route);
    scanRoutesSetCache();
}


documents.listen(connection);
connection.listen();
