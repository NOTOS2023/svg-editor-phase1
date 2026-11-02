import { EditCommand, type EditFeedback } from '../EditCommand.js';
import type { CommandArguments } from '../CommandArguments.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';

export class CreateCommand extends EditCommand {
  private readonly factory = new ShapeFactory();
  public constructor() { super('create', 'create <type> <id> [params...] [in <containerId>]'); }
  protected override apply(document: SvgDocument, args: CommandArguments): EditFeedback {
    args.expectCount(2, Infinity);
    const hasParent = args.length >= 4 && args.isKeyword(args.length - 2, 'in');
    const parentId = hasParent ? args.value(args.length - 1) : undefined;
    if (parentId !== undefined) { document.getContainer(parentId); }
    const shape = this.factory.create(args.value(0), args.value(1), args.values(2, hasParent ? args.length - 2 : args.length));
    document.add(shape, parentId);
    return {
      done: `${shape.tag}#${shape.id} created${parentId !== undefined ? ` in g#${parentId}` : ''}`,
      undone: `${shape.tag}#${shape.id} creation undone`
    };
  }
}
