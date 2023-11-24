import { getLinkpath, Keymap, editorInfoField, editorLivePreviewField, finishRenderMath } from "obsidian";
import { Transaction, EditorSelection, RangeSetBuilder, Extension, StateEffectType } from "@codemirror/state";
import { Decoration, DecorationSet, ViewUpdate, EditorView, ViewPlugin, PluginValue, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { getMathLink, setMathLink } from "./helper";
import { addSuperCharged } from "./supercharged";
import { isExcluded } from "../utils";
import MathLinks from "../main";

/** 
 * Check if the given EditorSelection (from CodeMirror6, not Obsidian API) has an overlap with 
 * another range spanning from `rangeFrom` to `rangeTo`.
 */
function selectionAndRangeOverlap(selection: EditorSelection, rangeFrom: number, rangeTo: number): boolean {
    for (const range of selection.ranges) {
        if (range.from <= rangeTo && range.to >= rangeFrom) {
            return true;
        }
    }
    return false;
}

/** Check if the given transaction contains a certain type of state effect. */
function hasEffect<T>(tr: Transaction, effectType: StateEffectType<T>): boolean {
    return tr.effects.some(effect => effect.is(effectType));
}

/** Given a MathLinks plugin instance, create a CodeMirror6 view plugin that renders MathLink in links. */
export const createEditorExtensions = (plugin: MathLinks): Extension => {
    const { app, forceUpdateEffect } = plugin;

    class MathWidget extends WidgetType {
        /**
         * @param outLinkText the original link text, e.g. "note#^block" for [[note#^block]]
         * @param outLinkMathLink MathLink to be rendered and displayed. Provided by the registered providers.
         * @param isSourceMode Indicates the current mode is source mode or live preview.
         * @param sourcePath The path of the file associated with the current editor view. For Canvas, see the comment in tryBuildingDecorations.
         */
        constructor(public outLinkText: string, public outLinkMathLink: string, public isSourceMode: boolean, public sourcePath: string) {
            super();
        }

        eq(other: MathWidget) {
            // Needed to avoid redundant toDOM calls
            return this.outLinkText === other.outLinkText && this.outLinkMathLink === other.outLinkMathLink && this.isSourceMode == other.isSourceMode && this.sourcePath === other.sourcePath;
        }

        toDOM() {
            const mathLinkEl = createSpan();
            setMathLink(this.outLinkMathLink, mathLinkEl);
            if (!this.isSourceMode) mathLinkEl.addClass("cm-underline");
            mathLinkEl.setAttribute("draggable", "true");

            const linkpath = getLinkpath(this.outLinkText);
            const targetFile = app.metadataCache.getFirstLinkpathDest(linkpath, this.sourcePath);
            if (targetFile) addSuperCharged(plugin, mathLinkEl, targetFile);

            const mathLinkWrapper = createSpan();
            mathLinkWrapper.addClass("cm-hmd-internal-link");
            mathLinkWrapper.appendChild(mathLinkEl);

            mathLinkWrapper.onclick = ((evt: MouseEvent) => {
                evt.preventDefault();
                if (targetFile) {
                    app.workspace.openLinkText(this.outLinkText, this.sourcePath, Keymap.isModEvent(evt));
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
                        app.workspace.openLinkText(this.outLinkText, this.sourcePath, true);
                    } else {
                        self.open(this.outLinkText, "_blank", "noreferrer");
                    }
                }
            });

            return mathLinkWrapper;
        }
    }

    const viewPlugin = ViewPlugin.fromClass(
        class implements PluginValue {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.tryBuildingDecorations(view);
            }

            update(update: ViewUpdate) {
                const forceUpdate = update.transactions.some(tr => hasEffect(tr, forceUpdateEffect));
                if (forceUpdate || update.docChanged || update.viewportChanged || update.selectionSet) {
                    // update only if necessary
                    this.tryBuildingDecorations(update.view);
                }
            }

            /** 
             * Check if decorations should be created for the current editor view based on 
             * the associated file and the current mode (live preview/source mode), and if so, 
             * call buildDecorations. 
             */
            tryBuildingDecorations(view: EditorView): void {
                // Disable in source mode if all the provider are disabled in source mode.
                const isSourceMode = !view.state.field(editorLivePreviewField);
                if (isSourceMode && !plugin.enableInSourceMode()) {
                    this.decorations = Decoration.none;
                }

                // Remark: Canvas
                // - "add note from vault": file is the TFile of the note
                // - "add card": file is null
                const file = view.state.field(editorInfoField).file;

                if (!file || !isExcluded(plugin, file)) {
                    // - !file: true if this is a canvas card that is not an embed of an existing note ("add card")
                    // - !isExcluded: true if 
                    //     1. this is a canvas "add note from vault" card, or
                    //     2. this is a normal (non-canvas) markdown view
                    //   and the associated file is not excluded by the setting
                    this.decorations = this.buildDecorations(view);
                    finishRenderMath();
                } else {
                    this.decorations = Decoration.none;
                }
            }

            /** Actually create a decoration set to be provided to the editor view. */
            buildDecorations(view: EditorView): DecorationSet {
                const { state } = view;
                const isSourceMode = !state.field(editorLivePreviewField);
                const file = state.field(editorInfoField).file;
                const sourcePath = file?.path ?? '';

                const tree = syntaxTree(state);
                const builder = new RangeSetBuilder<Decoration>();

                for (let { from, to } of view.visibleRanges) { // only compute decorations inside visible ranges
                    let start = -1, end = -1, outLinkText = "", outLinkMathLink = "";

                    tree.iterate({
                        from,
                        to,
                        enter(node) {
                            const name = node.type.name;

                            // Start
                            if (name.contains("formatting-link_formatting-link-start")) {
                                if (isSourceMode) {
                                    // In source mode, the square brackets should not be hidden.
                                    if (state.sliceDoc(node.from, node.to) == "[[" && node.node.nextSibling) {
                                        start = node.node.nextSibling.from;
                                    } else {
                                        return;
                                    }
                                } else {
                                    start = node.from;
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
                                outLinkText += state.doc.sliceString(node.from, node.to);
                                if (file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, sourcePath, isSourceMode);
                                }
                            }

                            // Alias: File name (with decoding)
                            else if (/string_url$/.test(name) && !name.contains("format")) {
                                outLinkText += decodeURI(state.doc.sliceString(node.from, node.to));
                                if (file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, sourcePath, isSourceMode);
                                }
                            }

                            // No alias
                            else if (name.contains("hmd-internal-link") && !name.contains("alias")) {
                                outLinkText += state.doc.sliceString(node.from, node.to);
                                outLinkMathLink = getMathLink(plugin, outLinkText, sourcePath, isSourceMode);
                            }

                            // End
                            else if (name.contains("formatting-link-end") || name.contains("formatting-link-string")) {
                                if (!name.contains("end") && end == -1) {
                                    end = -2;
                                } else {
                                    if (isSourceMode) {
                                        if (node.node.prevSibling && state.sliceDoc(node.from, node.to) == "]]") {
                                            end = node.node.prevSibling.to;
                                        } else {
                                            return;
                                        }
                                    } else {
                                        end = node.to;
                                    }

                                    if (!selectionAndRangeOverlap(state.selection, start, end) && outLinkText && outLinkMathLink) {
                                        builder.add(
                                            start,
                                            end,
                                            Decoration.widget({
                                                widget: new MathWidget(outLinkText, outLinkMathLink.replace(/\\\$/, "$"), isSourceMode, sourcePath),
                                            })
                                        );
                                    }

                                    start = -1;
                                    end = -1;
                                    outLinkText = "";
                                    outLinkMathLink = "";
                                }
                            }

                            // Alias: MathLink
                            else if (!name.contains("pipe") && ((name.contains("hmd-internal-link") && name.contains("alias")) || (name.contains("hmd-escape") && name.contains("link")) || /^link/.test(name))) {
                                outLinkMathLink += state.doc.sliceString(node.from, node.to);
                                if (file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                                    outLinkMathLink = getMathLink(plugin, outLinkText, file.path, isSourceMode);
                                }
                            }
                        }
                    });
                }

                return builder.finish();
            }
        }, { decorations: v => v.decorations }
    );

    return viewPlugin;
}
