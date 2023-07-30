import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, ViewUpdate, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import { getMathLink, addMathLink, getSuperCharged } from "./tools"

export function buildLivePreview(plugin: MathLinks, leaf: WorkspaceLeaf): Promise<ViewPlugin>
{
    class MathWidget extends WidgetType {
        outLinkText: string;
        outLinkFile: TFile;
        outLinkMathLink: string;

        constructor(outLinkText: string, outLinkFile: TFile, outLinkMathLink: string) {
            super();
            this.outLinkText = outLinkText;
            this.outLinkFile = outLinkFile,
            this.outLinkMathLink = outLinkMathLink;
        }

        toDOM() {
            let mathLink = addMathLink(document.createElement("span"), this.outLinkMathLink, false);
            mathLink.classList.add("cm-underline");
            mathLink.setAttribute("draggable", true);

            let spanInner = document.createElement("span");
            spanInner.appendChild(mathLink);
            if (this.outLinkFile && app.plugins.getPlugin("supercharged-links-obsidian") != null) {
                let superCharged = getSuperCharged(plugin, this.outLinkFile);
                spanInner.classList.add("data-link-icon");
                spanInner.classList.add("data-link-icon-after");
                spanInner.classList.add("data-link-text");
                spanInner.setAttribute("data-link-path", this.outLinkFile.path);
                spanInner.setAttribute("data-link-tags", superCharged[0]);
                for (let i = 0; i < superCharged[1].length; i++)
                    spanInner.setAttribute("data-link-" + superCharged[1][i][0], superCharged[1][i][1]);
            }

            let spanOuter = document.createElement("span");
            spanOuter.classList.add("cm-hmd-internal-link");
            spanOuter.appendChild(spanInner);

            let outLinkFileName = this.outLinkText.replace(/#.*$/, "");
            if (!outLinkFileName) {
                outLinkFileName = leaf.view.file.path;
                if (outLinkFileName == "Canvas.canvas") {
                    for (let node of leaf.view.canvas.selection.values()) {
                        outLinkFileName = node.filePath;
                        break;
                    }
                }
            }

            spanOuter.onclick = ((evt: MouseEvent) => {
                evt.preventDefault();
                plugin.app.workspace.openLinkText(this.outLinkText, outLinkFileName, evt.ctrlKey || evt.metaKey);
            });

            spanOuter.onmousedown = ((evt: MouseEvent) => {
                if (evt.button == 1) {
                    evt.preventDefault();
                }
            });

            spanOuter.onauxclick = ((evt: MouseEvent) => {
                if (evt.button == 1) {
                    plugin.app.workspace.openLinkText(this.outLinkText, outLinkFileName, true);
                }
            });

            return spanOuter;
        }
    }

    let viewPlugin = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.tryBuildingDecorations(view);
            }

            update(update: ViewUpdate) {
                this.tryBuildingDecorations(update.view);
            }

            tryBuildingDecorations(view: EditorView) {
                this.decorations = this.destroyDecorations(view);
                let editorView = leaf.getViewState();

                if (leaf.view.editor) {
                    let curView = leaf.view.editor.cm as EditorView;
                    if (curView == view && editorView.state.mode == "source" && !editorView.state.source) {
                        this.decorations = this.buildDecorations(view);
                    } else {
                        this.decorations = this.destroyDecorations(view);
                    }
                } else if (leaf.view.canvas) {
                    this.decorations = this.buildDecorations(view);

                    plugin.app.workspace.iterateRootLeaves((otherLeaf: WorkspaceLeaf) => {
                        if (otherLeaf.view.editor) {
                            let otherView = otherLeaf.view.editor.cm as EditorView;
                            if (otherView == view) {
                                this.decorations = this.destroyDecorations(view);
                            }
                        }
                    });
                }
            }

            buildDecorations(view: EditorView) {
                let builder = new RangeSetBuilder<Decoration>();

                for (let { from, to } of view.visibleRanges) {
                    let start = -1, end = -1, outLinkText = "", outLinkFile = null, outLinkMathLink = "";

                    syntaxTree(view.state).iterate({
                        from,
                        to,
                        enter(node) {
                            let name = node.type.name;
                            // Start
                            if (name.contains("formatting-link_formatting-link-start")) {
                                start = node.from;
                            }

                            // Start (check that it is not end)
                            else if (name.contains("formatting_formatting-link_link")) {
                                if (start == -1) start = node.from;
                            }

                            // Alias: File name
                            else if (name.contains("has-alias")) {
                                outLinkText = view.state.doc.sliceString(node.from, node.to);
                                outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(outLinkText.replace(/#.*$/, ""), "");
                            }

                            // Alias: File name (with decoding)
                            else if (/string_url$/.test(name) && !name.contains("format")) {
                                outLinkText = decodeURI(view.state.doc.sliceString(node.from, node.to));
                                outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(outLinkText.replace(/#.*$/, ""), "");
                            }

                            // No alias
                            else if (name.contains("hmd-internal-link") && !name.contains("alias")) {
                                outLinkText = view.state.doc.sliceString(node.from, node.to);
                                outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(outLinkText.replace(/#.*$/, ""), "");
                                outLinkMathLink = getMathLink(plugin, outLinkFile);
                                if (outLinkText.replace(/#.*$/, "") != outLinkText) {
                                    outLinkMathLink += outLinkText.replace(/^.*#/, " > ")
                                }
                            }

                            // End
                            else if (name.contains("formatting-link-end") || name.contains("formatting-link-string")) {
                                if (!name.contains("end") && end == -1) {
                                    end = -2;
                                } else {
                                    end = node.to;

                                    let cursorRange = view.state.selection.ranges[0];
                                    if (start > cursorRange.to || end < cursorRange.from) {
                                        if (outLinkText && outLinkMathLink) {
                                            builder.add(
                                                start,
                                                end,
                                                Decoration.widget({
                                                    widget: new MathWidget(outLinkText, outLinkFile, outLinkMathLink.replace(/\\\$/, "$")),
                                                })
                                            );
                                        }
                                    }
                                    start = -1;
                                    end = -1;
                                    outLinkText = "";
                                    outLinkFile = null;
                                    outLinkMathLink = "";
                                }
                            }

                            // Alias: MathLink
                            else if (!name.contains("pipe") && ((name.contains("hmd-internal-link") && name.contains("alias")) || name.contains("hmd-escape") || /^link/.test(name))) {
                                outLinkMathLink += view.state.doc.sliceString(node.from, node.to);
                            }
                        }
                    });
                }

                return builder.finish();
            }

            destroyDecorations(view: EditorView) {
                let builder = new RangeSetBuilder<Decoration>();

                for (let { from, to } of view.visibleRanges) {
                    syntaxTree(view.state).iterate({from, to, enter(node) {}});
                }

                return builder.finish();
            }
        }, {decorations: v => v.decorations}
    );

    return new Promise<ViewPlugin> ((resolve) => {resolve(viewPlugin)});
}
