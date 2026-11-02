import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class AddToCommand extends EditCommand {
  public constructor() { super('addto', 'addto <gid> <id>'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(2);
    const gid = args.value(0), id = args.value(1);
    const shape = document.get(id), parent = document.parentLabel(id);
    document.addTo(gid, id);
    return { done: `${shape.tag}#${id} added to g#${gid}`, undone: `${shape.tag}#${id} restored into ${parent}` };
  }
}
