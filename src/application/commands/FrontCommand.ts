import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class FrontCommand extends EditCommand {
  public constructor() { super('front', 'front <id>'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(1);
    const shape = document.get(args.value(0));
    document.front(shape.id);
    return { done: `${shape.tag}#${shape.id} brought to front`, undone: `${shape.tag}#${shape.id} z-order restored` };
  }
}
