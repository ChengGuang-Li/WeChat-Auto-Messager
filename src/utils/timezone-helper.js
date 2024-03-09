import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

export const selfDayjs = (time) => {
  // Convert time to UTC+8 for China Standard Time
  return dayjs(time).utcOffset(8, true)
}


export const timeZone = () => {
  //Guess the time zone of the current environment,
  return dayjs.tz.guess()
}
