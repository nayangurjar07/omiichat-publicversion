/**
 * Socket.IO event name constants.
 * Single source of truth for all event names used across client and server.
 */
export const EVENTS = {
  // ─── 1-to-1 Client → Server ──────────────────────────────────
  JOIN_QUEUE: 'join_queue',
  LEAVE_QUEUE: 'leave_queue',
  SEND_MESSAGE: 'send_message',
  TYPING: 'typing',
  SKIP: 'skip',
  BLOCK: 'block',
  REPORT: 'report',

  // ─── 1-to-1 Server → Client ──────────────────────────────────
  MATCHED: 'matched',
  MESSAGE: 'message',
  PARTNER_TYPING: 'partner_typing',
  PARTNER_LEFT: 'partner_left',
  RATE_LIMITED: 'rate_limited',
  BANNED: 'banned',
  ONLINE_COUNT: 'online_count',
  QUEUE_STATUS: 'queue_status',
  ERROR: 'error',

  // ─── Reconnect Events ─────────────────────────────────────────
  RECONNECT_REQUEST: 'reconnect_request',
  RECONNECT_CODE: 'reconnect_code',
  RECONNECT_JOIN: 'reconnect_join',
  RECONNECT_FAILED: 'reconnect_failed',

  // ─── Public & Private Room Events ────────────────────────────
  ROOM_GET_LIST: 'room_get_list',
  ROOM_LIST: 'room_list',
  ROOM_JOIN: 'room_join',
  ROOM_JOINED: 'room_joined',
  ROOM_LEAVE: 'room_leave',
  ROOM_USER_JOINED: 'room_user_joined',
  ROOM_USER_LEFT: 'room_user_left',
  ROOM_SEND_MESSAGE: 'room_send_message',
  ROOM_MESSAGE: 'room_message',
  ROOM_TYPING: 'room_typing',
  ROOM_USER_TYPING: 'room_user_typing',
  ROOM_KICK: 'room_kick',
  ROOM_KICKED: 'room_kicked',
  ROOM_MUTE: 'room_mute',
  ROOM_MUTED: 'room_muted',
  ROOM_MEMBERS: 'room_members',
  ROOM_CREATE_PRIVATE: 'room_create_private',
  ROOM_CREATED_PRIVATE: 'room_created_private',
  ROOM_REPORT_MESSAGE: 'room_report_message',

  // ─── Friend System Events ─────────────────────────────────────
  FRIEND_REQUEST_SEND: 'friend_request_send',
  FRIEND_REQUEST_RECEIVED: 'friend_request_received',
  FRIEND_REQUEST_RESPOND: 'friend_request_respond',
  FRIEND_REQUEST_RESOLVED: 'friend_request_resolved',
  FRIEND_PRESENCE_SUBSCRIBE: 'friend_presence_subscribe',
  FRIEND_PRESENCE_DATA: 'friend_presence_data',
  FRIEND_PRESENCE_UPDATE: 'friend_presence_update',
  FRIEND_CHAT_INVITE: 'friend_chat_invite',
  FRIEND_REGISTER: 'friend_register',
} as const;

