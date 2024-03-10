const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc)

const selfDayjs = (time) => {
  // Convert time to UTC+8 for China Standard Time
  return dayjs(time).utcOffset(8, true)
}


const timeZone = () => {
  //Guess the time zone of the current environment,
  return dayjs.tz.guess()
}

module.exports = {
  selfDayjs,
  timeZone
}
