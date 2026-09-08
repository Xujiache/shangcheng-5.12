import { ChatMessage } from '../business/BusinessModels';

/**
 * Deterministic chat-list reconciliation shared by HTTP confirmation,
 * WebSocket delivery and cursor pagination.
 *
 * Keeping this logic free of ArkUI and native sockets makes the ordering and
 * de-duplication contract executable in Hypium while the page remains the
 * owner of transport and visual state.
 */
export class ChatMessagePolicy {
  static reconcileRealtime(messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
    if (messages.some((item: ChatMessage): boolean => item.id === incoming.id)) return messages;
    const pendingIndex = incoming.sender === 'merchant'
      ? messages.findIndex((item: ChatMessage): boolean =>
        item.sendState === 'sending' && item.type === incoming.type && item.content === incoming.content)
      : -1;
    if (pendingIndex < 0) return messages.concat([incoming]);
    const next = messages.slice();
    next[pendingIndex] = incoming;
    return next;
  }

  static confirmHttp(
    messages: ChatMessage[],
    optimisticId: string,
    serverMessage: ChatMessage
  ): ChatMessage[] {
    return messages.filter((item: ChatMessage): boolean =>
      item.id !== optimisticId && item.id !== serverMessage.id).concat([serverMessage]);
  }

  static markFailed(messages: ChatMessage[], optimisticId: string): ChatMessage[] {
    return messages.map((item: ChatMessage): ChatMessage => item.id === optimisticId
      ? ChatMessagePolicy.copy(item, 'failed', item.read)
      : item);
  }

  static markMerchantRead(messages: ChatMessage[]): ChatMessage[] {
    return messages.map((item: ChatMessage): ChatMessage =>
      item.sender === 'merchant' && !item.read
        ? ChatMessagePolicy.copy(item, item.sendState, true)
        : item);
  }

  static prependEarlier(messages: ChatMessage[], earlier: ChatMessage[]): ChatMessage[] {
    const existing = new Set(messages.map((item: ChatMessage): string => item.id));
    return earlier.filter((item: ChatMessage): boolean => !existing.has(item.id)).concat(messages);
  }

  private static copy(item: ChatMessage, sendState: string | undefined, read: boolean): ChatMessage {
    return {
      id: item.id,
      sessionId: item.sessionId,
      sender: item.sender,
      type: item.type,
      content: item.content,
      createdAt: item.createdAt,
      read,
      sendState
    };
  }
}
