import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CliEngine } from './CliEngine.js';

export class CliApplication {
  public constructor(private readonly engine: CliEngine) {}

  public async run(input: Readable, output: Writable, interactive: boolean): Promise<number> {
    const reader = createInterface({ input, output, terminal: interactive });
    let errors = 0;
    if (interactive) {
      output.write("svg-editor 0.1 — type 'help' for commands\n");
      reader.setPrompt('svg> ');
      reader.prompt();
    }
    for await (const line of reader) {
      const lines = this.engine.execute(line);
      for (const result of lines) {
        output.write(`${result}\n`);
        if (result.startsWith('error:')) { errors++; }
      }
      if (interactive) { reader.prompt(); }
    }
    return errors > 0 ? 1 : 0;
  }
}
