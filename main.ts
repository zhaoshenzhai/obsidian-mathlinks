import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MathLinksSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MathLinksSettings = {
	mySetting: 'default'
}

export default class MathLinks extends Plugin {
	settings: MathLinksSettings;

	async onload() {
		await this.loadSettings();

        const { vault } = this.app;
        const { workspace } = this.app;

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
			id: 'add-mathlink',
			name: 'Add a MathLink to the current file',
			checkCallback: (checking: boolean) => {
                const view = workspace.getActiveViewOfType(MarkdownView);
				if (view) {
                    if (getMathLink() == null) {
                        if (!checking) {
                            new AddMathLink(this.app, (mathLink: string) => {
                                new Notice('MathLink added');
                            }).open();
                        }
                        return true;
                    }
				}
                return false;
			}
		});

		this.addCommand({
			id: 'edit-mathlink',
			name: 'Edit the MathLink of the current file',
			checkCallback: (checking: boolean) => {
                const view = workspace.getActiveViewOfType(MarkdownView);
				if (view) {
                    if (getMathLink() != null) {
                        if (!checking) {
                            new EditMathLink(this.app, (mathLink: string) => {
                                new Notice('MathLink edited');
                            }).open();
                        }
                        return true;
                    }
				}
                return false;
			}
		});

        function getMathLink(): string | null {
            const view = workspace.getActiveViewOfType(MarkdownView);
            if (view.editor.getLine(0) === '---') {
                let lineNumber = 1;
                while (true) {
                    let line = view.editor.getLine(lineNumber);
                    if (line.substring(0, 5) === 'alias') {
                    //if (line.substring(0, 8) === 'mathLink') {
                        return line;
                    } else if (line === '---') {
                        return null;
                    } else {
                        lineNumber = ++lineNumber;
                    }
                }
            }
            return null;
        }

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
    }

	async onunload() {
        console.log('Unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AddMathLink extends Modal {
    mathLink: string;
    onSubmit: (mathLink: string) => void;

    constructor(app: App, onSubmit: (mathLink: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h1", { text: 'Add a MathLink to the current file' });

        new Setting(contentEl)
            .setName("MathLink")
            .addText((text) =>
                text.onChange((value) => {
                    this.mathLink = value
                }));

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                .setButtonText("Add")
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(this.mathLink);
                }));
    }

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class EditMathLink extends Modal {
    mathLink: string;
    onSubmit: (mathLink: string) => void;

    constructor(app: App, onSubmit: (mathLink: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h1", { text: 'Edit the MathLink of the current file' });

        new Setting(contentEl)
            .setName("MathLink")
            .addText((text) =>
                text.onChange((value) => {
                    this.mathLink = value
                }));

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                .setButtonText("Edit")
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(this.mathLink);
                }));
    }

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MathLinks;

	constructor(app: App, plugin: MathLinks) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
