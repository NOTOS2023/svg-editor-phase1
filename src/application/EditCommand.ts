import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { EditorSession } from './EditorSession.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export interface EditFeedback { readonly done: string; readonly undone: string; }

/** Concrete edits run against a private draft; only successful drafts are committed. */
export abstract class EditCommand extends Command {
  private before: SvgDocument | undefined;
  private after: SvgDocument | undefined;
  private feedback: EditFeedback | undefined;

  public override execute(session: EditorSession, args: CommandArguments): readonly string[] {
    const before = session.document.clone();
    const draft = before.clone();
    const feedback = this.apply(draft, args);
    this.before = before;
    this.after = draft.clone();
    this.feedback = feedback;
    session.commitEdit(this, draft);
    return [feedback.done];
  }

  protected abstract apply(document: SvgDocument, args: CommandArguments): EditFeedback;

  public undo(session: EditorSession): string {
    if (!this.before || !this.feedback) { throw new Error('command has not been executed'); }
    session.restore(this.before.clone());
    return this.feedback.undone;
  }

  public redo(session: EditorSession): string {
    if (!this.after || !this.feedback) { throw new Error('command has not been executed'); }
    session.restore(this.after.clone());
    return this.feedback.done;
  }
}
