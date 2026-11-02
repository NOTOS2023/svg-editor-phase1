import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { CommandArguments } from '../CommandArguments.js';

export class CanvasCommand extends Command {
  public constructor() { super('canvas', 'canvas [w] [h]'); }
  public override execute(session: EditorSession, args: CommandArguments): readonly string[] {
    const document = session.document;
    args.expectCount(0, 2);
    if (!args.length) { return [`canvas ${document.width}x${document.height}`]; }
    if (args.length !== 2) { throw new Error(`usage: ${this.usage}`); }
    return [session.resize(args.number(0), args.number(1))];
  }
}
