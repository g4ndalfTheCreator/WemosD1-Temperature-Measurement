/**
 * Converts unix time since epoch (ms) to HH:MM:SS format
 * @param {Number} unixTime
 * @returns string representation of the time in HH:MM:SS format
 */
export const convertUnixTimeToHHMMSS = (unixTime) => {
  const date = new Date(unixTime);
  const hours = date.getHours();
  const minutes = "0" + date.getMinutes();
  const seconds = "0" + date.getSeconds();
  const time = hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2);
  return time;
};
