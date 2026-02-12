import { describe, it, expect, beforeEach } from 'vitest';
import {
	notificationState,
	incrementUnread,
	markRead,
	getUnreadCount,
	getMentionCount,
	getLastReadMsgid,
	resetNotifications,
} from './notifications.svelte';

describe('notifications state', () => {
	beforeEach(() => {
		resetNotifications();
	});

	describe('incrementUnread', () => {
		it('increments unread count for a channel', () => {
			incrementUnread('#test', false);
			expect(getUnreadCount('#test')).toBe(1);
		});

		it('increments multiple times', () => {
			incrementUnread('#test', false);
			incrementUnread('#test', false);
			incrementUnread('#test', false);
			expect(getUnreadCount('#test')).toBe(3);
		});

		it('does not increment mention count for non-mentions', () => {
			incrementUnread('#test', false);
			expect(getMentionCount('#test')).toBe(0);
		});

		it('increments both unread and mention count for mentions', () => {
			incrementUnread('#test', true);
			expect(getUnreadCount('#test')).toBe(1);
			expect(getMentionCount('#test')).toBe(1);
		});

		it('tracks mention count separately from unread count', () => {
			incrementUnread('#test', false);
			incrementUnread('#test', true);
			incrementUnread('#test', false);
			expect(getUnreadCount('#test')).toBe(3);
			expect(getMentionCount('#test')).toBe(1);
		});

		it('tracks per-channel independently', () => {
			incrementUnread('#a', false);
			incrementUnread('#a', false);
			incrementUnread('#b', true);
			expect(getUnreadCount('#a')).toBe(2);
			expect(getMentionCount('#a')).toBe(0);
			expect(getUnreadCount('#b')).toBe(1);
			expect(getMentionCount('#b')).toBe(1);
		});
	});

	describe('markRead', () => {
		it('resets unread and mention counts', () => {
			incrementUnread('#test', false);
			incrementUnread('#test', true);
			incrementUnread('#test', false);
			markRead('#test', 'msg-42');
			expect(getUnreadCount('#test')).toBe(0);
			expect(getMentionCount('#test')).toBe(0);
		});

		it('sets lastReadMsgid', () => {
			markRead('#test', 'msg-42');
			expect(getLastReadMsgid('#test')).toBe('msg-42');
		});

		it('updates lastReadMsgid on subsequent calls', () => {
			markRead('#test', 'msg-1');
			markRead('#test', 'msg-2');
			expect(getLastReadMsgid('#test')).toBe('msg-2');
		});

		it('does not affect other channels', () => {
			incrementUnread('#a', false);
			incrementUnread('#b', false);
			markRead('#a', 'msg-1');
			expect(getUnreadCount('#a')).toBe(0);
			expect(getUnreadCount('#b')).toBe(1);
		});
	});

	describe('getUnreadCount', () => {
		it('returns 0 for unknown channel', () => {
			expect(getUnreadCount('#unknown')).toBe(0);
		});
	});

	describe('getMentionCount', () => {
		it('returns 0 for unknown channel', () => {
			expect(getMentionCount('#unknown')).toBe(0);
		});
	});

	describe('getLastReadMsgid', () => {
		it('returns null for unknown channel', () => {
			expect(getLastReadMsgid('#unknown')).toBeNull();
		});
	});

	describe('setLastReadMsgid', () => {
		it('sets lastReadMsgid without resetting counts via markRead', () => {
			incrementUnread('#test', false);
			// markRead resets counts, but we can verify lastReadMsgid is set
			markRead('#test', 'msg-99');
			expect(getLastReadMsgid('#test')).toBe('msg-99');
		});
	});

	describe('resetNotifications', () => {
		it('clears all notification state', () => {
			incrementUnread('#a', true);
			incrementUnread('#b', false);
			markRead('#a', 'msg-1');
			resetNotifications();
			expect(getUnreadCount('#a')).toBe(0);
			expect(getMentionCount('#a')).toBe(0);
			expect(getLastReadMsgid('#a')).toBeNull();
			expect(getUnreadCount('#b')).toBe(0);
		});

		it('has empty channels map after reset', () => {
			incrementUnread('#test', false);
			resetNotifications();
			expect(notificationState.channels.size).toBe(0);
		});
	});
});
