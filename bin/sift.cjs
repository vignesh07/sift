#!/usr/bin/env node

(async () => {
  const { main } = await import('../packages/server/dist/index.js');
  await main();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
