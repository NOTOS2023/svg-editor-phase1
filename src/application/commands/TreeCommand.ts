import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { CommandArguments } from '../CommandArguments.js';
import { TreeRenderer } from '../TreeRenderer.js';

export class TreeCommand extends Command {
  private readonly renderer = new TreeRenderer();
  public constructor() { super('tree', 'tree [id]'); }
  public override execute(session: EditorSession, args: CommandArguments): readonly string[] {
    const document = session.document;
    args.expectCount(0, 1);
    return this.renderer.render(document, args.length ? args.value(0) : undefined);
  }
}
