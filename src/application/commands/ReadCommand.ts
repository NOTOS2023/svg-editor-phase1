import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { CommandArguments } from '../CommandArguments.js';

export class ReadCommand extends Command {
  public constructor() { super('read', 'read <file.svg>'); }
  public override execute(session: EditorSession, args: CommandArguments): readonly string[] {
    args.expectCount(1);
    return session.read(args.value(0));
  }
}
