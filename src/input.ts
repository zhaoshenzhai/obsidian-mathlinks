export class Input {
    ctrlKey: boolean = false;
    mouseMiddle: boolean = false;

    static init() {
        this.addCtrlListener(document);
        this.addMouseMiddleListener(document);
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

    static addMouseMiddleListener(element: HTMLElement) {
        element.addEventListener("mousedown", (evt: MouseEvent) => {
            if (evt.button == 1) {
                this.mouseMiddle = true;
            }
        });

        element.addEventListener("mouseup", (evt: MouseEvent) => {
            if (evt.button == 1) {
                this.mouseMiddle = false;
            }
        });
    }
}
