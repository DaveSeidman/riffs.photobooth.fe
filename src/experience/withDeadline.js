// Optional local vision must never hold the guest flow indefinitely.
export async function withDeadline(task, timeoutMs, fallback = null) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(task).catch(() => fallback),
      new Promise(resolve => { timer = setTimeout(() => resolve(fallback), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}
