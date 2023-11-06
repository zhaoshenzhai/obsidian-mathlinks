/**
 * Inspired by & adapted from Dataview's inline fields rendering feature:
 * https://github.com/blacksmithgu/obsidian-dataview/blob/b00beb7596f9926ca9579c6f319341ceae4f5b5e/src/ui/views/inline-field-live-preview.ts
 * 
 * The original work is licensed under the MIT License:
 * 
 * MIT License
 * 
 * Copyright (c) 2021 Michael Brenan
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Keymap, editorInfoField, editorLivePreviewField, getLinkpath } from "obsidian";
import { Transaction, EditorState, RangeSet, RangeSetBuilder, RangeValue, StateEffect, StateEffectType, StateField, EditorSelection, Extension } from "@codemirror/state";
import {
    Decoration,
    DecorationSet,
    EditorView,
    PluginValue,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from "@codemirror/view";
import MathLinks from '../main';
import { syntaxTree } from "@codemirror/language";
import { getMathLink, setMathLink } from "./helper";
import { addSuperCharged } from "./supercharged";


function selectionAndRangeOverlap(selection: EditorSelection, rangeFrom: number, rangeTo: number): boolean {
    for (const range of selection.ranges) {
        if (range.from <= rangeTo && range.to >= rangeFrom) {
            return true;
        }
    }
    return false;
}

function hasEffect<T>(tr: Transaction, effectType: StateEffectType<T>): boolean {
    return tr.effects.some(effect => effect.is(effectType));
}

export const forceUpdateEffect = StateEffect.define<null>();

class MathLinkInfo extends RangeValue {
    constructor(public linkText: string, public mathLink: string) {
        super();
    }

    eq(other: MathLinkInfo): boolean {
        return this.linkText == other.linkText && this.mathLink == other.mathLink;
    }
}


export const createEditorExtensions = (plugin: MathLinks): Extension[] => {

    const buildField = (state: EditorState): RangeSet<MathLinkInfo> => {
        let builder = new RangeSetBuilder<MathLinkInfo>();
        const isSourceMode = !state.field(editorLivePreviewField);
        const file = state.field(editorInfoField).file;

        let start = -1, end = -1, outLinkText = "", outLinkMathLink = "";

        syntaxTree(state).iterate({
            enter(node) {
                let name = node.type.name;

                // Start
                if (name.contains("formatting-link_formatting-link-start")) {
                    if (isSourceMode) {
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
                        outLinkMathLink = getMathLink(plugin, outLinkText, file.path, isSourceMode);
                    }
                }

                // Alias: File name (with decoding)
                else if (/string_url$/.test(name) && !name.contains("format")) {
                    outLinkText += decodeURI(state.doc.sliceString(node.from, node.to));
                    if (file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                        outLinkMathLink = getMathLink(plugin, outLinkText, file.path, isSourceMode);
                    }
                }

                // No alias
                else if (file && name.contains("hmd-internal-link") && !name.contains("alias")) {
                    outLinkText += state.doc.sliceString(node.from, node.to);
                    outLinkMathLink = getMathLink(plugin, outLinkText, file.path, isSourceMode);
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

                        let cursorRange = state.selection.main;
                        if (start > cursorRange.to || end < cursorRange.from) {
                            if (outLinkText && outLinkMathLink) {
                                builder.add(
                                    start,
                                    end,
                                    new MathLinkInfo(outLinkText, outLinkMathLink.replace(/\\\$/, "$")),
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
                    outLinkMathLink += state.doc.sliceString(node.from, node.to);
                    if (file && outLinkMathLink == outLinkText.replace(/\.md/, "")) {
                        outLinkMathLink = getMathLink(plugin, outLinkText, file.path, isSourceMode);
                    }
                }
            }
        });

        return builder.finish();
    }


    /** A state field that stores links and their positions as a range set. */
    const mathLinkInfoField = StateField.define<RangeSet<MathLinkInfo>>({
        create: buildField,
        update(oldFields, tr) {
            return tr.docChanged || hasEffect(tr, forceUpdateEffect) ? buildField(tr.state) : oldFields;
        }
    });


    class MathWidget extends WidgetType {
        constructor(public outLinkText: string, public outLinkMathLink: string, public isSourceMode: boolean, public sourcePath: string) { super(); }

        eq(other: MathWidget) {
            return this.outLinkText == other.outLinkText && this.outLinkMathLink == other.outLinkMathLink && this.isSourceMode == other.isSourceMode && this.sourcePath == other.sourcePath;
        }

        toDOM() {
            let mathLink = createSpan();
            setMathLink(this.outLinkMathLink, mathLink);
            if (!this.isSourceMode) mathLink.addClass("cm-underline");
            mathLink.setAttribute("draggable", "true");

            const linkpath = getLinkpath(this.outLinkText);
            const targetFile = plugin.app.metadataCache.getFirstLinkpathDest(linkpath, this.sourcePath);
            if (targetFile) addSuperCharged(plugin, mathLink, targetFile);

            let mathLinkWrapper = createSpan();
            mathLinkWrapper.addClass("cm-hmd-internal-link");
            mathLinkWrapper.appendChild(mathLink);

            mathLinkWrapper.onclick = ((evt: MouseEvent) => {
                evt.preventDefault();
                if (targetFile) {
                    plugin.app.workspace.openLinkText(this.outLinkText, this.sourcePath, Keymap.isModEvent(evt));
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
                        plugin.app.workspace.openLinkText(this.outLinkText, this.sourcePath, true);
                    } else {
                        self.open(this.outLinkText, "_blank", "noreferrer");
                    }
                }
            });

            return mathLinkWrapper;
        }
    }

    const mathLinksViewPlugin = ViewPlugin.fromClass(
        class implements PluginValue {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            buildDecorations(view: EditorView): DecorationSet {
                // Disable in source mode if all the provider are disabled in source mode.
                if (!view.state.field(editorLivePreviewField) && !plugin.enableInSourceMode()) {
                    return Decoration.none;
                }

                const sourcePath = view.state.field(editorInfoField).file?.path ?? '';
                const isSourceMode = !view.state.field(editorLivePreviewField);
                const info = view.state.field(mathLinkInfoField);

                const builder = new RangeSetBuilder<Decoration>();
                const selection = view.state.selection;

                for (const { from, to } of view.visibleRanges) {
                    info.between(from, to, (start, end, { linkText, mathLink }) => {
                        // If the inline field is not overlapping with the cursor, we replace it with a widget.
                        if (!selectionAndRangeOverlap(selection, start, end)) {
                            builder.add(
                                start,
                                end,
                                Decoration.widget({
                                    widget: new MathWidget(linkText, mathLink, isSourceMode, sourcePath),
                                })
                            );
                        }
                    });
                }
                return builder.finish();
            }

            update(update: ViewUpdate) {
                // Disable in source mode if all the provider are disabled in source mode.
                if (!update.state.field(editorLivePreviewField) && !plugin.enableInSourceMode()) {
                    this.decorations = Decoration.none;
                }

                if (update.transactions.some(tr => hasEffect(tr, forceUpdateEffect))) {
                    this.decorations = this.buildDecorations(update.view);
                } else if (update.docChanged) {
                    this.decorations = this.decorations.map(update.changes);
                    this.updateDecorations(update.view);
                } else if (update.selectionSet) {
                    this.updateDecorations(update.view);
                } else if (update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            updateDecorations(view: EditorView) {
                const file = view.state.field(editorInfoField).file;
                const sourcePath = file?.path ?? '';
                const isSourceMode = !view.state.field(editorLivePreviewField);
                const info = view.state.field(mathLinkInfoField);
                const selection = view.state.selection;

                for (const { from, to } of view.visibleRanges) {
                    info.between(from, to, (start, end, value) => {
                        const overlap = selectionAndRangeOverlap(selection, start, end);
                        if (overlap) {
                            this.removeDeco(start, end);
                            return;
                        } else {
                            this.addDeco(start, end, value, isSourceMode, sourcePath);
                        }
                    });
                }
            }

            removeDeco(start: number, end: number) {
                this.decorations.between(start, end, (from, to) => {
                    this.decorations = this.decorations.update({
                        filterFrom: from,
                        filterTo: to,
                        filter: () => false,
                    });
                });
            }

            addDeco(start: number, end: number, value: MathLinkInfo, isSourceMode: boolean, sourcePath: string) {
                let exists = false;
                this.decorations.between(start, end, () => {
                    exists = true;
                });
                if (!exists) {
                    this.decorations = this.decorations.update({
                        add: [
                            {
                                from: start,
                                to: end,
                                value: Decoration.widget({
                                    widget: new MathWidget(value.linkText, value.mathLink, isSourceMode, sourcePath),
                                }),
                            },
                        ],
                    });
                }
            }
        },
        {
            decorations: instance => instance.decorations,
        }
    );

    return [mathLinkInfoField, mathLinksViewPlugin];
}
