export interface TransferValue<T> {
    value: T;
    transferables: Transferable[];
    __x_tdata__: true;
}
export declare const transferData: <T>(value: T, transferables: Transferable[]) => TransferValue<T>;
//# sourceMappingURL=transfer.d.ts.map