import { Setting, PluginSettingTab, Modal, TextComponent, DropdownComponent, Notice } from 'obsidian';

export class MathLinksSettingTab extends PluginSettingTab {
    plugin: MathLinks;

    constructor(app: App, plugin: MathLinks) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', {text: 'MathLinks Settings'});

        new Setting(containerEl)
            .setName('Add a new template')
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: 'Automatically generate a mathLink with templates. Use '
                    });
                    e.createEl('code', {
                        text: 'mathLink: auto'
                    });
                    e.createSpan({
                        text: ' to use templates in a file.'
                    });
                })
            )
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Add")
                    .setIcon("plus")
                    .onClick(async () => {
                        let modal = new AddTemplatesModal(this.app);

                        modal.onClose = async () => {
                            if (modal.saved) {
                                const template = {
                                    title: modal.title,
                                    replaced: modal.replaced,
                                    replacement: modal.replacement,
                                    globalMatch: modal.globalMatch,
                                    sensitive: modal.sensitive,
                                    word: modal.word
                                };

                                this.plugin.settings.templates.push(template);
                                await this.plugin.saveSettings();
                                new Notice('MathLinks: Template added.');
                            }
                        };

                        modal.open();
                        this.display();
                    });
                return b;
            });

        let templateTitleToEdit: string | null;
        new Setting(containerEl)
            .setName('Edit template')
            .setDesc('Select a template to edit it.')
            .addDropdown((dropdown: DropdownComponent) => {
                dropdown.addOption("__select", "Select");
                for (let i = 0; i < this.plugin.settings.templates.length; i++) {
                    dropdown.addOption(this.plugin.settings.templates[i].title, this.plugin.settings.templates[i].title);
                }
                dropdown.onChange(async (current) => {
                    if (current != '__select')
                        templateTitleToEdit = current;
                    else
                        templateTitleToEdit = null;
                });
            })
            .addExtraButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Edit")
                    .setIcon("edit")
                    .onClick(async () => {
                        if (templateTitleToEdit) {
                            let originalTemplates = JSON.parse(JSON.stringify(this.plugin.settings.templates));
                            let modal = new EditTemplatesModal(this.app, templateTitleToEdit, this.plugin.settings.templates);

                            modal.onClose = async () => {
                                if (modal.saved) {
                                    await this.plugin.saveSettings();
                                    new Notice('MathLinks: Template saved.');
                                } else {
                                    this.plugin.settings.templates = originalTemplates;
                                }
                            };

                            modal.open();
                            this.display();
                        } else {
                            new Notice('MathLinks: Please select a template.');
                        }
                    });
                return b;
            });

        let templateTitleToDelete: string | null;
        new Setting(containerEl)
            .setName('Delete a template')
            .setDesc('Select a template to delete it.')
            .addDropdown((dropdown: DropdownComponent) => {
                dropdown.addOption("__select", "Select");
                for (let i = 0; i < this.plugin.settings.templates.length; i++) {
                    dropdown.addOption(this.plugin.settings.templates[i].title, this.plugin.settings.templates[i].title);
                }
                dropdown.onChange(async (current) => {
                    if (current != '__select')
                        templateTitleToDelete = current;
                    else
                        templateTitleToDelete = null;
                });
            })
            .addExtraButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Delete")
                    .setIcon("trash")
                    .onClick(async () => {
                        if (templateTitleToDelete) {
                            let modal = new DeleteTemplatesModal(this.app, templateTitleToDelete);

                            modal.onClose = async () => {
                                if (modal.proceed) {
                                    for (let i = 0; i < this.plugin.settings.templates.length; i++) {
                                        if (this.plugin.settings.templates[i].title === templateTitleToDelete) {
                                            this.plugin.settings.templates.splice(i, 1);
                                            await this.plugin.saveSettings();
                                            new Notice(`MathLinks: Template '${templateTitleToDelete}' deleted.`);
                                            break;
                                        }
                                    }
                                }
                            };

                            modal.open();
                            this.display();
                        } else {
                            new Notice('MathLinks: Please select a template.');
                        }
                    });
                return b;
            });
    }
}

class AddTemplatesModal extends Modal {
    saved: boolean = false;
    title: string = '';

    replaced: string = '';
    replacement: string = '';

    globalMatch: boolean = true;
    sensitive: boolean = true;
    word: boolean = true

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        let titleText: TextComponent;
        new Setting(contentEl)
            .setName('Title')
            .setDesc('Name of the template.')
            .addText((text) => {
                titleText = text;
                titleText.setValue(this.title).onChange((current) => {
                    this.title = current;
                });
            });

        let replacedText: TextComponent;
        new Setting(contentEl)
            .setName('Replace all ...')
            .setDesc('Strings to be matched and replaced.')
            .addText((text) => {
                replacedText = text;
                replacedText.setValue(this.replaced).onChange((current) => {
                    this.replaced = current;
                });
            });

