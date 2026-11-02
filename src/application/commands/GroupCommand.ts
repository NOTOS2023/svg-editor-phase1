import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class GroupCommand extends EditCommand {
  public constructor() { super('group', 'group <newGid> <id1> <id2>...'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(2, Infinity);
    const group = document.group(args.value(0), args.values(1));
    return { done: `g#${group.id} created with ${group.children.length} children`, undone: `g#${group.id} grouping undone` };
  }
}
