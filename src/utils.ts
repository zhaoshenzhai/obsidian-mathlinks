export function formatToRegex(str: string): string {
    return str
        .replace(/\s/g, '\\s')
        .replace(/\./g, '\\.')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
}
