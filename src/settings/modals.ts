import { Setting, Modal, Notice, TFile, TAbstractFile, TFolder, FuzzySuggestModal, App } from "obsidian";
import { TextComponent, ExtraButtonComponent } from "obsidian";
import { Template } from "./settings";
import { isEqualToOrChildOf } from "../utils";
import MathLinks from "../main"

export class TemplatesModal extends Modal {
    constructor(app: App, public plugin: MathLinks) {
        super(app);
    }

    onOpen() {
        this.display();
    }

    // Credits to RyotaUshio/obsidian-math-booster
    async display() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h4", { text: "Add/Edit Templates" });

        new Setting(contentEl)
            .setName(
                createFragment((e) => {
                    e.createSpan({ text: "The templates in the list below are sorted by precedence, with the top being replaced first. Note that " });
                    e.createEl("code", { text: "a" });
                    e.createSpan({ text: " > " });
                    e.createEl("code", { text: "b" });
                    e.createSpan({ text: " followed by " });
                    e.createEl("code", { text: "b" });
                    e.createSpan({ text: " > " });
                    e.createEl("code", { text: "c" });
                    e.createSpan({ text: " together is equivalent to " });
                    e.createEl("code", { text: "a" });
                    e.createSpan({ text: " > " });
                    e.createEl("code", { text: "c" });
                    e.createSpan({ text: ", but not the other way around." });
                })
            )
            .addButton((btn) => {
                btn.setTooltip("Add").setIcon("plus")
                    .onClick((event) => {
                        let newTemplate: Template = { replaced: "", replacement: "", globalMatch: true, sensitive: true, word: true };
                        new TemplateSettingsModal(this.app, this.plugin, this, newTemplate, true).open();
                    });
            });

        if (this.plugin.settings.templates.length) {
            let list = contentEl.createEl("ul");
            for (let i = 0; i < this.plugin.settings.templates.length; i++) {
                let template = this.plugin.settings.templates[i];
                let item = list.createEl("li").createDiv();

                new Setting(item)
                    .setName(
                        createFragment((e) => {
                            e.createEl("code", { text: template.replaced });
                            e.createSpan({ text: " > " });
                            e.createEl("code", { text: template.replacement });
                        })
                    )
                    .addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                        return button.setTooltip("Move up").setIcon("up-arrow-with-tail").onClick(async () => {
                            if (i != 0) {
                                let down = {...template};
                                let up = this.plugin.settings.templates[i - 1];

                                this.plugin.settings.templates[i] = up;
                                this.plugin.settings.templates[i - 1] = down;
                                await this.plugin.saveSettings().then(() => {
                                    this.display();
                                });
                            }
                        });
                    })
                    .addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                        return button.setTooltip("Move down").setIcon("down-arrow-with-tail").onClick(async () => {
                            if (i != this.plugin.settings.templates.length - 1) {
                                let up = {...template};
                                let down = this.plugin.settings.templates[i + 1];

                                this.plugin.settings.templates[i] = down;
                                this.plugin.settings.templates[i+1] = up;
                                await this.plugin.saveSettings().then(() => {
                                    this.display();
                                });
                            }
                        });
                    })
                    .addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                        return button.setTooltip("Edit").setIcon("edit").onClick(async () => {
                            let modal = new TemplateSettingsModal(this.app, this.plugin, this, template, false);
                            modal.open();
                            modal.onClose = async () => {
                                await this.plugin.saveSettings().then(() => {
                                    this.display();
                                });
                            };
                        });
                    })
                    .addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                        return button.setTooltip("Remove").setIcon("x").onClick(async () => {
                            this.plugin.settings.templates.remove(template);
                            await this.plugin.saveSettings().then(() => {
                                this.display();
                            });
                        });
                    });
            }
        }
    }
}

class TemplateSettingsModal extends Modal {
    constructor(app: App, public plugin: MathLinks, public modal: TemplatesModal, public template: Template, public create: boolean) {
        super(app);
    }

    onOpen() {
        this.display();
    }

