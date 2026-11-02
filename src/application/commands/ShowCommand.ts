import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { CommandArguments } from '../CommandArguments.js';

export class ShowCommand extends Command {
  public constructor() { super('show', 'show <id>'); }
  public override execute(session: EditorSession, args: CommandArguments): readonly string[] {
    const document = session.document;
    args.expectCount(1);
    const shape = document.get(args.value(0));
    const lines = [`${shape.tag}#${shape.id}  parent=${document.parentLabel(shape.id)}`];
    for (const [name, value] of Object.entries(shape.attributes())) { lines.push(`  ${name}=${value}`); }
    if (shape.textContent !== undefined) { lines.push(`  text=${JSON.stringify(shape.textContent)}`); }
    return lines;
  }
}
