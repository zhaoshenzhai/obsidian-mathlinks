all: mathlinks

mathlinks: main.js manifest.json
	cp main.js test_vault/.obsidian/plugins/mathlinks/main.js
	cp manifest.json test_vault/.obsidian/plugins/mathlinks/manifest.json

main.js: src/main.ts src/settings.ts
	cd src
	npm run dev