        let replacementText: TextComponent;
        new Setting(contentEl)
            .setName('... with')
            .setDesc('String to replace all matches. Do not escape backslashes.')
            .addText((text) => {
                replacementText = text;
                replacementText.setValue(this.replacement).onChange((current) => {
                    this.replacement = current;
                });
            });

        new Setting(contentEl)
            .setName('Global')
            .setDesc('Match all instances (instead of just the first).')
            .addToggle((toggle) => {
                toggle.setValue(true).onChange((current) => (this.globalMatch = current));
            });

        new Setting(contentEl)
            .setName('Case sensitive')
            .setDesc('Matches will be case sensitive.')
            .addToggle((toggle) => {
                toggle.setValue(true).onChange((current) => (this.sensitive = current));
            });

        new Setting(contentEl)
            .setName('Whole word')
            .setDesc('Only match whole words.')
            .addToggle((toggle) => {
                toggle.setValue(true).onChange((current) => (this.word = current));
            });

        let footerEl = contentEl.createDiv();
        let footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => {
            b.setTooltip("Save")
                .setIcon("checkmark")
                .onClick(async () => {
                    this.saved = true;
                    this.close();
                });
            return b;
        });
        footerButtons.addExtraButton((b) => {
            b.setTooltip("Cancel")
                .setIcon("cross")
                .onClick(() => {
                    this.saved = false;
                    this.close();
                });
            return b;
        });
    }
}

class EditTemplatesModal extends Modal {
    saved: boolean = false;
    templateTitle: string;
    templates: string[];

    constructor(app: App, templateTitle: string, templates: string[]) {
        super(app);
        this.templateTitle = templateTitle;
        this.templates = templates;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.empty();

        for (let i = 0; i < this.templates.length; i++) {
            if (this.templateTitle != undefined && this.templates[i].title === this.templateTitle) {
                let titleText: TextComponent;
                new Setting(contentEl)
                    .setName('Title')
                    .setDesc('Name of the template.')
                    .addText((text) => {
                        titleText = text;
                        titleText.setValue(this.templates[i].title).onChange((current) => {
                            this.templates[i].title = current;
                        });
                    });

                let replacedText: TextComponent;
                new Setting(contentEl)
                    .setName('Replace all ...')
                    .setDesc('Strings to be matched and replaced.')
                    .addText((text) => {
                        replacedText = text;
                        replacedText.setValue(this.templates[i].replaced).onChange((current) => {
                            this.templates[i].replaced = current;
                        });
                    });

                let replacementText: TextComponent;
                new Setting(contentEl)
                    .setName('... with')
                    .setDesc('String to replace all matches. Do not escape backslashes.')
                    .addText((text) => {
                        replacementText = text;
                        replacementText.setValue(this.templates[i].replacement).onChange((current) => {
                            this.templates[i].replacement = current;
                        });
                    });

                new Setting(contentEl)
                    .setName('Global')
                    .setDesc('Match all instances (instead of just the first)')
                    .addToggle((toggle) => {
                        toggle.setValue(this.templates[i].globalMatch).onChange((current) => (this.templates[i].globalMatch = current));
                    });

                new Setting(contentEl)
                    .setName('Case sensitive')
                    .setDesc('Matches will be case sensitive.')
                    .addToggle((toggle) => {
                        toggle.setValue(this.templates[i].sensitive).onChange((current) => (this.templates[i].sensitive = current));
                    });

                new Setting(contentEl)
                    .setName('Whole word')
                    .setDesc('Only match whole words.')
                    .addToggle((toggle) => {
                        toggle.setValue(this.templates[i].sensitive).onChange((current) => (this.templates[i].word = current));
                    });

                break;
            }
        }

        let footerEl = contentEl.createDiv();
        let footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => {
            b.setTooltip("Save")
                .setIcon("checkmark")
                .onClick(async () => {
                    this.saved = true;
                    this.close();
                });
            return b;
        });
        footerButtons.addExtraButton((b) => {
            b.setTooltip("Cancel")
                .setIcon("cross")
                .onClick(() => {
                    this.saved = false;
                    this.close();
                });
            return b;
        });
    }
}

class DeleteTemplatesModal extends Modal {
    proceed: boolean = false;
    templateTitle: string;

    constructor(app: App, templateTitle: string) {
        super(app);
        this.templateTitle = templateTitle;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.empty();
        contentEl.createEl('h3', {text: `Are you sure you want to delete '${this.templateTitle}'?`});

        let footerEl = contentEl.createDiv();
        let footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => {
            b.setTooltip("Yes")
                .setIcon("checkmark")
                .onClick(async () => {
                    this.proceed = true;
                    this.close();
                });
            return b;
        });
        footerButtons.addExtraButton((b) => {
            b.setTooltip("Cancel")
                .setIcon("cross")
                .onClick(() => {
                    this.proceed = false;
                    this.close();
                });
            return b;
        });
    }
}
