/**
 * Keeps commerce-event decisions independent from ArkUI and WebSocket code so
 * the same rules can be verified by Hypium without a device connection.
 */
export class CommerceEventPolicy {
  static refreshesCommerce(event: string): boolean {
    return event === 'order.new' || event === 'order.update' || event === 'refund.new';
  }

  static isIncomingChat(event: string, fromRole: string = '', sender: string = ''): boolean {
    return event === 'chat.message' && fromRole !== 'merchant' && sender !== 'merchant';
  }

  static shouldAlert(
    event: string,
    orderAlerts: boolean,
    refundAlerts: boolean,
    chatAlerts: boolean,
    fromRole: string = '',
    sender: string = ''
  ): boolean {
    if (event === 'order.new') return orderAlerts;
    if (event === 'refund.new') return refundAlerts;
    if (CommerceEventPolicy.isIncomingChat(event, fromRole, sender)) return chatAlerts;
    return false;
  }

  static isAuthenticationFailure(event: string): boolean {
    return event === 'auth.failed';
  }
}
