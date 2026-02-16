import { describe, it, expect, beforeEach } from 'vitest';
import {
	channelUIState,
	setCategories,
	setActiveChannel,
	resetChannelUI,
	type ChannelCategory,
} from './channels.svelte';

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
});
