import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class MoveCommand extends EditCommand {
  public constructor() { super('move', 'move <id> <dx> <dy>'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(3);
    const shape = document.get(args.value(0));
    const dx = args.number(1), dy = args.number(2);
    shape.move(dx, dy);
    return {
      done: `${shape.tag}#${shape.id} moved by (${dx},${dy})`,
      undone: `${shape.tag}#${shape.id} moved back by (${-dx},${-dy})`
    };
  }
}
