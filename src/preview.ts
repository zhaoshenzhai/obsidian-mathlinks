import { App, Plugin } from 'obsidian';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, ViewUpdate, PluginValue, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { getMathLink, replaceWithMathLink } from './tools'

export function buildLivePreview(plugin: Plugin, app: App, leaf: WorkspaceLeaf)
{
    class MathWidget extends WidgetType {
        outLinkFileName: string;
        outLinkMathLink: string;

        constructor(outLinkFileName: string, outLinkMathLink: string) {
            super();
            this.outLinkFileName = outLinkFileName;
            this.outLinkMathLink = outLinkMathLink;
        }

        toDOM() {
            let mathLink = replaceWithMathLink(document.createElement("span"), this.outLinkMathLink);
            mathLink.classList.add("cm-underline");
            mathLink.setAttribute("draggable", true);

            let spanOuter = document.createElement("span");
            spanOuter.classList.add("cm-hmd-internal-link");
            spanOuter.appendChild(mathLink);

            spanOuter.onclick = (() => {
                app.workspace.openLinkText(this.outLinkFileName, this.outLinkFileName);
            });

            return spanOuter;
        }
    }

    const viewPlugin = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                let viewState = leaf.getViewState().state;
                if (viewState.mode == "source" && viewState.source == false) {
                    this.decorations = this.buildDecorations(update.view);
                } else {
                    this.decorations = this.destroyDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView) {
                const builder = new RangeSetBuilder<Decoration>();

                for (let { from, to } of view.visibleRanges) {
                    let start, end, outLinkFileName, outLinkMathLink;
                    syntaxTree(view.state).iterate({
                        from,
                        to,
                        enter(node) {
                            let name = node.type.name;
                            switch (name) {
                                // Start
                                case "formatting-link_formatting-link-start":
                                    start = node.from;
                                    break;
                                case "formatting_formatting-link_link":
                                    if (start == -1)
                                        start = node.from;
                                    break;

                                // No alias: Get outLinkFileName with its outLinkMathLink
                                case "hmd-internal-link":
                                    outLinkFileName = view.state.doc.sliceString(node.from, node.to);
                                    outLinkMathLink = getMathLink(plugin, app.metadataCache.getFirstLinkpathDest(outLinkFileName, ""));
                                    break;

                                // Alias: Add to outLinkFileName
                                case "hmd-internal-link_link-has-alias":
                                    outLinkFileName = view.state.doc.sliceString(node.from, node.to);
                                    break;
                                case "string_url":
                                    outLinkFileName = decodeURI(view.state.doc.sliceString(node.from, node.to));
                                    break;

                                // Alias: Get its outLinkMathLink
                                case "hmd-internal-link_link-alias":
                                case "formatting-escape_hmd-internal-link_link-alias":
                                case "link":
                                case "formatting-escape_hmd-escape-backslash_link":
                                case "escape_hmd-escape-char_link":
                                    outLinkMathLink += view.state.doc.sliceString(node.from, node.to);
                                    break;

                                // End
                                case "formatting_formatting-link-string_string_url":
                                case "formatting-link_formatting-link-end":
                                    if (!name.contains("end") && end == -1) {
                                        end = -2;
                                    } else {
                                        end = node.to;
                                        let cursorRange = view.state.selection.ranges[0];
                                        if (start > cursorRange.to || end < cursorRange.from) {
                                            if (outLinkFileName && outLinkMathLink) {
                                                builder.add(
                                                    start,
                                                    end,
                                                    Decoration.widget({
                                                        widget: new MathWidget(outLinkFileName, outLinkMathLink),
                                                    })
                                                );
                                            }
                                        }
                                        start = -1;
                                        end = -1;
                                        outLinkFileName = '';
                                        outLinkMathLink = '';
                                    }
                                    break;
                            }
                        }
                    });
                }

                return builder.finish();
            }

            destroyDecorations(view: EditorView) {
                const builder = new RangeSetBuilder<Decoration>();

                for (let { from, to } of view.visibleRanges) {
                    syntaxTree(view.state).iterate({from, to, enter(node) {}});
                }

                return builder.finish();
            }

        }, {decorations: v => v.decorations}
    );

    return viewPlugin;
}
