import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	channelUIState,
	setCategories,
	setActiveChannel,
	resetChannelUI,
	reorderChannels,
	resetChannelOrder,
	type ChannelCategory,
} from './channels.svelte';

/**
 * Minimal localStorage mock — vitest runs in Node where localStorage
 * is not available by default.
 */
function createLocalStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
		get length() {
			return store.size;
		},
		key: (_index: number) => null,
	} as Storage;
}

describe('channels UI state', () => {
	beforeEach(() => {
		resetChannelUI();
	});

	it('setCategories populates categories with voice flag', () => {
		setCategories([
			{ name: 'Text', channels: ['#general', '#dev'] },
			{ name: 'Voice', channels: ['#voice-lobby'], voice: true },
		]);
		expect(channelUIState.categories).toHaveLength(2);
		expect(channelUIState.categories[0].voice).toBeUndefined();
		expect(channelUIState.categories[1].voice).toBe(true);
	});

	it('setCategories maps readonly flag to isReadonly', () => {
		setCategories([
			{ name: 'Text', channels: ['#general'] },
			{ name: 'Info', channels: ['#rules', '#welcome'], readonly: true },
		]);
		expect(channelUIState.categories).toHaveLength(2);
		expect(channelUIState.categories[0].isReadonly).toBeUndefined();
		expect(channelUIState.categories[1].isReadonly).toBe(true);
		expect(channelUIState.categories[1].channels).toEqual(['#rules', '#welcome']);
	});

	it('setCategories starts all categories expanded', () => {
		setCategories([
			{ name: 'A', channels: ['#a'] },
			{ name: 'B', channels: ['#b'], readonly: true },
		]);
		expect(channelUIState.categories[0].collapsed).toBe(false);
		expect(channelUIState.categories[1].collapsed).toBe(false);
	});

	it('setActiveChannel updates activeChannel', () => {
		expect(channelUIState.activeChannel).toBeNull();
		setActiveChannel('#general');
		expect(channelUIState.activeChannel).toBe('#general');
	});

	it('resetChannelUI clears all UI state', () => {
		setCategories([{ name: 'Text', channels: ['#general'] }]);
		setActiveChannel('#general');
		resetChannelUI();
		expect(channelUIState.activeChannel).toBeNull();
		expect(channelUIState.categories).toHaveLength(0);
	});

	describe('reorderChannels', () => {
		beforeEach(() => {
			setCategories([
				{ name: 'Text', channels: ['#general', '#dev', '#help', '#off-topic'] },
				{ name: 'Voice', channels: ['#lobby', '#gaming'], voice: true },
			]);
		});

		it('moves a channel forward within a category', () => {
			reorderChannels('Text', 0, 2);
			expect(channelUIState.categories[0].channels).toEqual([
				'#dev', '#help', '#general', '#off-topic',
			]);
		});

		it('moves a channel backward within a category', () => {
			reorderChannels('Text', 3, 1);
			expect(channelUIState.categories[0].channels).toEqual([
				'#general', '#off-topic', '#dev', '#help',
			]);
		});

		it('no-ops when fromIndex === toIndex', () => {
			reorderChannels('Text', 1, 1);
			expect(channelUIState.categories[0].channels).toEqual([
				'#general', '#dev', '#help', '#off-topic',
			]);
		});

		it('no-ops for out-of-bounds fromIndex', () => {
			reorderChannels('Text', -1, 2);
			expect(channelUIState.categories[0].channels).toEqual([
				'#general', '#dev', '#help', '#off-topic',
			]);
		});

		it('no-ops for out-of-bounds toIndex', () => {
			reorderChannels('Text', 0, 10);
			expect(channelUIState.categories[0].channels).toEqual([
				'#general', '#dev', '#help', '#off-topic',
			]);
		});

		it('no-ops for unknown category', () => {
			reorderChannels('Nonexistent', 0, 1);
			// Original categories unchanged
			expect(channelUIState.categories[0].channels).toEqual([
				'#general', '#dev', '#help', '#off-topic',
			]);
		});

		it('reorders within voice category independently', () => {
			reorderChannels('Voice', 0, 1);
			expect(channelUIState.categories[1].channels).toEqual(['#gaming', '#lobby']);
			// Text category unchanged
			expect(channelUIState.categories[0].channels).toEqual([
				'#general', '#dev', '#help', '#off-topic',
			]);
		});
	});

	describe('channel order localStorage persistence', () => {
		let storage: Storage;

		beforeEach(() => {
			storage = createLocalStorageMock();
			vi.stubGlobal('localStorage', storage);
			resetChannelUI();
			resetChannelOrder();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('persists channel order after reorder', () => {
			setCategories([
				{ name: 'Text', channels: ['#general', '#dev', '#help'] },
			]);
			reorderChannels('Text', 0, 2);
			const stored = JSON.parse(storage.getItem('virc:channelOrder')!);
			expect(stored).toEqual({ Text: ['#dev', '#help', '#general'] });
		});

		it('restores saved order when setCategories is called', () => {
			// Simulate a previously saved order
			storage.setItem('virc:channelOrder', JSON.stringify({
				Text: ['#help', '#general', '#dev'],
			}));
			setCategories([
				{ name: 'Text', channels: ['#general', '#dev', '#help'] },
			]);
			expect(channelUIState.categories[0].channels).toEqual([
				'#help', '#general', '#dev',
			]);
		});

		it('appends new channels not in saved order', () => {
			storage.setItem('virc:channelOrder', JSON.stringify({
				Text: ['#dev', '#general'],
			}));
			setCategories([
				{ name: 'Text', channels: ['#general', '#dev', '#help'] },
			]);
			// #help is new, appended at end
			expect(channelUIState.categories[0].channels).toEqual([
				'#dev', '#general', '#help',
			]);
		});

		it('drops saved channels removed from config', () => {
			storage.setItem('virc:channelOrder', JSON.stringify({
				Text: ['#dev', '#help', '#general', '#removed'],
			}));
			setCategories([
				{ name: 'Text', channels: ['#general', '#dev'] },
			]);
			// #help and #removed not in config, filtered out
			expect(channelUIState.categories[0].channels).toEqual([
				'#dev', '#general',
			]);
		});

		it('resetChannelOrder clears localStorage', () => {
			setCategories([{ name: 'Text', channels: ['#a', '#b'] }]);
			reorderChannels('Text', 0, 1);
			expect(storage.getItem('virc:channelOrder')).not.toBeNull();
			resetChannelOrder();
			expect(storage.getItem('virc:channelOrder')).toBeNull();
		});

		it('handles corrupt localStorage gracefully', () => {
			storage.setItem('virc:channelOrder', 'not valid json');
			// Should not throw
			setCategories([
				{ name: 'Text', channels: ['#general', '#dev'] },
			]);
			expect(channelUIState.categories[0].channels).toEqual([
				'#general', '#dev',
			]);
		});
	});
});
