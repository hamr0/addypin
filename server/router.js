// Tiny pattern-based router for node:http. Patterns may include
// ':name' segments which are extracted into params.

export function createRouter() {
    const routes = [];

    function add(method, pattern, handler) {
        routes.push({ method, ...compile(pattern), handler });
    }

    function match(method, path) {
        for (const r of routes) {
            if (r.method !== method) continue;
            const m = path.match(r.regex);
            if (!m) continue;
            const params = {};
            r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
            return { handler: r.handler, params };
        }
        return null;
    }

    return {
        get:    (p, h) => add('GET',    p, h),
        post:   (p, h) => add('POST',   p, h),
        patch:  (p, h) => add('PATCH',  p, h),
        delete: (p, h) => add('DELETE', p, h),
        match,
    };
}

function compile(pattern) {
    const keys = [];
    const regexStr = '^' + pattern.replace(/:(\w+)/g, (_, name) => {
        keys.push(name);
        return '([^/]+)';
    }) + '$';
    return { regex: new RegExp(regexStr), keys };
}
