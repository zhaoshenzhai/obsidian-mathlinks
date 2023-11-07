import { EditorView } from "@codemirror/view";
import MathLinks from "./main";

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

        on(
            name: "mathlinks:update",
            callback: (file: TFile) => any
        ): EventRef;

        on(
            name: "mathlinks:update-all",
            callback: () => any
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