    async display() {
        const { contentEl } = this;
        contentEl.empty();

        let replacedText: TextComponent;
        new Setting(contentEl)
            .setName("Match for...")
            .setDesc("String to be matched and replaced. Do not include regex.")
            .addText((text) => {
                replacedText = text;
                replacedText.setValue(this.template.replaced).onChange((current) => {
                    this.template.replaced = current;
                });
            });

        let replacementText: TextComponent;
        new Setting(contentEl)
            .setName("Replace with...")
            .setDesc("String to replace matches. Do not escape backslashes.")
            .addText((text) => {
                replacementText = text;
                replacementText.setValue(this.template.replacement).onChange((current) => {
                    this.template.replacement = current;
                });
            });

        new Setting(contentEl)
            .setName("Global match")
            .setDesc("Match all instances (instead of just the first).")
            .addToggle((toggle) => {
                toggle.setValue(this.template.globalMatch).onChange((current) => (this.template.globalMatch = current));
            });

        new Setting(contentEl)
            .setName("Case sensitive")
            .setDesc("Matches will be case sensitive.")
            .addToggle((toggle) => {
                toggle.setValue(this.template.sensitive).onChange((current) => (this.template.sensitive = current));
            });

        new Setting(contentEl)
            .setName("Match whole words")
            .setDesc("Only match whole words.")
            .addToggle((toggle) => {
                toggle.setValue(this.template.word).onChange((current) => (this.template.word = current));
            });

        new Setting(contentEl)
            .addButton((b) => {
                b.setTooltip(this.create ? "Add" : "Save").setIcon("checkmark").onClick(async () => {
                    if (this.template.replaced == "") {
                        new Notice("MathLinks: Please enter a non-empty string to be replaced");
                    } else {
                        if (this.create) this.plugin.settings.templates.push(this.template);
                        await this.plugin.saveSettings().then(() => {
                            this.close();
                            this.modal.display();
                        });
                    }
                });
            })
            .addExtraButton((b: ExtraButtonComponent) => {
                b.setTooltip("Cancel").setIcon("cross").onClick(async () => {
                    this.close();
                });
            });
    }
}

export class ExcludeModal extends Modal {
    constructor(app: App, public plugin: MathLinks) {
        super(app);
    }

    onOpen() {
        this.display();
    }

    // Credits to RyotaUshio/obsidian-math-booster
    async display() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h4", { text: "Excluded files" });

        new Setting(contentEl)
            .setName("The files/folders in this list will be ignored by MathLinks.")
            .addButton((btn) => {
                btn.setTooltip("Add").setIcon("plus")
                    .onClick((event) => {
                        new FileExcludeSuggestModal(this.app, this.plugin, this).open();
                    });
            });

        if (this.plugin.settings.excludedPaths.length) {
            let list = contentEl.createEl("ul");
            for (let path of this.plugin.settings.excludedPaths) {
                let item = list.createEl("li").createDiv();
                new Setting(item).setName(path).addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                    return button.setTooltip("Remove").setIcon("x").onClick(async () => {
                        this.plugin.settings.excludedPaths.remove(path);
                        await this.plugin.saveSettings().then(() => {
                            this.display();
                        });
                    });
                });
            }
        }
    }
}

abstract class FileSuggestModal extends FuzzySuggestModal<TAbstractFile> {
    constructor(app: App, public plugin: MathLinks) {
        super(app);
    }

    getItems(): TAbstractFile[] {
        return this.app.vault.getAllLoadedFiles().filter(this.filterCallback.bind(this));
    }

    getItemText(file: TAbstractFile): string {
        return file.path;
    }

    filterCallback(abstractFile: TAbstractFile): boolean {
        if (abstractFile instanceof TFile && abstractFile.extension != "md") return false;
        if (abstractFile instanceof TFolder && abstractFile.isRoot()) return false;

        for (const path of this.plugin.settings.excludedPaths) {
            const file = this.app.vault.getAbstractFileByPath(path)
            if (file && isEqualToOrChildOf(abstractFile, file)) {
                return false
            }
        }

        return true;
    }
}

class FileExcludeSuggestModal extends FileSuggestModal {
    constructor(app: App, plugin: MathLinks, public modal: ExcludeModal) {
        super(app, plugin);
    }

    async onChooseItem(file: TAbstractFile, evt: MouseEvent | KeyboardEvent) {
        this.plugin.settings.excludedPaths.push(file.path);
        await this.plugin.saveSettings().then(() => {
            this.modal.display();
        });
    }
}
