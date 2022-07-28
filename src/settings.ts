import { Setting, PluginSettingTab, Modal, TextComponent, DropdownComponent, Notice, TFile } from 'obsidian';

export interface MathLinksSettings {
    templates: string[];
}

export const DEFAULT_SETTINGS: MathLinksSettings = {
    templates: [],
}

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

        let templateTitle: string | null;
        new Setting(containerEl)
            .setName('Edit/delete template')
            .setDesc('Select a template to edit/delete it.')
            .addDropdown((dropdown: DropdownComponent) => {
                dropdown.addOption("__select", "Select");
                for (let i = 0; i < this.plugin.settings.templates.length; i++) {
                    dropdown.addOption(this.plugin.settings.templates[i].title, this.plugin.settings.templates[i].title);
                }
                dropdown.onChange(async (current) => {
                    if (current != '__select')
                        templateTitle = current;
                    else
                        templateTitle = null;
                });
            })
            .addExtraButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Edit")
                    .setIcon("edit")
                    .onClick(async () => {
                        if (templateTitle) {
                            let originalTemplates = JSON.parse(JSON.stringify(this.plugin.settings.templates));
                            let modal = new EditTemplatesModal(this.app, templateTitle, this.plugin.settings.templates);

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
            })
            .addExtraButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Delete")
                    .setIcon("trash")
                    .onClick(async () => {
                        if (templateTitle) {
                            let modal = new DeleteTemplatesModal(this.app, templateTitle);

                            modal.onClose = async () => {
                                if (modal.saved) {
                                    for (let i = 0; i < this.plugin.settings.templates.length; i++) {
                                        if (this.plugin.settings.templates[i].title === templateTitle) {
                                            this.plugin.settings.templates.splice(i, 1);
                                            await this.plugin.saveSettings();
                                            new Notice(`MathLinks: Template '${templateTitle}' deleted.`);
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
        contentEl.empty();

        loadTemplateSettings(contentEl, this);
        loadButtonsToClose(this, 'Save', 'checkmark', 'Cancel', 'cross');
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
                loadTemplateSettings(contentEl, this.templates[i]);
                break;
            }
        }

        loadButtonsToClose(this, 'Save', 'checkmark', 'Cancel', 'cross');
    }
}

class DeleteTemplatesModal extends Modal {
    saved: boolean = false;
    templateTitle: string;

    constructor(app: App, templateTitle: string) {
        super(app);
        this.templateTitle = templateTitle;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h3', {text: `Are you sure you want to delete '${this.templateTitle}'?`});
        loadButtonsToClose(this, 'Yes', 'checkmark', 'Cancel', 'cross');
    }
}

function loadTemplateSettings(contentEl: HTMLElement, template: object) {
    let titleText: TextComponent;
    new Setting(contentEl)
        .setName('Title')
        .setDesc('Name of the template.')
        .addText((text) => {
            titleText = text;
            titleText.setValue(template.title).onChange((current) => {
                template.title = current;
            });
        });

    let replacedText: TextComponent;
    new Setting(contentEl)
        .setName('Match for...')
        .setDesc('String to be matched and replaced. Do not include regex.')
        .addText((text) => {
            replacedText = text;
            replacedText.setValue(template.replaced).onChange((current) => {
                template.replaced = current;
            });
        });

    let replacementText: TextComponent;
    new Setting(contentEl)
        .setName('Replace with...')
        .setDesc('String to replace matches. Do not escape backslashes.')
        .addText((text) => {
            replacementText = text;
            replacementText.setValue(template.replacement).onChange((current) => {
                template.replacement = current;
            });
        });

    new Setting(contentEl)
        .setName('Global match')
        .setDesc('Match all instances (instead of just the first).')
        .addToggle((toggle) => {
            toggle.setValue(template.globalMatch).onChange((current) => (template.globalMatch = current));
        });

    new Setting(contentEl)
        .setName('Case sensitive')
        .setDesc('Matches will be case sensitive.')
        .addToggle((toggle) => {
            toggle.setValue(template.sensitive).onChange((current) => (template.sensitive = current));
        });

    new Setting(contentEl)
        .setName('Match whole words')
        .setDesc('Only match whole words.')
        .addToggle((toggle) => {
            toggle.setValue(template.word).onChange((current) => (template.word = current));
        });
}

function loadButtonsToClose(modal: Modal, trueToolTip: string, trueIcon: string, falseToolTip: string, falseIcon: string) {
    let footerEl = modal.contentEl.createDiv();
    let footerButtons = new Setting(footerEl);
    footerButtons.addButton((b) => {
        b.setTooltip(trueToolTip)
            .setIcon(trueIcon)
            .onClick(async () => {
                modal.saved = true;
                modal.close();
            });
    });
    footerButtons.addExtraButton((b) => {
        b.setTooltip(falseToolTip)
            .setIcon(falseIcon)
            .onClick(async () => {
                modal.saved = false;
                modal.close();
            });
    });
}
