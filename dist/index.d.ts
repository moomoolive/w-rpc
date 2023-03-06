import { TransferValue } from "./transfer";
type RpcResponse<State extends object> = ((() => any) | ((param: any) => any) | ((param: any, state: State) => any));
type RpcOutboundAction = ((() => any) | ((param: any) => any) | ((param: any, state: any) => any));
type TerminalOutboundActions = {
    readonly [key: string]: RpcOutboundAction;
};
export type TerminalActions<State extends object> = {
    readonly [key: string]: RpcResponse<State>;
};
type TransferableFunctionReturn<T> = T extends TransferValue<infer ValueType> ? ValueType : T;
export type RpcReturn<T> = T extends Promise<infer PromiseResolve> ? Promise<TransferableFunctionReturn<PromiseResolve>> : Promise<TransferableFunctionReturn<T>>;
export type MessageContainer = {
    handle: string;
    id: number;
    respondingTo: number;
    data: unknown;
};
type TerminalActionTuples<T extends TerminalOutboundActions> = {
    [key in keyof T]: Parameters<T[key]> extends ([param: any] | [param: any, state: any]) ? Parameters<T[key]>[0] extends (null | undefined) ? [] : [param: Parameters<T[key]>[0]] : [];
};
export declare const OUTBOUND_MESSAGE = -1;
export declare const ERROR_RESPONSE_HANDLE = "__x_rpc_error__";
export declare const RESPONSE_HANDLE = "__x_rpc_response__";
export type MessageHandler = (event: {
    data: unknown;
    source: MessagableEntity;
} | {
    data: unknown;
}) => unknown;
export type MessagableEntity = {
    postMessage: (data: any, transferables: Transferable[]) => unknown;
    addEventListener: (event: "message", handler: MessageHandler) => unknown;
    removeEventListener: (event: "message", handler: MessageHandler) => unknown;
};
export type MessageTarget = {
    postMessage: (data: any, transferables: Transferable[]) => unknown;
};
type RpcConfig<State extends object> = {
    messageTarget: MessagableEntity;
    responses: TerminalActions<State>;
    state: State;
};
export declare class wRpc<RecipentActions extends TerminalOutboundActions, State extends object = {}> {
    static transfer: <T>(value: T, transferables: Transferable[]) => TransferValue<T>;
    private idCount;
    private queue;
    private actionsIndex;
    private messageContainer;
    private messageTarget;
    private messageHandlerRef;
    state: State;
    constructor({ responses, messageTarget, state }: RpcConfig<State>);
    cleanup(): boolean;
    replaceMessageTarget(messageTarget: MessagableEntity): boolean;
    executeWithSource<T extends keyof RecipentActions>(name: T & string, source: MessageTarget, data: Parameters<RecipentActions[T]>[0] extends undefined ? null : Parameters<RecipentActions[T]>[0], transferables?: Transferable[]): Promise<RpcReturn<ReturnType<RecipentActions[T]>>>;
    execute<T extends keyof RecipentActions>(name: T & string, ...args: TerminalActionTuples<RecipentActions>[T] extends [params: any] ? ([
        param: TerminalActionTuples<RecipentActions>[T][0]
    ] | [param: TerminalActionTuples<RecipentActions>[T][0], transferables: Transferable[]]) : []): Promise<RpcReturn<ReturnType<RecipentActions[T]>>>;
    private outboundMessage;
    private responseMessage;
    private errorResponseMessage;
    private transferMessage;
    private consumeMessage;
    addResponses(responses: TerminalActions<State>, { allowOverwrite }?: {
        allowOverwrite?: boolean | undefined;
    }): boolean;
}
export {};
//# sourceMappingURL=index.d.ts.map