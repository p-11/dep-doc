/* eslint-disable no-console */
const logSuccess = (msg: string) => {
  console.log(`\u001b[97m🎖️ Success! ${msg}\u001b[0m`);
};

const logInfo = (msg: string) => {
  console.log(`[dep-doc] INFO: ${msg}`);
};

const logError = (msg: string) => {
  console.error(`[dep-doc] ERROR: ${msg}`);
};

export { logSuccess, logError, logInfo };
