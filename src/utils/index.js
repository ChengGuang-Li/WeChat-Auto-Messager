import { Lunar, Solar } from 'lunar-javascript';
import cloneDeep from 'lodash/cloneDeep.js';
import { selfDayjs } from './timezone-helper.js';
import config from '../config/exp-config.js';

/**
 * camelback to underline
 * @param {string} str
 * @returns {string}
 */
export const toLowerLine = (str) => {
  let temp = str.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
  return temp.startsWith('_') ? temp.slice(1) : temp;
};

/**
 * Get a random color, or return undefined if the configuration prohibits display of colors
 * @returns {string|undefined}
 */
export const getColor = () => {
  if (!config.IS_SHOW_COLOR) return undefined;
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padEnd(6, '0')}`;
};

/**
 * Generate random integers within a specified range
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Sort the birthday list and calculate the number of days since the current date
 * @param {Array} list
 * @returns {Array}
 */
export const sortBirthdayTime = (list) => {
  const clonedList = cloneDeep(list);
  clonedList.forEach((item) => {
    item.useLunar = item.type.startsWith('*');
    item.type = item.type.replace(/^\*/, '');
    const today = selfDayjs();
    const [month, day] = item.date.split('-').map(Number);
    const currentYear = today.year();
    const nextBirthday = item.useLunar
      ? Lunar.fromYmd(currentYear, month, day).getSolar().toYmd()
      : `${currentYear}-${item.date}`;
    const diffDay = selfDayjs(nextBirthday).diff(today, 'day');
    item.diffDay = diffDay >= 0 ? diffDay : selfDayjs(nextBirthday).add(1, 'year').diff(today, 'day');
  });
  return clonedList.sort((a, b) => a.diffDay - b.diffDay);
};

/**
 * Get zodiac sign based on date
 * @param {string} date
 * @returns {Object}
 */
export const getConstellation = (date) => {
  const [month, day] = date.split('-').map(Number);
  const solar = Solar.fromYmd(selfDayjs().year(), month, day);
  const cn = solar.getXingZuo();
  const constellationEn = {
    '白羊': 'Aries', '金牛': 'Taurus', '双子': 'Gemini', '巨蟹': 'Cancer',
    '狮子': 'Leo', '处女': 'Virgo', '天秤': 'Libra', '天蝎': 'Scorpio',
    '射手': 'Sagittarius', '摩羯': 'Capricorn', '水瓶': 'Aquarius', '双鱼': 'Pisces',
  };
  return { cn, en: constellationEn[cn] };
};

/**
 * Sleep function with Promise
 * @param {number} time
 * @returns {Promise<void>}
 */
export const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));
