#!/usr/bin/env node

import { createRequire } from "node:module";
import { run } from "@launchfasthq/cli";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

// Subtle version info for debugging (dimmed)
console.log(`\x1b[2m@launchfasthq/create v${version}\x1b[0m`);

run();
