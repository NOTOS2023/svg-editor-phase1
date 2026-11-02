import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { CommandArguments } from '../CommandArguments.js';

export class RedoCommand extends Command {
  public constructor() { super('redo', 'redo'); }
  public override execute(session: EditorSession, args: CommandArguments): readonly string[] {
    void session.document;
    args.expectCount(0);
    return [session.redo()];
  }
}
