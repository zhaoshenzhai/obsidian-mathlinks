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
                    syntaxTree(view.state).iterate({
                        from,
                        to,
                        enter(node) {
                            if (node.type.name.contains("internal-link")) {
                                let start = node.from - 2;
                                let end = node.to + 2;

                                let cursorRange = view.state.selection.ranges[0];
                                if (start > cursorRange.to || end < cursorRange.from) {
                                    let outLink = view.state.doc.sliceString(start, end);
                                    let outLinkFileName = outLink.replace('[[', '').replace(']]', '');
                                    let outLinkFile = app.metadataCache.getFirstLinkpathDest(outLinkFileName, "");
                                    let outLinkMathLink = getMathLink(plugin, outLinkFile);
                                    if (outLinkMathLink) {
                                        builder.add(
                                            start,
                                            end,
                                            Decoration.widget({
                                                widget: new MathWidget(outLinkFileName, outLinkMathLink),
                                            })
                                        );
                                    }
                                }
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
