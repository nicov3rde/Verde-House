import 'dotenv/config'; // Load environment variables
import { handleLoginAndPost } from '../src/lib/server/services/devlog.js';

const main = async () => {
  const caption = process.argv[2];
  if (!caption) {
    console.error("Usage: ts-node scripts/post-devlog.ts \"Your devlog message\"");
    process.exit(1);
  }

  try {
    await handleLoginAndPost(caption);
    console.log("Devlog posted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to post devlog:", error);
    process.exit(1);
  }
};

main();