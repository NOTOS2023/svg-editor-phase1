import { Command } from './Command.js';
import { InitCommand } from './commands/InitCommand.js';
import { ReadCommand } from './commands/ReadCommand.js';
import { SaveCommand } from './commands/SaveCommand.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { DeleteCommand } from './commands/DeleteCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { SetCommand } from './commands/SetCommand.js';
import { GroupCommand } from './commands/GroupCommand.js';
import { UngroupCommand } from './commands/UngroupCommand.js';
import { AddToCommand } from './commands/AddToCommand.js';
import { FrontCommand } from './commands/FrontCommand.js';
import { BackCommand } from './commands/BackCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';

/** Phase 1's single command-name dispatch boundary; factories create fresh history units. */
export class CommandRegistry {
  private readonly factories = new Map<string, () => Command>();
  public constructor() {
    this.register(() => new InitCommand());
    this.register(() => new ReadCommand());
    this.register(() => new SaveCommand());
    this.register(() => new CanvasCommand());
    this.register(() => new CreateCommand());
    this.register(() => new DeleteCommand());
    this.register(() => new MoveCommand());
    this.register(() => new ScaleCommand());
    this.register(() => new SetCommand());
    this.register(() => new GroupCommand());
    this.register(() => new UngroupCommand());
    this.register(() => new AddToCommand());
    this.register(() => new FrontCommand());
    this.register(() => new BackCommand());
    this.register(() => new TreeCommand());
    this.register(() => new ShowCommand());
    this.register(() => new UndoCommand());
    this.register(() => new RedoCommand());
    const usages = [...this.factories.values()].map(factory => factory().usage);
    this.register(() => new HelpCommand([...usages, 'help']));
  }
  private register(factory: () => Command): void { this.factories.set(factory().name, factory); }
  public create(name: string): Command {
    const factory = this.factories.get(name);
    if (!factory) { throw new Error(`unknown command: ${name}. use 'help' for commands`); }
    return factory();
  }
}
