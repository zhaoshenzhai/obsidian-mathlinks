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
                    // Wait for the ret.innerEl (div.tree-item-inner) to be fully rendered 
                    // by the core Outline plugin
                    setTimeout(() => setMathLink(ret.heading.heading, ret.innerEl));
                    return ret;
                }
            },
        })
    )
    
    return true;
}
