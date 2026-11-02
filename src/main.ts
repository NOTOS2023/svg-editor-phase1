import { createReadStream } from 'node:fs';
import { CliApplication } from './cli/CliApplication.js';
import { CliEngine } from './cli/CliEngine.js';
import { EditorSession } from './application/EditorSession.js';
import { NodeDocumentStore } from './infrastructure/NodeDocumentStore.js';

const application = new CliApplication(new CliEngine(new EditorSession(new NodeDocumentStore())));
const args = process.argv.slice(2);

try {
  if (!args.length) {
    process.exitCode = await application.run(process.stdin, process.stdout, Boolean(process.stdin.isTTY));
  } else if (args.length === 2 && args[0] === '--script') {
    process.exitCode = await application.run(createReadStream(args[1]!, { encoding: 'utf8' }), process.stdout, false);
  } else {
    process.stdout.write('error: usage: npm run cli -- [--script <commands.txt>]\n');
    process.exitCode = 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stdout.write(`error: ${message.replace(/[\r\n]+/g, ' ')}\n`);
  process.exitCode = 1;
}
