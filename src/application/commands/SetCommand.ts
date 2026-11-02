import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class SetCommand extends EditCommand {
  public constructor() { super('set', 'set <id> <attr> <value>'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(3);
    const shape = document.get(args.value(0));
    const attr = args.value(1), value = args.value(2);
    const oldValue = attr === 'text' ? shape.textContent : shape.attributes()[attr];
    shape.setAttribute(attr, value);
    return {
      done: `${shape.tag}#${shape.id} updated: ${attr}=${JSON.stringify(value)}`,
      undone: `${shape.tag}#${shape.id} updated: ${attr}=${oldValue === undefined ? '(unset)' : JSON.stringify(oldValue)}`
    };
  }
}
