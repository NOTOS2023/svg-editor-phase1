import { CommandArguments } from '../application/CommandArguments.js';
import { CommandRegistry } from '../application/CommandRegistry.js';
import type { EditorSession } from '../application/EditorSession.js';
import { Tokenizer } from './Tokenizer.js';

export class CliEngine {
  private readonly tokenizer = new Tokenizer();
  public constructor(private readonly session: EditorSession, private readonly registry = new CommandRegistry()) {}

  public execute(line: string): readonly string[] {
    try {
      const tokens = this.tokenizer.tokenize(line);
      if (!tokens.length) { return []; }
      const command = this.registry.create(tokens[0]!.value);
      return command.execute(this.session, new CommandArguments(tokens.slice(1), command.usage));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n]+/g, ' ')}`];
    }
  }
}
