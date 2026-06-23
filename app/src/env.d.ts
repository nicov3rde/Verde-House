declare module '$env/static/private' {
	export const DATABASE_URL: string;
	export const AUTH_SECRET: string;
	export const ORIGIN: string;
	export const GEMINI_API_KEY: string;
	export const GEMINI_MODEL: string;
	export const OPENAI_API_KEY: string;
	export const STRIPE_SECRET_KEY: string;
	export const STRIPE_WEBHOOK_SECRET: string;
	export const STRIPE_PUBLISHABLE_KEY: string;
	export const WORLD_ID_APP_ID: string;
	export const WORLD_ID_ACTION: string;
	export const ETH_RPC_URL: string;
	export const UNLINK_API_KEY: string;
	export const ARC_RPC_URL: string;
	export const ARC_PRIVATE_KEY: string;
	export const SUI_RPC_URL: string;
	export const SUI_PRIVATE_KEY: string;
	export const ADMIN_HANDLES: string;
	export const HERMES_DEVLOG_EMAIL: string;
	export const HERMES_DEVLOG_PASSWORD: string;
	export const HERMES_DEVLOG_HANDLE: string;
	export const MODAL_TOKEN_ID: string;
	export const MODAL_TOKEN_SECRET: string;
	export const MODAL_ENDPOINT_URL: string;
	export const CLOUDINARY_CLOUD_NAME: string;
	export const CLOUDINARY_API_KEY: string;
	export const CLOUDINARY_API_SECRET: string;
	export const BLOB_READ_WRITE_TOKEN: string;
}

declare module '$env/dynamic/private' {
	import { env as dynPublic } from '$env/dynamic/public';
	export const env: {
		[key: string]: string;
		DATABASE_URL: string;
		AUTH_SECRET: string;
		ORIGIN: string;
		GEMINI_API_KEY: string;
		GEMINI_MODEL: string;
		OPENAI_API_KEY: string;
		STRIPE_SECRET_KEY: string;
		STRIPE_WEBHOOK_SECRET: string;
		STRIPE_PUBLISHABLE_KEY: string;
		WORLD_ID_APP_ID: string;
		WORLD_ID_ACTION: string;
		ETH_RPC_URL: string;
		UNLINK_API_KEY: string;
		ARC_RPC_URL: string;
		ARC_PRIVATE_KEY: string;
		SUI_RPC_URL: string;
		SUI_PRIVATE_KEY: string;
		ADMIN_HANDLES: string;
		HERMES_DEVLOG_EMAIL: string;
		HERMES_DEVLOG_PASSWORD: string;
		HERMES_DEVLOG_HANDLE: string;
		MODAL_TOKEN_ID: string;
		MODAL_TOKEN_SECRET: string;
		MODAL_ENDPOINT_URL: string;
		CLOUDINARY_CLOUD_NAME: string;
		CLOUDINARY_API_KEY: string;
		CLOUDINARY_API_SECRET: string;
		BLOB_READ_WRITE_TOKEN: string;
	} & typeof dynPublic;
}