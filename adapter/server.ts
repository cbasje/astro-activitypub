import type { SSRManifest } from "astro";
import { App } from "astro/app";
import type { Server } from "bun";
import type { Options } from "./types";

let _server: Server | undefined = undefined;

export function start(manifest: SSRManifest, options: Options) {
    const clientRoot = new URL("../client/", import.meta.url);
    const app = new App(manifest);
    const logger = app.getAdapterLogger();
    _server = Bun.serve({
        port: options.port ?? 3000,
        hostname: options.hostname ?? "0.0.0.0",
        async fetch(req) {
            const url = new URL(req.url);

            // Find the request path in Astro,
            if (app.match(req)) {
                const res = await app.render(req);
                if (app.setCookieHeaders) {
                    for (const setCookieHeader of app.setCookieHeaders(res)) {
                        res.headers.append("Set-Cookie", setCookieHeader);
                    }
                }
                return res;
            }

            // If the request path wasn't found,
            // try to fetch a static file instead
            const localPath = new URL(
                "./" + app.removeBase(url.pathname),
                clientRoot
            );

            // If the static file is found
            const file = Bun.file(localPath);
            if (await file.exists()) {
                let fileResp = new Response(Bun.file(localPath));
                return fileResp;
            }

            // Render the Astro custom 404 page
            const res = await app.render(req);
            if (app.setCookieHeaders) {
                for (const setCookieHeader of app.setCookieHeaders(res)) {
                    res.headers.append("Set-Cookie", setCookieHeader);
                }
            }
            return res;
        },
        error(error) {
            return new Response(`<pre>${error}\n${error.stack}</pre>`, {
                headers: {
                    "Content-Type": "text/html",
                },
            });
        },
    });

    logger.info(`Bun server listening on ${_server.hostname}:${_server.port}`);
}

// Astro Adapter exports
export function createExports(manifest: SSRManifest, options: Options) {
    const app = new App(manifest);
    return {
        stop() {
            if (_server) {
                _server.stop();
                _server = undefined;
            }
        },
        running() {
            return _server !== undefined;
        },
        async start() {
            return start(manifest, options);
        },
        async handle(request: Request) {
            return app.render(request);
        },
    };
}
