import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { CommandArguments } from '../CommandArguments.js';

export class SaveCommand extends Command {
  public constructor() { super('save', 'save [file.svg]'); }
  public override execute(session: EditorSession, args: CommandArguments): readonly string[] {
    void session.document;
    args.expectCount(0, 1);
    return [session.save(args.length ? args.value(0) : undefined)];
  }
}
