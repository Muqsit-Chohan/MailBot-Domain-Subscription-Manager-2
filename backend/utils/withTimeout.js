// Bound the caller's wait even when DNS or an external service stalls.
module.exports = async function withTimeout(operation, milliseconds, message) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
