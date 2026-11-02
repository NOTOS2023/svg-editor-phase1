import type { EditCommand } from './EditCommand.js';
import type { EditorSession } from './EditorSession.js';

export class CommandHistory {
  private readonly past: EditCommand[] = [];
  private readonly future: EditCommand[] = [];
  private blocked = false;

  public record(command: EditCommand): void {
    this.past.push(command);
    this.future.length = 0;
    this.blocked = false;
  }

  public barrier(): void {
    this.past.length = 0;
    this.future.length = 0;
    this.blocked = true;
  }

  public undo(session: EditorSession): string {
    this.assertAllowed();
    const command = this.past.at(-1);
    if (!command) { throw new Error('nothing to undo'); }
    const feedback = command.undo(session);
    this.past.pop();
    this.future.push(command);
    return feedback;
  }

  public redo(session: EditorSession): string {
    this.assertAllowed();
    const command = this.future.at(-1);
    if (!command) { throw new Error('nothing to redo'); }
    const feedback = command.redo(session);
    this.future.pop();
    this.past.push(command);
    return feedback;
  }

  private assertAllowed(): void {
    if (this.blocked) { throw new Error('undo not allowed after io command'); }
  }
}
