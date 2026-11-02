import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class ScaleCommand extends EditCommand {
  public constructor() { super('scale', 'scale <id> <factor>'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(2);
    const shape = document.get(args.value(0));
    const factor = args.number(1);
    shape.scale(factor);
    return { done: `${shape.tag}#${shape.id} scaled by ${factor}`, undone: `${shape.tag}#${shape.id} scale undone` };
  }
}
