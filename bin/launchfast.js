#!/usr/bin/env node

import { spawn } from 'child_process'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { pathToFileURL } from 'url'

/**
 * Execute the LaunchFast CLI at runtime, always fetching the latest version.
 * This bypasses npx's caching behavior by installing to a temp directory
 * and dynamically importing the CLI module.
 */
async function main() {
	const version = process.env.LAUNCHFAST_CLI_VERSION || 'latest'
	const pkg = `@launchfasthq/cli@${version}`

	// Create a temporary directory for the installation
	const tempDir = await mkdtemp(join(tmpdir(), 'launchfast-'))

	try {
		// Create a minimal package.json in the temp directory
		await writeFile(
			join(tempDir, 'package.json'),
			JSON.stringify({ type: 'module' }, null, 2),
		)

		// Install the CLI package to the temp directory
		await installPackage(tempDir, pkg)

		// Dynamically import and run the CLI, passing through command line args
		const cliPath = join(tempDir, 'node_modules', '@launchfasthq', 'cli', 'dist', 'index.js')
		const cliModule = await import(pathToFileURL(cliPath).href)
		await cliModule.run(process.argv.slice(2))
	} finally {
		// Clean up the temp directory
		await rm(tempDir, { recursive: true, force: true }).catch(() => {
			// Ignore cleanup errors
		})
	}
}

/**
 * Install a package to a specific directory using npm.
 */
function installPackage(cwd, pkg) {
	return new Promise((resolve, reject) => {
		const child = spawn('npm', ['install', pkg, '--no-save', '--no-package-lock'], {
			cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: process.platform === 'win32',
		})

		let stderr = ''
		child.stderr.on('data', (data) => {
			stderr += data.toString()
		})

		child.on('error', reject)

		child.on('close', (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`npm install failed with code ${code}: ${stderr}`))
			}
		})
	})
}

main().catch((error) => {
	console.error('Error:', error.message)
	process.exit(1)
})
