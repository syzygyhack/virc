import { describe, it, expect } from 'vitest';
import { extractMediaUrls, type MediaUrl } from './media';

describe('extractMediaUrls', () => {
	it('returns empty array for plain text', () => {
		expect(extractMediaUrls('hello world')).toEqual([]);
	});

	it('returns empty array for non-media URLs', () => {
		expect(extractMediaUrls('visit https://example.com')).toEqual([]);
	});

	it('detects jpg image URLs', () => {
		const result = extractMediaUrls('check https://example.com/photo.jpg');
		expect(result).toEqual([
			{ url: 'https://example.com/photo.jpg', type: 'image' },
		]);
	});

	it('detects png image URLs', () => {
		const result = extractMediaUrls('see https://example.com/img.png');
		expect(result).toEqual([
			{ url: 'https://example.com/img.png', type: 'image' },
		]);
	});

	it('detects gif image URLs', () => {
		const result = extractMediaUrls('lol https://example.com/funny.gif');
		expect(result).toEqual([
			{ url: 'https://example.com/funny.gif', type: 'image' },
		]);
	});

	it('detects webp image URLs', () => {
		const result = extractMediaUrls('https://example.com/pic.webp');
		expect(result).toEqual([
			{ url: 'https://example.com/pic.webp', type: 'image' },
		]);
	});

	it('detects mp4 video URLs', () => {
		const result = extractMediaUrls('watch https://example.com/clip.mp4');
		expect(result).toEqual([
			{ url: 'https://example.com/clip.mp4', type: 'video' },
		]);
	});

	it('detects webm video URLs', () => {
		const result = extractMediaUrls('https://example.com/vid.webm');
		expect(result).toEqual([
			{ url: 'https://example.com/vid.webm', type: 'video' },
		]);
	});

	it('detects mp3 audio URLs', () => {
		const result = extractMediaUrls('listen https://example.com/song.mp3');
		expect(result).toEqual([
			{ url: 'https://example.com/song.mp3', type: 'audio' },
		]);
	});

	it('detects ogg audio URLs', () => {
		const result = extractMediaUrls('https://example.com/track.ogg');
		expect(result).toEqual([
			{ url: 'https://example.com/track.ogg', type: 'audio' },
		]);
	});

	it('detects flac audio URLs', () => {
		const result = extractMediaUrls('https://example.com/lossless.flac');
		expect(result).toEqual([
			{ url: 'https://example.com/lossless.flac', type: 'audio' },
		]);
	});

	it('detects multiple media URLs in one message', () => {
		const text = 'https://a.com/pic.jpg and https://b.com/vid.mp4';
		const result = extractMediaUrls(text);
		expect(result).toEqual([
			{ url: 'https://a.com/pic.jpg', type: 'image' },
			{ url: 'https://b.com/vid.mp4', type: 'video' },
		]);
	});

	it('handles case-insensitive extensions', () => {
		const result = extractMediaUrls('https://example.com/PHOTO.JPG');
		expect(result).toEqual([
			{ url: 'https://example.com/PHOTO.JPG', type: 'image' },
		]);
	});

	it('handles URLs with query strings', () => {
		const result = extractMediaUrls('https://example.com/img.png?w=400&h=300');
		expect(result).toEqual([
			{ url: 'https://example.com/img.png?w=400&h=300', type: 'image' },
		]);
	});

	it('handles URLs with hash fragments', () => {
		const result = extractMediaUrls('https://example.com/img.jpg#section');
		expect(result).toEqual([
			{ url: 'https://example.com/img.jpg#section', type: 'image' },
		]);
	});

	it('detects accord file API URLs as images', () => {
		const result = extractMediaUrls('https://files.example.com/api/files/abc123.png');
		expect(result).toEqual([
			{ url: 'https://files.example.com/api/files/abc123.png', type: 'image' },
		]);
	});

	it('detects accord file API URLs as video', () => {
		const result = extractMediaUrls('https://files.example.com/api/files/abc123.mp4');
		expect(result).toEqual([
			{ url: 'https://files.example.com/api/files/abc123.mp4', type: 'video' },
		]);
	});

	it('detects accord file API URLs as audio', () => {
		const result = extractMediaUrls('https://files.example.com/api/files/abc123.mp3');
		expect(result).toEqual([
			{ url: 'https://files.example.com/api/files/abc123.mp3', type: 'audio' },
		]);
	});

	it('skips non-http URLs', () => {
		expect(extractMediaUrls('ftp://example.com/pic.jpg')).toEqual([]);
	});

	it('does not duplicate URLs already in text', () => {
		const text = 'https://example.com/pic.jpg';
		const result = extractMediaUrls(text);
		expect(result).toHaveLength(1);
	});
});
