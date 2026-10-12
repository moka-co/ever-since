import { runSuiteFiles } from './helpers';

const exitCode = runSuiteFiles();
if (exitCode !== 0) {
  process.exit(exitCode);
}
