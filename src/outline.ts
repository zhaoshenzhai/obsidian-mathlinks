// https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/55
// Patch the core Outline view to render MathJax in it

import { around } from 'monkey-around';
import MathLinks from './main';
import { setMathLink } from './links/helper';

export const patchOutline = (plugin: MathLinks): boolean => {
    const outlineView = plugin.app.workspace.getLeavesOfType('outline')[0]?.view;
    if (!outlineView) return false;

    plugin.register(
        around(outlineView.constructor.prototype, {
            getItemDom(old) {
                return function (arg) {
                    const ret = old.call(this, arg);
                    setTimeout(() => setMathLink(ret.heading.heading, ret.innerEl), 10);
                    return ret;
                }
            },
        })
    )

    return true;
}
