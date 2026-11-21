const axios = require('axios');
const moment = require('moment-timezone');

const getBuffer = async (url, opts = {}) => {
  const { data } = await axios.get(url, { responseType: 'arraybuffer', ...opts });
  return Buffer.from(data);
};

const runtime = (sec) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

const clockString = (tz = 'Africa/Nairobi') => moment().tz(tz).format('hh:mm:ss A');

module.exports = { getBuffer, runtime, clockString };