'use strict';

import { readdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, workerData, parentPort } from 'worker_threads';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONCURRENCY = parseInt(process.env.E2E_CONCURRENCY || '4', 10);
const TIMEOUT_MS = parseInt(process.env.E2E_TIMEOUT || '60000', 10);

// Find all test files
function findTestFiles(dir) {
  const files = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (item !== 'lib' && item !== 'fixtures') {
        files.push(...findTestFiles(fullPath));
      }
    } else if (item.startsWith('test-') && item.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Run a single test file
async function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: { testFile },
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Test timeout: ${testFile}`));
    }, TIMEOUT_MS);

    let output = '';

    worker.on('message', (msg) => {
      if (msg.type === 'output') {
        output += msg.data;
      } else if (msg.type === 'result') {
        clearTimeout(timeout);
        resolve({ ...msg, output, testFile });
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    worker.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}: ${testFile}`));
      }
    });
  });
}

// Worker thread execution
if (!isMainThread) {
  const { testFile } = workerData;

  // Redirect console to parent
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => {
    parentPort.postMessage({ type: 'output', data: args.join(' ') + '\n' });
    originalLog(...args);
  };

  console.error = (...args) => {
    parentPort.postMessage({ type: 'output', data: '[ERROR] ' + args.join(' ') + '\n' });
    originalError(...args);
  };

  try {
    // Import and run the test
    await import(testFile);

    // Wait a bit for async cleanup
    await new Promise(resolve => setTimeout(resolve, 500));

    parentPort.postMessage({ type: 'result', success: true, exitCode: 0 });
  } catch (error) {
    console.error(error.message);
    parentPort.postMessage({ type: 'result', success: false, exitCode: 1, error: error.message });
  }
} else {
  // Main thread - orchestrate parallel execution
  async function main() {
    const serialMode = process.argv.includes('--serial');
    const concurrency = serialMode ? 1 : CONCURRENCY;

    const testFiles = findTestFiles(__dirname);

    if (testFiles.length === 0) {
      console.log('No test files found');
      process.exit(0);
    }

    console.log(`Found ${testFiles.length} test(s), running with concurrency ${concurrency}\n`);

    const results = [];

    if (serialMode) {
      // Run sequentially
      for (const testFile of testFiles) {
        const relativePath = testFile.replace(__dirname + '/', '');
        console.log(`Running: ${relativePath}`);
        try {
          const result = await runTestFile(testFile);
          results.push(result);
          console.log(result.output);
        } catch (error) {
          results.push({ success: false, exitCode: 1, error: error.message, testFile });
          console.error(error.message);
        }
      }
    } else {
      // Run in parallel with pool
      const queue = [...testFiles];
      const running = new Set();

      while (queue.length > 0 || running.size > 0) {
        // Start new tests up to concurrency limit
        while (running.size < concurrency && queue.length > 0) {
          const testFile = queue.shift();
          const relativePath = testFile.replace(__dirname + '/', '');
          console.log(`Starting: ${relativePath}`);

          const promise = runTestFile(testFile).then(result => {
            console.log(`\n--- ${relativePath} ---`);
            console.log(result.output);
            running.delete(promise);
            return result;
          }).catch(error => {
            console.log(`\n--- ${relativePath} [FAILED] ---`);
            console.error(error.message);
            running.delete(promise);
            return { success: false, exitCode: 1, error: error.message, testFile };
          });

          running.add(promise);
          results.push(promise);
        }

        // Wait for at least one to complete before continuing
        if (running.size > 0) {
          await Promise.race(running);
        }
      }

      // Wait for all remaining
      const finalResults = await Promise.all(results);
      results.length = 0;
      results.push(...finalResults);
    }

    // Print summary
    console.log('\n=== Test Summary ===');
    let passed = 0;
    let failed = 0;

    for (const result of results) {
      const relativePath = result.testFile.replace(__dirname + '/', '');
      if (result.success && result.exitCode === 0) {
        console.log(`✓ ${relativePath}`);
        passed++;
      } else {
        console.log(`✗ ${relativePath}`);
        if (result.error) console.log(`  Error: ${result.error}`);
        failed++;
      }
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }

  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
