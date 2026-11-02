import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class UngroupCommand extends EditCommand {
  public constructor() { super('ungroup', 'ungroup <gid>'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(1);
    const id = args.value(0);
    document.ungroup(id);
    return { done: `g#${id} ungrouped`, undone: `g#${id} grouping restored` };
  }
}
