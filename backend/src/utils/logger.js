const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const log = (lvl, ...a) => {
  if (levels[lvl] > levels[current]) return;
  console[lvl === 'debug' ? 'log' : lvl](`[${new Date().toISOString()}] ${lvl.toUpperCase()}`, ...a);
};
module.exports = Object.fromEntries(Object.keys(levels).map((l) => [l, (...a) => log(l, ...a)]));
