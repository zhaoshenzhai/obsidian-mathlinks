import { Setting, Modal, TextComponent, ButtonComponent, Notice, TFile, TAbstractFile, TFolder, FuzzySuggestModal, App } from "obsidian";
import { Template } from "./settings";
import { isEqualToOrChildOf } from "../utils";
import MathLinks from "../main"

/*export class AddTemplatesModal extends Modal implements MathLinksModalState {
    saved: boolean = false;
    error: string[] = ["MathLinks: Please enter a title", "MathLinks: Please enter a non-empty string to be replaced"];

    newTemplate: Template;
    templates: Template[] = [];

    constructor(app: App, templates: Template[]) {
        super(app);
        this.templates = templates;
        this.newTemplate = { title: "", replaced: "", replacement: "", globalMatch: true, sensitive: true, word: true };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        loadTemplateSettings(contentEl, this.newTemplate, this);
        loadButtonsToClose(this, this.contentEl.createDiv(), "Add", "Cancel");
    }
}

export class EditTemplatesModal extends Modal implements MathLinksModalState {
    saved: boolean = false;
    error: string[] = [];

    templateTitle: string;
    templates: Template[];

    constructor(app: App, templateTitle: string, templates: Template[]) {
        super(app);
        this.templateTitle = templateTitle;
        this.templates = templates;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.templates.every((template) => {
            if (this.templateTitle != undefined && template.title == this.templateTitle) {
                loadTemplateSettings(contentEl, template, this);
                return false;
            }
            return true;
        });

        loadButtonsToClose(this, this.contentEl.createDiv(), "Save", "Cancel");
    }
}*/

export class TemplatesModal extends Modal implements MathLinksModalState {
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
        contentEl.createEl("h4", { text: "Templates" });

        new Setting(contentEl)
            .setName("ADD DESCRIPTION HERE")
            .addButton((btn) => {
                btn.setTooltip("Add").setIcon("plus")
                    .onClick((event) => {
                        let newTemplate = { replaced: "", replacement: "", globalMatch: true, sensitive: true, word: true };
                        new TemplateSettingsModal(this.app, this.plugin, this, newTemplate, true).open();
                    });
            });

        if (this.plugin.settings.templates.length) {
            let list = contentEl.createEl("ul");
            for (let template of this.plugin.settings.templates) {
                let item = list.createEl("li").createDiv();
                new Setting(item)
                    .setName(
                        createFragment((e) => {
                            e.createSpan({ text: template.replaced + " > " });
                            e.createEl("code", { text: template.replacement });
                        })
                    )
                    .addExtraButton((button: ButtonComponent): ButtonComponent => {
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
                    .addExtraButton((button: ButtonComponent): ButtonComponent => {
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

export class TemplateSettingsModal extends Modal {
    // titleError: null | string;
    replacedError: null | string;

    constructor(app: App, public plugin: MathLinks, public modal: TemplatesModal, public template: Template, public create: boolean) {
        super(app);
        // this.titleError = "MathLinks: Please enter a title";
        this.replacedError = (template.replaced == "") ? "MathLinks: Please enter a non-empty string to be replaced" : null;
    }

    onOpen() {
        this.display();
    }

    async display() {
        const { contentEl } = this;
        contentEl.empty();

        /*let titleText: TextComponent;
        new Setting(contentEl)
            .setName("Title")
            .setDesc("Name of the template.")
            .addText((text) => {
                titleText = text;
                titleText.setValue(this.template.title).onChange((current) => {
                    if (current == "") {
                        this.titleError = "MathLinks: Please enter a title";
                    } else {
                        this.titleError = null;
                        this.plugin.settings.templates.every((t) => {
                            if (current != "" && current == t.title) {
                                this.titleError = "MathLinks: Duplicate title";
                                return false;
                            }
                            return true;
                        });
                        this.template.title = current;
                    }
                });
            });*/

        let replacedText: TextComponent;
        new Setting(contentEl)
            .setName("Match for...")
            .setDesc("String to be matched and replaced. Do not include regex.")
            .addText((text) => {
                replacedText = text;
                replacedText.setValue(this.template.replaced).onChange((current) => {
                    this.template.replaced = current;
                    this.replacedError = null;
                    if (this.template.replaced == "") {
                        this.replacedError = "MathLinks: Please enter a non-empty string to be replaced";
                    }
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
                b.setTooltip("Add").setIcon("checkmark").onClick(async () => {
                    if (this.replacedError) {
                        new Notice(this.replacedError)
                    } else {
                        if (this.create) this.plugin.settings.templates.push(this.template);
                        await this.plugin.saveSettings().then(() => {
                            this.close();
                            this.modal.display();
                        });
                    }
                });
            })
            .addExtraButton((b) => {
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
                new Setting(item).setName(path).addExtraButton((button: ButtonComponent): ButtonComponent => {
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

    async onChooseItem(file: TAbstractFile, evt: MouseEvent | KeyBoardEvent) {
        this.plugin.settings.excludedPaths.push(file.path);
        await this.plugin.saveSettings().then(() => {
            this.modal.display();
        });
    }
}
