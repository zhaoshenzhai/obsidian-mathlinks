import { App } from "obsidian";
import MathLinks from "./main";

// Reference: https://gist.github.com/aidenlx/6067c943fbec8ead230f2b163bfd3bc8#file-api-d-ts-L25
declare module "obsidian" {
    interface App {
        plugins: {
            enabledPlugins: Set<string>;
            plugins: {
                [id: string]: any;
                ["supercharged-links-obsidian"]?: {
                    settings: SuperchargedLinksSettings;
                };
                ["mathlinks"]?: MathLinks;
            };
        };
    }
}

// // An alternative way
// // https://github.com/eth-p/obsidian-callout-manager/blob/master/api/index.ts
// type ObsidianAppWithPlugins = App & {
//     plugins: {
//         enabledPlugins: Set<string>;
//         plugins: {
//             [id: string]: any;
//             ["supercharged-links-obsidian"]?: {
//                 settings: SuperchargedLinksSettings;
//             };
//             ["mathlinks"]?: MathLinks;
//         };
//     };
// }

// Type definitions for Supercharged Links

type SelectorTypes = 'attribute' | 'tag' | 'path';

interface CSSLink {
    type: SelectorTypes
    name: string
    value: string
}

interface SuperchargedLinksSettings {
    targetTags: boolean;
    selectors: CSSLink[];
}
