import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, ViewUpdate, EditorView, ViewPlugin, WidgetType, PluginValue } from "@codemirror/view";
import { FileView, MarkdownView, WorkspaceLeaf, TFile, getLinkpath, Keymap, editorLivePreviewField } from "obsidian";
import { getMathLink, setMathLink } from "./helper";
import { addSuperCharged } from "./supercharged";
import { isExcluded } from "../utils";
import MathLinks from "../main";

export function buildLivePreview<V extends PluginValue>(plugin: MathLinks, leaf: WorkspaceLeaf): Promise<ViewPlugin<V>> {
    let leafView = leaf.view as FileView;

    class MathWidget extends WidgetType {
        constructor(public outLinkText: string, public outLinkMathLink: string, public isSourceMode?: boolean) { super(); }

        toDOM() {
            let mathLink = document.createElement("span");
            setMathLink(this.outLinkMathLink, mathLink);
            if (!this.isSourceMode) mathLink.classList.add("cm-underline");
            mathLink.setAttribute("draggable", "true");

            let outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(this.outLinkText.replace(/#.*$/, ""), "");
            if (outLinkFile) addSuperCharged(plugin, mathLink, outLinkFile);

            let mathLinkWrapper = document.createElement("span");
            mathLinkWrapper.classList.add("cm-hmd-internal-link");
            mathLinkWrapper.appendChild(mathLink);

            let sourcePath = "";
            if (leafView.file) {
                sourcePath = leafView.file.path;
                if (sourcePath.endsWith(".canvas")) {
                    for (let node of leafView.canvas.selection.values()) {
                        sourcePath = node.filePath;
                        break;
                    }
                }
            }

            const targetFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(this.outLinkText), sourcePath);

            mathLinkWrapper.onclick = ((evt: MouseEvent) => {
                evt.preventDefault();
                if (targetFile) {
                    plugin.app.workspace.openLinkText(this.outLinkText, sourcePath, Keymap.isModEvent(evt));
                } else {
                    self.open(this.outLinkText, "_blank", "noreferrer");
                }
            });

            mathLinkWrapper.onmousedown = ((evt: MouseEvent) => {
                if (evt.button == 1) {
                    evt.preventDefault();
                }
            });

            mathLinkWrapper.onauxclick = ((evt: MouseEvent) => {
                if (evt.button == 1) {
                    if (targetFile) {
                        plugin.app.workspace.openLinkText(this.outLinkText, sourcePath, true);
                    } else {
                        self.open(this.outLinkText, "_blank", "noreferrer");
                    }
                }
            });

            return mathLinkWrapper;
        }
    }

    let viewPlugin = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                leafView = leaf.view as FileView;
                this.tryBuildingDecorations(view);
            }

            update(update: ViewUpdate) {
                this.tryBuildingDecorations(update.view);
            }

            tryBuildingDecorations(view: EditorView) {
                this.decorations = Decoration.none;

                let editorView = leaf.getViewState();

                if (leaf.view instanceof MarkdownView && leaf.view.file instanceof TFile && isExcluded(plugin, leaf.view.file)) {
                    let curView = leaf.view.editor.cm;
                    if (curView == view && editorView.state.mode == "source" && (!editorView.state.source || plugin.enableInSourceMode())) {
                        this.decorations = this.buildDecorations(view);
                    } else {
                        this.decorations = Decoration.none;
                    }
                } else if (leafView.canvas) {
                    for (let node of leafView.canvas.selection.values()) {
                        if (isExcluded(plugin, node.file)) {
                            this.decorations = this.buildDecorations(view);
                        }
                    }

                    plugin.app.workspace.iterateRootLeaves((otherLeaf: WorkspaceLeaf) => {
                        if (otherLeaf.view instanceof MarkdownView) {
                            let otherView = otherLeaf.view.editor.cm;
                            if (otherView == view) {
                                this.decorations = Decoration.none;
                            }
                        }
                    });
                }
            }

            buildDecorations(view: EditorView) {
                let builder = new RangeSetBuilder<Decoration>();
                const isSourceMode = !view.state.field(editorLivePreviewField);

                for (let { from, to } of view.visibleRanges) {
                    let start = -1, end = -1, outLinkText = "", outLinkMathLink = "";

                    syntaxTree(view.state).iterate({
                        from,
                        to,
                        enter(node) {
                            let name = node.type.name;

                            console.log(
                                `"${view.state.sliceDoc(node.from, node.to)}" (${node.name}): ${node.from}-${node.to}`,
                            );
                            // Start
                            if (name.contains("formatting-link_formatting-link-start")) {
                                if (view.state.sliceDoc(node.from, node.to) == "[[" && node.node.nextSibling) {
                                    start = node.node.nextSibling.from;
                                    // start = node.from;
                                } else {
                                    return;
                                }
                            }

                            // Start (check that it is not end)
                            else if (name.contains("formatting_formatting-link_link")) {
                                if (start == -1) {
                                    start = node.from;
                                }
                            }

                            // Alias: File name
                            else if (name.contains("has-alias")) {
                                outLinkText += view.state.doc.sliceString(node.from, node.to);
                                if (leafView.file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, leafView.file.path, isSourceMode);
                                }
                            }

                            // Alias: File name (with decoding)
                            else if (/string_url$/.test(name) && !name.contains("format")) {
                                outLinkText += decodeURI(view.state.doc.sliceString(node.from, node.to));
                                if (leafView.file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, leafView.file.path, isSourceMode);
                                }
                            }

                            // No alias
                            else if (leafView.file && name.contains("hmd-internal-link") && !name.contains("alias")) {
                                outLinkText += view.state.doc.sliceString(node.from, node.to);
                                outLinkMathLink = getMathLink(plugin, outLinkText, leafView.file.path, isSourceMode);
                            }

                            // End
                            else if (name.contains("formatting-link-end") || name.contains("formatting-link-string")) {
                                if (!name.contains("end") && end == -1) {
                                    end = -2;
                                } else if (node.node.prevSibling && (!isSourceMode || view.state.sliceDoc(node.from, node.to) == "]]")) {
                                    // end = node.to;
                                    end = node.node.prevSibling.to;

                                    let cursorRange = view.state.selection.main;
                                    if (start > cursorRange.to || end < cursorRange.from) {
                                        if (outLinkText && outLinkMathLink) {
                                            builder.add(
                                                start,
                                                end,
                                                Decoration.widget({
                                                    widget: new MathWidget(outLinkText, outLinkMathLink.replace(/\\\$/, "$"), isSourceMode),
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
                            else if (!name.contains("pipe") && ((name.contains("hmd-internal-link") && name.contains("alias")) || (name.contains("hmd-escape") && name.contains("link")) || /^link/.test(name))) {
                                outLinkMathLink += view.state.doc.sliceString(node.from, node.to);
                                if (leafView.file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, leafView.file.path, isSourceMode);
                                }
                            }
                        }
                    });
                }

                return builder.finish();
            }
        }, { decorations: v => v.decorations }
    );

    return new Promise<ViewPlugin<V>>((resolve) => { resolve(viewPlugin) });
}
