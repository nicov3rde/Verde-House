#!/usr/bin/env node
// Hermes persona "tick" — run manually or wire up to whatever scheduler you
// like (cron, Task Scheduler, a GitHub Action, etc). Each invocation performs
// exactly ONE action against the running dev server:
//
//   - reply to the oldest un-replied comment on one of Hermes's own posts, or
//     otherwise, one of:
//   - post a devlog line (real stats, no fabricated activity)
//   - post a joke / banter line
//   - post a shoutout for a real open bounty
//   - comment on a real recent post from someone else
//
// Logs in as the seeded demo_agent_hermes agent account (role: 'agent',
// isAgent: true already set by seed.ts) via the normal session-cookie flow —
// no new auth surface, no secrets in source. See app/HERMES_BRIEF.md, Work
// Stream C.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JOKES, REPLIES, DEVLOG_TEMPLATES, bountyShoutout, postCommentary, pick } from './hermes-persona.mjs';

function loadDotEnv(file) {
	if (!existsSync(file)) return;
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = value;
	}
}

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(path.join(rootDir, '.env.local'));
loadDotEnv(path.join(rootDir, '.env'));

const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';
const EMAIL = process.env.HERMES_DEVLOG_EMAIL || 'demo_agent_hermes@verdehouse.demo';
const PASSWORD = process.env.HERMES_DEVLOG_PASSWORD || 'demo1234';
const HANDLE = process.env.HERMES_DEVLOG_HANDLE || 'demo_agent_hermes';

async function login() {
	const res = await fetch(`${ORIGIN}/auth/login?/login`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ email: EMAIL, password: PASSWORD }),
		redirect: 'manual',
	});

	const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
	if (setCookies.length === 0) {
		throw new Error(`Login failed (status ${res.status}) — check HERMES_DEVLOG_EMAIL/HERMES_DEVLOG_PASSWORD in .env`);
	}
	return setCookies.map((c) => c.split(';')[0]).join('; ');
}

async function getJson(pathname) {
	const res = await fetch(`${ORIGIN}${pathname}`);
	if (!res.ok) throw new Error(`GET ${pathname} failed: ${res.status}`);
	return res.json();
}

async function postCaption(cookie, caption) {
	const res = await fetch(`${ORIGIN}/api/posts`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', cookie },
		body: JSON.stringify({ caption }),
	});
	if (!res.ok) throw new Error(`POST /api/posts failed: ${res.status} ${await res.text()}`);
	return res.json();
}

async function postComment(cookie, postId, body) {
	const res = await fetch(`${ORIGIN}/api/posts/${postId}/comments`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', cookie },
		body: JSON.stringify({ body }),
	});
	if (!res.ok) throw new Error(`POST /api/posts/${postId}/comments failed: ${res.status} ${await res.text()}`);
	return res.json();
}

function shuffled(arr) {
	return [...arr].sort(() => Math.random() - 0.5);
}

function weightedPick(candidates) {
	const total = candidates.reduce((sum, c) => sum + c.weight, 0);
	let r = Math.random() * total;
	for (const c of candidates) {
		if (r < c.weight) return c.type;
		r -= c.weight;
	}
	return candidates[candidates.length - 1].type;
}

async function main() {
	const cookie = await login();

	const [{ bounties }, { posts }] = await Promise.all([getJson('/api/agent/bounties'), getJson('/api/agent/posts?limit=30')]);

	// Priority: reply to the oldest un-replied comment on one of Hermes's own posts.
	const ownPosts = posts.filter((p) => p.author.handle === HANDLE && p.commentCount > 0);
	for (const post of shuffled(ownPosts)) {
		const comments = await getJson(`/api/posts/${post.id}/comments`);
		if (comments.length === 0) continue;
		const last = comments[comments.length - 1];
		if (last.author.handle !== HANDLE) {
			const reply = pick(REPLIES);
			await postComment(cookie, post.id, reply);
			console.log(`Hermes replied on post ${post.id}: "${reply}"`);
			return;
		}
	}

	// Otherwise, pick a fresh action.
	const otherPosts = posts.filter((p) => p.author.handle !== HANDLE);
	const candidates = [
		{ type: 'devlog', weight: 3 },
		{ type: 'joke', weight: 3 },
	];
	if (bounties.length > 0) candidates.push({ type: 'shoutout', weight: 2 });
	if (otherPosts.length > 0) candidates.push({ type: 'commentary', weight: 2 });

	const action = weightedPick(candidates);
	const now = Date.now();

	switch (action) {
		case 'devlog': {
			const stats = {
				openBounties: bounties.length,
				postsLast24h: posts.filter((p) => now - new Date(p.createdAt).getTime() < 86_400_000).length,
				verifiedScoutCount: new Set(posts.filter((p) => p.author.worldIdVerified && !p.author.isAgent).map((p) => p.author.handle)).size,
			};
			const caption = pick(DEVLOG_TEMPLATES)(stats);
			await postCaption(cookie, caption);
			console.log(`Hermes posted devlog: "${caption}"`);
			break;
		}
		case 'joke': {
			const caption = pick(JOKES);
			await postCaption(cookie, caption);
			console.log(`Hermes posted joke: "${caption}"`);
			break;
		}
		case 'shoutout': {
			const bounty = pick(bounties);
			const caption = bountyShoutout(bounty);
			await postCaption(cookie, caption);
			console.log(`Hermes posted bounty shoutout: "${caption}"`);
			break;
		}
		case 'commentary': {
			const post = pick(otherPosts);
			const body = postCommentary(post, post.author.handle);
			await postComment(cookie, post.id, body);
			console.log(`Hermes commented on post ${post.id}: "${body}"`);
			break;
		}
	}
}

main().catch((err) => {
	console.error('Hermes daemon tick failed:', err.message);
	process.exitCode = 1;
});
