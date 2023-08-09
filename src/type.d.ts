import { EditorView } from "@codemirror/view";
import MathLinks from "./main";
import { MathLinksAPIAccount, MathLinksMetadata } from "./api";

// Reference: 
// https://gist.github.com/aidenlx/6067c943fbec8ead230f2b163bfd3bc8#file-api-d-ts-L25
// https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/typings/obsidian-ex.d.ts
// https://github.com/eth-p/obsidian-callout-manager/blob/fb8699a9f5e3bfaa0bcedd02411ea9748004e0fb/api/index.ts#L9
// https://github.com/mdelobelle/obsidian_supercharged_links/blob/master/types.d.ts
// https://github.com/aidenlx/folder-note-core/blob/master/src/typings/obsidian-ex.d.ts
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

    interface FileView {
        canvas?: any;
    }

    interface Editor {
        cm?: EditorView;
    }

    interface MetadataCache {
        /** Custom events */

        // triggered when an API user updates its MathLinks metadata
        on(
            name: "mathlinks:updated",
            callback: (apiAccount: MathLinksAPIAccount, path: string) => any
        ): EventRef;

        // triggered when an API account is deleted: type == "account-deleted"
        on(
            name: "mathlinks:account-deleted",
            callback: (apiAccount: MathLinksAPIAccount) => any
        ): EventRef;
    }
}

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
