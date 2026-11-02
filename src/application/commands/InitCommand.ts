import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { CommandArguments } from '../CommandArguments.js';

export class InitCommand extends Command {
  public constructor() { super('init', 'init [w] [h]'); }
  public override execute(session: EditorSession, args: CommandArguments): readonly string[] {
    args.expectCount(0, 2);
    return [session.init(args.length > 0 ? args.number(0) : 800, args.length > 1 ? args.number(1) : 600)];
  }
}
