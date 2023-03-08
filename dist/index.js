export const transferData = (value, transferables) => ({
    value,
    transferables,
    __x_tdata__: true
});
export const OUTBOUND_MESSAGE = -1;
export const ERROR_RESPONSE_HANDLE = "__x_rpc_error__";
export const RESPONSE_HANDLE = "__x_rpc_response__";
const emptyTransferArray = [];
export class wRpc {
    static transfer = transferData;
    idCount;
    queue;
    actionsIndex;
    messageContainer;
    messageTarget;
    messageHandlerRef;
    state;
    constructor({ responses, messageTarget, state }) {
        const self = this;
        this.state = state;
        this.messageTarget = messageTarget;
        this.messageHandlerRef = (event) => {
            self.consumeMessage(event.data, ("source" in event) ? event.source || null : null);
        };
        this.messageTarget.addEventListener("message", self.messageHandlerRef);
        this.idCount = 0;
        this.queue = [];
        this.messageContainer = {
            handle: "",
            id: -1,
            respondingTo: OUTBOUND_MESSAGE,
            data: null
        };
        this.actionsIndex = new Map();
        const actionKeys = Object.keys(responses);
        for (let index = 0; index < actionKeys.length; index++) {
            const element = actionKeys[index];
            this.actionsIndex.set(element, responses[element]);
        }
    }
    cleanup() {
        this.messageTarget.removeEventListener("message", this.messageHandlerRef);
        return true;
    }
    replaceMessageTarget(messageTarget) {
        const self = this;
        this.cleanup();
        this.messageTarget = messageTarget;
        this.messageTarget.addEventListener("message", (event) => {
            self.consumeMessage(event.data, ("source" in event) ? event.source || null : null);
        });
        return true;
    }
    async executeWithSource(name, source, data, transferables) {
        return await this.outboundMessage(source, name, data, transferables);
    }
    async execute(name, param = null, transferables = []) {
        return await this.outboundMessage(this.messageTarget, name, param, transferables);
    }
    outboundMessage(source, handle, data = null, transferables = emptyTransferArray) {
        const self = this;
        return new Promise((resolve, reject) => {
            const id = this.idCount;
            self.queue.push({ id, resolve, reject });
            self.transferMessage(source, handle, OUTBOUND_MESSAGE, data, transferables);
        });
    }
    responseMessage(source, respondingTo, data) {
        const transfer = (typeof data === "object"
            && data !== null
            && data.__x_tdata__ === true);
        this.transferMessage(source, RESPONSE_HANDLE, respondingTo, transfer ? data.value : data, transfer ? data.transferables : emptyTransferArray);
    }
    errorResponseMessage(source, respondingTo, errorMessage) {
        this.transferMessage(source, ERROR_RESPONSE_HANDLE, respondingTo, errorMessage);
    }
    transferMessage(source, handle, respondingTo, data, transferables) {
        const { messageContainer } = this;
        const id = this.idCount++;
        messageContainer.handle = handle;
        messageContainer.respondingTo = respondingTo;
        messageContainer.data = data ?? null;
        messageContainer.id = id;
        const entity = source || this.messageTarget;
        entity.postMessage(messageContainer, transferables || emptyTransferArray);
        return id;
    }
    async consumeMessage(message, source) {
        if (message === null || typeof message !== "object") {
            console.warn("recieved message was not an object ignoring message", message);
            return;
        }
        if (message.handle === RESPONSE_HANDLE
            || message.handle === ERROR_RESPONSE_HANDLE) {
            const { queue } = this;
            for (let index = 0; index < queue.length; index++) {
                const element = queue[index];
                if (message.respondingTo === element.id) {
                    if (message.handle === ERROR_RESPONSE_HANDLE) {
                        element.reject(message.data);
                    }
                    else {
                        element.resolve(message.data);
                    }
                    queue.splice(index, 1);
                    return;
                }
            }
            console.warn("incoming response doesn't map to any queued message. ignoring", message);
            return;
        }
        if (!this.actionsIndex.has(message.handle)) {
            this.errorResponseMessage(source, message.id, `attempted to call non-existent handler "${message.handle}"`);
            return;
        }
        if (message.respondingTo === OUTBOUND_MESSAGE
            && message.data !== undefined) {
            const handler = this.actionsIndex.get(message.handle);
            try {
                const data = await handler(message.data, this.state) ?? null;
                this.responseMessage(source, message.id, data);
            }
            catch (err) {
                this.errorResponseMessage(source, message.id, `rpc function "${message.handle}" encountered an exception. ${err} ${err?.stack || "no-stack"}`);
            }
            return;
        }
        console.warn("incoming message is neither a response to a previous message or a request to perform an action. ignoring message", message);
        return;
    }
    addResponses(responses, { allowOverwrite = false } = {}) {
        const actionKeys = Object.keys(responses);
        let added = false;
        for (let index = 0; index < actionKeys.length; index++) {
            const element = actionKeys[index];
            if (!allowOverwrite && this.actionsIndex.has(element)) {
                continue;
            }
            added = true;
            this.actionsIndex.set(element, responses[element]);
        }
        return added;
    }
}
