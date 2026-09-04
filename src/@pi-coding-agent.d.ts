/**
 * Pi Coding Agent 类型声明桩 (ambient declarations)
 *
 * 真实运行时由 Pi Agent 注入 ExtensionAPI / events / ui 等对象。
 * 本文件仅用于让本项目能在无 Pi 运行时环境下独立 typecheck 与编译。
 * 若已在 Pi 环境中开发, 可移除本文件并依赖 @mariozechner/pi-coding-agent 包。
 */
declare module "@mariozechner/pi-coding-agent" {
  export interface ExtensionAPI {
    registerCommand: (
      name: string,
      def: {
        description?: string;
        handler: (args: string, ctx: CommandContext) => void | Promise<void>;
      }
    ) => void;
    registerTool: (def: ToolDefinition) => void;
    events: {
      on: (event: string, listener: (payload: any) => void) => () => void;
      emit: (event: string, payload: any) => void;
    };
    ui: {
      notify: (message: string, level?: "info" | "error" | "warn") => void;
    };
    workspace: {
      writeFile: (path: string, content: string) => Promise<boolean>;
    };
  }

  export type CommandContext = {
    ui: ExtensionAPI["ui"];
    workspace: ExtensionAPI["workspace"];
  };

  export type ToolDefinition = {
    name: string;
    label?: string;
    description?: string;
    parameters?: any;
    execute: (
      toolCallId: string,
      params: any,
      signal: AbortSignal,
      onUpdate: (u: any) => void,
      ctx: CommandContext
    ) => any | Promise<any>;
  };
}
