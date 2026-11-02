import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { CommandArguments } from '../CommandArguments.js';

export class HelpCommand extends Command {
  public constructor(private readonly usages: readonly string[]) { super('help', 'help'); }
  public override execute(_session: EditorSession, args: CommandArguments): readonly string[] {
    args.expectCount(0);
    return [...this.usages, 'Types: rect x y w h [fill] | circle cx cy r [fill] | ellipse cx cy rx ry [fill]',
      '       line x1 y1 x2 y2 [stroke] | text x y "content" | g',
      'Comments: lines starting with #. Quote values containing spaces. EOF / Ctrl+C exits.'];
  }
}
