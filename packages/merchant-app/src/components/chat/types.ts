import type { ChatMessageItem } from '../../services/store'

export type ChatSendStatus = 'sending' | 'failed'

export type ChatUiMessage = ChatMessageItem & {
  _status?: ChatSendStatus
  _localPath?: string
}
