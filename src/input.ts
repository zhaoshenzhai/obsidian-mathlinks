export class Input {
    ctrlKey: boolean = false;

    static init() {
        this.addCtrlListener(document);
    }

    static addCtrlListener(element: HTMLElement) {
        element.addEventListener("keydown", (evt: KeyboardEvent) => {
            if (evt.key == "Control") {
                this.ctrlKey = true;
            }
        });

        element.addEventListener("keyup", (evt: KeyboardEvent) => {
            if (evt.key == "Control") {
                this.ctrlKey = false;
            }
        });
    }
}
