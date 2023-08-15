import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, ViewUpdate, EditorView, ViewPlugin, WidgetType, PluginValue } from "@codemirror/view";
import { FileView, MarkdownView, WorkspaceLeaf, TFile } from "obsidian";
import { getMathLink, setMathLink } from "./links";
import { addSuperCharged } from "./supercharged";
import { isValid } from "./utils";
import MathLinks from "./main";

export function buildLivePreview<V extends PluginValue>(plugin: MathLinks, leaf: WorkspaceLeaf): Promise<ViewPlugin<V>>
{    
    let leafView = leaf.view as FileView;

    class MathWidget extends WidgetType {
        outLinkText: string;
        outLinkMathLink: string;

        constructor(outLinkText: string, outLinkMathLink: string) {
            super();
            this.outLinkText = outLinkText;
            this.outLinkMathLink = outLinkMathLink;
        }

        toDOM() {
            let mathLink = document.createElement("span");
            setMathLink(this.outLinkMathLink, mathLink);
            mathLink.classList.add("cm-underline");
            mathLink.setAttribute("draggable", "true");

            let outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(this.outLinkText.replace(/#.*$/, ""), "");
            if (outLinkFile) addSuperCharged(plugin, mathLink, outLinkFile);

            let mathLinkWrapper = document.createElement("span");
            mathLinkWrapper.classList.add("cm-hmd-internal-link");
            mathLinkWrapper.appendChild(mathLink);

            let outLinkFileName = this.outLinkText.replace(/#.*$/, "");
            if (!outLinkFileName) {
                if (leafView.file) {
                    outLinkFileName = leafView.file.path;
                    if (outLinkFileName.endsWith(".canvas")) {
                        for (let node of leafView.canvas.selection.values()) {
                            outLinkFileName = node.filePath;
                            break;
                        }
                    }    
                }
            }

            mathLinkWrapper.onclick = ((evt: MouseEvent) => {
                evt.preventDefault();
                plugin.app.workspace.openLinkText(this.outLinkText, outLinkFileName, evt.ctrlKey || evt.metaKey);
            });

            mathLinkWrapper.onmousedown = ((evt: MouseEvent) => {
                if (evt.button == 1) {
                    evt.preventDefault();
                }
            });

            mathLinkWrapper.onauxclick = ((evt: MouseEvent) => {
                if (evt.button == 1) {
                    plugin.app.workspace.openLinkText(this.outLinkText, outLinkFileName, true);
                }
            });

            return mathLinkWrapper;
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

                if (leaf.view instanceof MarkdownView && leaf.view.file instanceof TFile && isValid(plugin, leaf.view.file.name)) {
                    let curView = leaf.view.editor.cm;
                    if (curView == view && editorView.state.mode == "source" && !editorView.state.source) {
                        this.decorations = this.buildDecorations(view);
                    } else {
                        this.decorations = this.destroyDecorations(view);
                    }
                } else if (leafView.canvas) {
                    for (let node of leafView.canvas.selection.values()) {
                        if (isValid(plugin, node.filePath)) {
                            this.decorations = this.buildDecorations(view);
                        }
                    }

                    plugin.app.workspace.iterateRootLeaves((otherLeaf: WorkspaceLeaf) => {
                        if (otherLeaf.view instanceof MarkdownView) {
                            let otherView = otherLeaf.view.editor.cm;
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
                    let start = -1, end = -1, outLinkText = "", outLinkMathLink = "";

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
                                outLinkText += view.state.doc.sliceString(node.from, node.to);
                                if (leafView.file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, leafView.file.path);
                                }
                            }

                            // Alias: File name (with decoding)
                            else if (/string_url$/.test(name) && !name.contains("format")) {
                                outLinkText += decodeURI(view.state.doc.sliceString(node.from, node.to));
                                if (leafView.file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, leafView.file.path);
                                }
                            }

                            // No alias
                            else if (leafView.file && name.contains("hmd-internal-link") && !name.contains("alias")) {
                                outLinkText += view.state.doc.sliceString(node.from, node.to);
                                outLinkMathLink = getMathLink(plugin, outLinkText, leafView.file.path);
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
                                                    widget: new MathWidget(outLinkText, outLinkMathLink.replace(/\\\$/, "$")),
                                                })
                                            );
                                        }
                                    }
                                    start = -1;
                                    end = -1;
                                    outLinkText = "";
                                    outLinkMathLink = "";
                                }
                            }

                            // Alias: MathLink
                            else if (!name.contains("pipe") && ((name.contains("hmd-internal-link") && name.contains("alias")) || name.contains("hmd-escape") || /^link/.test(name))) {
                                outLinkMathLink += view.state.doc.sliceString(node.from, node.to);
                                if (leafView.file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, leafView.file.path);
                                }
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

    return new Promise<ViewPlugin<V>> ((resolve) => {resolve(viewPlugin)});
}
