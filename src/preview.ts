import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, ViewUpdate, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import { getMathLink, addMathLink } from "./tools"
import { Input } from "./input"

export function buildLivePreview(plugin: MathLinks, leaf: WorkspaceLeaf): Promise<ViewPlugin>
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
            let mathLink = addMathLink(document.createElement("span"), this.outLinkMathLink, false);
            mathLink.classList.add("cm-underline");
            mathLink.setAttribute("draggable", true);

            let spanOuter = document.createElement("span");
            spanOuter.classList.add("cm-hmd-internal-link");
            spanOuter.appendChild(mathLink);

            spanOuter.onclick = (() => {
                plugin.app.workspace.openLinkText(this.outLinkFileName, this.outLinkFileName, Input.ctrlKey || Input.mouseMiddle);
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
                this.decorations = this.buildDecorations(view);
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

                    let nodes = [...(leaf.view.canvas.nodes).values()];
                    for (let i = 0; i < nodes.length; i++) {
                        let canvasFrame = nodes[i].nodeEl.querySelector(".embed-iframe");
                        if (canvasFrame && canvasFrame.contentDocument.querySelector(".cm-editor")) {
                            let element = canvasFrame.contentDocument.querySelector(".cm-editor");
                            if (!element.getAttribute("ctrlListener")) {
                                element.setAttribute("ctrlListener", true);
                                Input.addCtrlListener(element);
                                break;
                            }
                            if (!element.getAttribute("mouseMiddleListener")) {
                                element.setAttribute("mouseMiddleListener", true);
                                Input.addMouseMiddleListener(element);
                                break;
                            }
                        }
                    }

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
                    let start = -1, end = -1, outLinkFileName = "", outLinkMathLink = "";

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
                                outLinkFileName = view.state.doc.sliceString(node.from, node.to);
                            }

                            // Alias: File name (with decoding)
                            else if (/string_url$/.test(name) && !name.contains("format")) {
                                outLinkFileName = decodeURI(view.state.doc.sliceString(node.from, node.to));
                            }

                            // No alias
                            else if (name.contains("hmd-internal-link") && !name.contains("alias")) {
                                outLinkFileName = view.state.doc.sliceString(node.from, node.to);
                                outLinkMathLink = getMathLink(plugin, plugin.app.metadataCache.getFirstLinkpathDest(outLinkFileName, ""));
                            }

                            // End
                            else if (name.contains("formatting-link-end") || name.contains("formatting-link-string")) {
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
                                                    widget: new MathWidget(outLinkFileName, outLinkMathLink.replace(/\\\$/, "$")),
                                                })
                                            );
                                        }
                                    }
                                    start = -1;
                                    end = -1;
                                    outLinkFileName = "";
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
