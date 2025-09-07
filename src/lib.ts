// qwik-routes-lsp.ts
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

export interface Route {
  path: string;
  isLocalized: boolean;
}


export const config = {
    rootPath: '',
    dynamicRoutes: [] as Route[],
}

export const cache = {
    routes: [] as Route[],
    routes_normalized: new Set() as Set<string>
}

export const locale_str = '[...locale]'

export const normalize_route_path = (s: string) => s.replace(locale_str, '__').replace(/\[[^\]]+\]/g,'[]').replace(/\[[^]]+\]/,'[]').replace(/\/$/, '')
export const normalize_route_link = (s: string) => s                             .replace(/\[[^\]]+\]/g,'[]').replace(/\$\{[^\}]*\}/, '[]').replace(/\/$/, '')

export function scanRoutesSetCache(){
    const routes = scanRoutes()
    cache.routes = routes
    cache.routes_normalized = new Set(routes.map((x) => normalize_route_path(x.path)))
}

export const routesDir = () => path.join(config.rootPath, 'src', 'routes');
export const componentsDir = () => path.join(config.rootPath, 'src', 'components');

export function validateDocument(doc: TextDocument): Diagnostic[] {
    const text = doc.getText();
    const diagnostics: Diagnostic[] = [];

    const match_all = (regex: RegExp, cb: (match: RegExpExecArray, add_error: (msg: string) => void) => void) => {
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text))) {
            const s = match[1]
            const add_error = (msg: string) => {
                const start = doc.positionAt(match!.index + match![0].indexOf(s));
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: { start, end: { line: start.line, character: start.character + s.length } },
                    message: msg,
                    source: 'qwik-routes',
                });
            }
            cb(match, add_error)
        }
    }

    const find_ref = (ref: string) => {
        if (cache.routes_normalized.has(ref)) return true;
        if (fs.existsSync(path.join('public', ref))) return true;
        return false;
    }

    match_all(/href\s*=\s*["']([^"']+)["']/g,
        (m, err) => {
            const  ref = m[1].trim()
            // console.log(`found ${ref} on ${m[0]}}`)
            if (ref.startsWith("http")) return 
            const refn = normalize_route_link(ref)
            if (!find_ref(refn)) {
                err(`bad ref ${ref} 2`)
            }
        }
    )

    match_all(/href\s*=\s*{\$localize\`([^`]+)\`}/g,
        (m, err) => {
            const ref = m[1]
            const refn = normalize_route_link(ref)
            // console.log(`found ${ref} on ${m[0]}`)
            if (!find_ref(refn)) {
                err(`bad ref ${ref}, normalized=${refn}`)
            }
        }
    )

    return diagnostics
}

export function scanRoutes() {
  const rD = routesDir()
  if (!fs.existsSync(rD)) return [];
  console.log(`rD ${rD}`)
  const files = glob.sync(`${rD}/**/*.{tsx,jsx}`, { nodir: true })
  return files
    .filter(f => !['layout'].includes(path.basename(f)))
    .map(f => {
      let rel = path.relative(rD, f);
      const isLocalized = rel.includes(locale_str);
      rel = rel.replace(/\/index\.(tsx|jsx)$/, '/').replace(/\.(tsx|jsx)$/, '/').replace(/\/$/, '');
      if (isLocalized) rel = rel.replace('[locale]/', '');
      return { path: `/${rel}`, isLocalized };
    })
    .concat(config.dynamicRoutes); // Add dynamic routes
}
