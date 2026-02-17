import { describe, it, expect, beforeEach } from 'vitest';
import {
	memberState,
	setMembers,
	addMember,
	removeMember,
	removeMemberFromAll,
	updatePresence,
	updateMemberModes,
	getMembers,
	getMembersByRole,
	getMember,
	resetMembers,
	type Member,
} from './members.svelte';

function makeMember(overrides: Partial<Member> = {}): Member {
	return {
		nick: overrides.nick ?? 'alice',
		account: overrides.account ?? 'alice',
		modes: overrides.modes ?? [],
		highestMode: overrides.highestMode ?? null,
		isAway: overrides.isAway ?? false,
		awayReason: overrides.awayReason ?? null,
		presence: overrides.presence ?? 'online',
	};
}

describe('member state', () => {
	beforeEach(() => {
		resetMembers();
	});

	describe('setMembers', () => {
		it('sets the full member list for a channel', () => {
			const members = [
				makeMember({ nick: 'alice' }),
				makeMember({ nick: 'bob' }),
			];
			setMembers('#test', members);
			expect(getMembers('#test')).toHaveLength(2);
		});

		it('replaces existing members', () => {
			setMembers('#test', [makeMember({ nick: 'alice' })]);
			setMembers('#test', [makeMember({ nick: 'bob' })]);
			const members = getMembers('#test');
			expect(members).toHaveLength(1);
			expect(members[0].nick).toBe('bob');
		});
	});

	describe('addMember', () => {
		it('adds a member to a channel', () => {
			addMember('#test', makeMember({ nick: 'alice' }));
			expect(getMembers('#test')).toHaveLength(1);
			expect(getMembers('#test')[0].nick).toBe('alice');
		});

		it('creates the channel entry if it does not exist', () => {
			expect(getMembers('#new')).toEqual([]);
			addMember('#new', makeMember({ nick: 'alice' }));
			expect(getMembers('#new')).toHaveLength(1);
		});

		it('overwrites existing member with same nick', () => {
			addMember('#test', makeMember({ nick: 'alice', account: 'alice1' }));
			addMember('#test', makeMember({ nick: 'alice', account: 'alice2' }));
			const members = getMembers('#test');
			expect(members).toHaveLength(1);
			expect(members[0].account).toBe('alice2');
		});
	});

	describe('removeMember', () => {
		it('removes a member from a channel', () => {
			addMember('#test', makeMember({ nick: 'alice' }));
			addMember('#test', makeMember({ nick: 'bob' }));
			removeMember('#test', 'alice');
			const members = getMembers('#test');
			expect(members).toHaveLength(1);
			expect(members[0].nick).toBe('bob');
		});

		it('does nothing for unknown nick', () => {
			addMember('#test', makeMember({ nick: 'alice' }));
			removeMember('#test', 'unknown');
			expect(getMembers('#test')).toHaveLength(1);
		});

		it('does nothing for unknown channel', () => {
			removeMember('#nope', 'alice');
			// No error thrown
		});
	});

	describe('removeMemberFromAll', () => {
		it('removes a member from all channels', () => {
			addMember('#a', makeMember({ nick: 'alice' }));
			addMember('#b', makeMember({ nick: 'alice' }));
			addMember('#b', makeMember({ nick: 'bob' }));
			removeMemberFromAll('alice');
			expect(getMembers('#a')).toHaveLength(0);
			expect(getMembers('#b')).toHaveLength(1);
			expect(getMembers('#b')[0].nick).toBe('bob');
		});
	});

	describe('updatePresence', () => {
		it('updates away status for a member across channels', () => {
			addMember('#a', makeMember({ nick: 'alice' }));
			addMember('#b', makeMember({ nick: 'alice' }));
			updatePresence('alice', true, 'Gone fishing');
			expect(getMember('#a', 'alice')?.isAway).toBe(true);
			expect(getMember('#a', 'alice')?.awayReason).toBe('Gone fishing');
			expect(getMember('#b', 'alice')?.isAway).toBe(true);
		});

		it('sets presence to online when not away', () => {
			addMember('#test', makeMember({ nick: 'alice', isAway: true, presence: 'idle' }));
			updatePresence('alice', false);
			const m = getMember('#test', 'alice');
			expect(m?.isAway).toBe(false);
			expect(m?.awayReason).toBeNull();
			expect(m?.presence).toBe('online');
		});

		it('detects DND from [DND] prefix in away reason', () => {
			addMember('#test', makeMember({ nick: 'alice' }));
			updatePresence('alice', true, '[DND] Do not disturb');
			const m = getMember('#test', 'alice');
			expect(m?.presence).toBe('dnd');
			expect(m?.awayReason).toBe('[DND] Do not disturb');
		});

		it('sets presence to idle for regular away', () => {
			addMember('#test', makeMember({ nick: 'alice' }));
			updatePresence('alice', true, 'brb');
			expect(getMember('#test', 'alice')?.presence).toBe('idle');
		});

		it('sets presence to idle for away with no reason', () => {
			addMember('#test', makeMember({ nick: 'alice' }));
			updatePresence('alice', true);
			expect(getMember('#test', 'alice')?.presence).toBe('idle');
		});
	});

	describe('updateMemberModes', () => {
		it('updates modes and recalculates highestMode', () => {
			addMember('#test', makeMember({ nick: 'alice' }));
			updateMemberModes('#test', 'alice', ['@', '+']);
			const m = getMember('#test', 'alice');
			expect(m?.modes).toEqual(['@', '+']);
			expect(m?.highestMode).toBe('@');
		});

		it('sets highestMode to null when no modes', () => {
			addMember('#test', makeMember({ nick: 'alice', modes: ['@'], highestMode: '@' }));
			updateMemberModes('#test', 'alice', []);
			expect(getMember('#test', 'alice')?.highestMode).toBeNull();
		});

		it('follows mode precedence: ~ > & > @ > % > +', () => {
			addMember('#test', makeMember({ nick: 'alice' }));
			updateMemberModes('#test', 'alice', ['+', '~']);
			expect(getMember('#test', 'alice')?.highestMode).toBe('~');

			updateMemberModes('#test', 'alice', ['%', '&']);
			expect(getMember('#test', 'alice')?.highestMode).toBe('&');
		});
	});

	describe('getMembers', () => {
		it('returns empty array for unknown channel', () => {
			expect(getMembers('#unknown')).toEqual([]);
		});

		it('returns members sorted by role then alphabetically', () => {
			addMember('#test', makeMember({ nick: 'zach', modes: ['@'], highestMode: '@' }));
			addMember('#test', makeMember({ nick: 'alice', modes: [], highestMode: null }));
			addMember('#test', makeMember({ nick: 'bob', modes: ['@'], highestMode: '@' }));
			addMember('#test', makeMember({ nick: 'carol', modes: ['+'], highestMode: '+' }));

			const members = getMembers('#test');
			const nicks = members.map((m) => m.nick);
			// Ops first (sorted), then voiced (sorted), then regular (sorted)
			expect(nicks).toEqual(['bob', 'zach', 'carol', 'alice']);
		});

		it('sorts ~ before & before @ before % before + before null', () => {
			addMember('#test', makeMember({ nick: 'a', highestMode: '+' }));
			addMember('#test', makeMember({ nick: 'b', highestMode: '~' }));
			addMember('#test', makeMember({ nick: 'c', highestMode: '@' }));
			addMember('#test', makeMember({ nick: 'd', highestMode: null }));
			addMember('#test', makeMember({ nick: 'e', highestMode: '&' }));
			addMember('#test', makeMember({ nick: 'f', highestMode: '%' }));

			const nicks = getMembers('#test').map((m) => m.nick);
			expect(nicks).toEqual(['b', 'e', 'c', 'f', 'a', 'd']);
		});
	});

	describe('getMembersByRole', () => {
		it('groups members by their highest mode', () => {
			addMember('#test', makeMember({ nick: 'op1', highestMode: '@' }));
			addMember('#test', makeMember({ nick: 'op2', highestMode: '@' }));
			addMember('#test', makeMember({ nick: 'voice1', highestMode: '+' }));
			addMember('#test', makeMember({ nick: 'reg1', highestMode: null }));

			const grouped = getMembersByRole('#test');
			expect(grouped.get('@')).toHaveLength(2);
			expect(grouped.get('+')?.map((m) => m.nick)).toEqual(['voice1']);
			expect(grouped.get('')).toHaveLength(1);
		});

		it('returns empty map for unknown channel', () => {
			const grouped = getMembersByRole('#unknown');
			expect(grouped.size).toBe(0);
		});

		it('sorts members within each role alphabetically', () => {
			addMember('#test', makeMember({ nick: 'zach', highestMode: '@' }));
			addMember('#test', makeMember({ nick: 'alice', highestMode: '@' }));

			const ops = getMembersByRole('#test').get('@')!;
			expect(ops.map((m) => m.nick)).toEqual(['alice', 'zach']);
		});
	});

	describe('getMember', () => {
		it('returns a member by nick', () => {
			addMember('#test', makeMember({ nick: 'alice', account: 'alice_acct' }));
			const m = getMember('#test', 'alice');
			expect(m).not.toBeNull();
			expect(m!.account).toBe('alice_acct');
		});

		it('returns null for unknown nick', () => {
			expect(getMember('#test', 'nobody')).toBeNull();
		});

		it('returns null for unknown channel', () => {
			expect(getMember('#nope', 'alice')).toBeNull();
		});
	});

	describe('resetMembers', () => {
		it('clears all member state', () => {
			addMember('#a', makeMember({ nick: 'alice' }));
			addMember('#b', makeMember({ nick: 'bob' }));
			resetMembers();
			expect(getMembers('#a')).toEqual([]);
			expect(getMembers('#b')).toEqual([]);
			expect(memberState.channels.size).toBe(0);
		});
	});
});
