import _ from "lodash";
import { TextDocument } from 'vscode-languageserver-textdocument';
import fs from "node:fs";
import {glob} from "glob";
import { simple_actions2_shellsetup } from "u-simple-actions2/setup_simple_action2";
import { action, merge, record, run_with_completion_and_help} from "u-simple-actions2/biased";
import {tqdm} from "tqdm"
import { cache, componentsDir, config, routesDir, scanRoutes, scanRoutesSetCache, validateDocument } from "./lib";

const main = async () => {

    const sa2 = merge([

        record<any, any>({
            'shellsetup': simple_actions2_shellsetup(),

            'find-routes':  action("find and list all routes which are used in completion", () => {
                console.dir(scanRoutes(), {depth: null});
            }),

            'check_files':  action("check files", () => {
                const files = [
                    ...glob.sync(`${routesDir()}/**/*.{tsx,jsx}`, { nodir: true }),
                    ...glob.sync(`${componentsDir()}/**/*.{tsx,jsx}`, { nodir: true })
                ]
                scanRoutesSetCache()
                for (const file of tqdm(files)) {
                    const text = fs.readFileSync(file, 'utf8')
                    const doc = TextDocument.create('file:///', 'html', 1, text);
                    const diagnostics = validateDocument(doc)
                    console.log(`FILE ${file}`);
                    for (const diag of diagnostics){
                        console.log(`${file}:${diag.range.start.line}:${diag.range.start.character}: ${diag.message}`);
                    }
                }

                console.dir(cache.routes_normalized, {depth: null});
            })

        }),

    ])

    const z = await run_with_completion_and_help(sa2, {}, {})
    console.log(z);
}

main()
// main().catch((e) => {
//     console.log("== ERROR uncaught exception  ==");
//     console.log(e);
//     console.log(e.toString());
//     process.exit(1)
// })
