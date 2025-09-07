// qwik-routes-lsp.ts
import { createConnection, ProposedFeatures, TextDocuments, CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { cache, config, Route, scanRoutes, scanRoutesSetCache, validateDocument } from './lib';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params) => {
  config.rootPath = params.rootPath || '';
  scanRoutesSetCache();
  return {
    capabilities: {
      completionProvider: { resolveProvider: false },
      diagnosticProvider: { interFileDependencies: false, workspaceDiagnostics: false },
    },
  };
});

connection.onDidChangeWatchedFiles(() => scanRoutesSetCache());

connection.onCompletion(({ textDocument, position }) => {
  const doc = documents.get(textDocument.uri);
  if (!doc) return [];

  const line = doc.getText({ start: { line: position.line, character: 0 }, end: { line: position.line, character: Infinity } });
  if (!line.includes('href=')) return [];

  return cache.routes.map(r => ({
    label: r.isLocalized ? `{$localize\`/__/${r.path.slice(1)}/\`}` : `${r.path}/`,
    kind: CompletionItemKind.File,
  }) as CompletionItem);
});

documents.onDidChangeContent(({ document }) => {
  const diagnostics = validateDocument(document);
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
});

// Extensibility: Add dynamic route
export function addDynamicRoute(route: Route): void {
  config.dynamicRoutes.push(route);
  scanRoutesSetCache();
}

documents.listen(connection);
connection.listen();
