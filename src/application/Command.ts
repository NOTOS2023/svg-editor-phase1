import type { EditorSession } from './EditorSession.js';
import type { CommandArguments } from './CommandArguments.js';

export abstract class Command {
  protected constructor(public readonly name: string, public readonly usage: string) {}
  public abstract execute(session: EditorSession, args: CommandArguments): readonly string[];
}
