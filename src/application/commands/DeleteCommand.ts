import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class DeleteCommand extends EditCommand {
  public constructor() { super('delete', 'delete <id>'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(1);
    const id = args.value(0);
    const parent = document.parentLabel(id);
    const shape = document.delete(id);
    return { done: `${shape.tag}#${id} deleted`, undone: `${shape.tag}#${id} restored into ${parent}` };
  }
}
