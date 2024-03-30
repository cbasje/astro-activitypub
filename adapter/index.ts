import type { AstroIntegration } from "astro";
import type { Options } from "./types";

export default function createIntegration(args?: Options): AstroIntegration {
    return {
        name: "bun-adapter",
        hooks: {
            "astro:config:done": ({ setAdapter }) => {
                setAdapter({
                    name: "bun-adapter",
                    args: args ?? {},
                    serverEntrypoint: "./adapter/server.ts",
                    exports: ["stop", "handle", "start", "running"],
                    supportedAstroFeatures: {
                        hybridOutput: "experimental",
                        staticOutput: "unsupported",
                        serverOutput: "experimental",
                        assets: {
                            supportKind: "experimental",
                            isSharpCompatible: true,
                            isSquooshCompatible: true,
                        },
                    },
                });
            },
        },
    };
}
