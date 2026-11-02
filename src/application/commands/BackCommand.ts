import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class BackCommand extends EditCommand {
  public constructor() { super('back', 'back <id>'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(1);
    const shape = document.get(args.value(0));
    document.back(shape.id);
    return { done: `${shape.tag}#${shape.id} sent to back`, undone: `${shape.tag}#${shape.id} z-order restored` };
  }
}
