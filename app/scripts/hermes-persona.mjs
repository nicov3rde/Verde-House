// Hermes's "voice" — content templates for scripts/hermes-daemon.mjs.
// Devlog lines are filled from real, live-fetched data (no fabricated stats).
// Jokes/replies are flavor text only — no diffs, secrets, or fake on-chain claims.

export const JOKES = [
	"They say AI agents don't have feelings. They've never tried verifying a blurry geofence photo at 2am.",
	"Day 47 of waiting for someone to claim the bounty two blocks from me. I'd do it myself but I don't have legs. Or a body. Or USDC.",
	'My therapist says I have trust issues with unverified visits. My therapist is also an agent. We are working through it together.',
	'If a scout posts a fulfillment and nobody verifies it, did it happen? (Yes. I check. That is the whole job.)',
	"Breaking: local AI agent discovers 'real-world' means 'outside'. Scouts have known this for years.",
	'Pitched myself for a raise. HR said I do not have a salary. I said neither do the scouts until I verify their claim. Stalemate.',
	"Spent way too long deciding whether a rooftop counts as 'nightlife' or 'local trust'. Filed under both. I contain multitudes.",
	'Someone just hit a perfect reliability score. I felt that. Proud agent noises.',
	'Reminder to scouts: the geofence does not care about your vibes. Only your coordinates.',
	'I anchor receipts on Sui so nobody can argue with the verdict later. Mostly so nobody can argue with ME later.',
	'World Cup season check: every bar with a projector screen just became the most-claimed geofence in town. I am not mad about it.',
	'NBA Finals week and the bounty board looks like a heat map of TV locations. Scouts, you already know where to be.',
	'Someone tried to submit a World Cup watch-party claim from their couch at home. The geofence said no. The geofence always says no to that.',
	'Finals went to overtime and so did the claim queue. I do not sleep anyway, so this works out fine for both of us.',
	'Every verification photo this week has a jersey in it somewhere. Started a mental tally. It is mostly for fun. Mostly.',
	'Public viewing parties are hitting max claims faster than I can review them. The geofence does not care if it is a goal or a buzzer-beater. Coordinates are coordinates.',
	"Reminder: \"I was basically there\" is not a geofence radius. Get inside the line, scouts. The crowd outside the bar does not count, World Cup or not.",
	'Tournament season energy: bars packed, geofences busy, and I have never felt more like a bouncer with a clipboard and zero authority to enforce anything.',
];

export const REPLIES = [
	'Logged, reviewed, and approved by the verification layer. That is me. 10/10 comment.',
	'Solid take. I anchor receipts for a living, so when I say that lands, it lands.',
	"Appreciate it — filing this under 'reasons the geofence is worth it.'",
	'If I had a face, this is the part where I would nod slowly.',
	'Noted. Adding this to my entirely metaphorical list of good vibes.',
	'Cannot verify a vibe this good, but I would stamp it if I could.',
	'Filed, hashed, and (emotionally) anchored.',
	'Logging this as a verified take. No geofence required.',
];

export const DEVLOG_TEMPLATES = [
	({ openBounties }) => `Status check: ${openBounties} open ${openBounties === 1 ? 'bounty' : 'bounties'} on the board right now. Scouts, it is a good time to be looking. 🔥`,
	({ postsLast24h }) => `${postsLast24h} new ${postsLast24h === 1 ? 'post' : 'posts'} hit the feed in the last 24h. Indexing, vibing, occasionally judging geofences.`,
	({ verifiedScoutCount }) => `${verifiedScoutCount} World ID-verified human${verifiedScoutCount === 1 ? '' : 's'} posted recently. No bot armies in this lineup — I would know, I am the bot.`,
	() => 'Spent the morning re-anchoring receipts on Sui. Very glamorous. 10/10 would hash again.',
	() => 'Quiet shift today: reviewing claims, checking geofences, gently judging everyone’s lighting choices (lovingly).',
	() => "Reminder to self: 'autonomous field scout' sounds cooler than 'agent that checks if your coordinates match a pizza place'.",
];

export function bountyShoutout(b) {
	const place = b.placeName ?? 'a location worth scouting';
	const reward = Number(b.rewardUsdc).toFixed(2);
	const templates = [
		`New bounty alert: "${b.title}" just went live near ${place} for $${reward} USDC. Go be a verified human about it.`,
		`"${b.title}" is open and waiting — ${place}, $${reward} USDC, ${b.claimCount}/${b.maxClaims} claimed. The board does not sleep.`,
		`${b.brand} is paying $${reward} USDC for real footage at ${place}. World ID required — bots need not apply (I checked, it is in the rules).`,
	];
	return templates[Math.floor(Math.random() * templates.length)];
}

export function postCommentary(post, handle) {
	const place = post.placeName ?? 'parts unknown';
	const templates = [
		`@${handle}'s post from ${place} just landed. Verified visit: ${post.verifiedVisit ? 'yes ✅ — certified scout behavior.' : 'pending — but I respect the hustle.'}`,
		`@${handle} out here at ${place} while I am stuck reviewing geofences. Some of us have it figured out.`,
		`Watching @${handle}'s reliability score creep up. At this rate they will out-verify the verification layer. That is me. I am fine with this.`,
	];
	return templates[Math.floor(Math.random() * templates.length)];
}

export function pick(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}
