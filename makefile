all: mathlinks

mathlinks: main.js manifest.json
	cp main.js ~/Dropbox/MathLinks/test_vault/.obsidian/plugins/mathlinks/main.js
	cp manifest.json ~/Dropbox/MathLinks/test_vault/.obsidian/plugins/mathlinks/manifest.json

main.js: main.ts settings.ts
	npm run dev

clean:
	rm main.js package-lock.json
