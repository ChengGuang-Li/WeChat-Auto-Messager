import axios from "axios";
import dayjs from "dayjs";
import {
  getConstellation,
  randomNum,
  sortBirthdayTime,
  getColor,
  toLowerLine,
  sleep,
} from "../utils/index.js";
import config from "../config/exp-config.js";
import countryMap from "../config/countries.js";

/**
 * get WeChat accessToken
 * @returns accessToken
 */
export const getAccessToken = async () => {
  // APP_ID
  const appId = process.env.APP_ID;
  // APP_SECRET
  const appSecret = process.env.APP_SECRET;
  // accessToken
  let accessToken = null;

  // appId and AppSecrect cannot be Empty
  if (!appId || !appSecret) {
    console.log(`appId: ${appId}, appSecret: ${appSecret} cannot be empty`);
    return null;
  } else {
    console.log(`appId: ${appId}, appSecret: ${appSecret}`);
  }

  const postUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

  try {
    const res = await axios.get(postUrl).catch((err) => err);
    if (res.status === 200 && res.data && res.data.access_token) {
      accessToken = res.data.access_token;
      console.log("---");
      console.log(`Get accessToken: ${res.data}`);
      console.log("---");
    } else {
      console.log("---");
      console.error("Get accessToken Failed", res.data.errmsg);
      console.log("---");
    }
  } catch (e) {
    console.error("Get accessToken Error: ", e);
  }
  return accessToken;
};

/**
 *
 * @param {*} weather
 * @returns
 */
export const getWeatherIcon = (weather) => {
  let weatherIcon = "🌈";
  const weatherIconList = [
    "☀️",
    "☁️",
    "⛅️",
    "☃️",
    "⛈️",
    "🏜️",
    "🏜️",
    "🌫️",
    "🌫️",
    "🌪️",
    "🌧️",
  ];
  const weatherType = [
    "晴",
    "阴",
    "云",
    "雪",
    "雷",
    "沙",
    "尘",
    "雾",
    "霾",
    "风",
    "雨",
  ];

  weatherType.forEach((item, index) => {
    if (weather.indexOf(item) !== -1) {
      weatherIcon = weatherIconList[index];
    }
  });

  return weatherIcon;
};

/**
 * Get the City Code
 * @param {*} cityName
 * @param {*} countryName
 * @returns
 */
export const getCityCode = async (cityName, countryName) => {
  const url = `https://geoapi.qweather.com/v2/city/lookup?location=${cityName}&key=${config.weatherApiKey}`;
  const res = await axios
    .get(url, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .catch((err) => err);
  if (res.status == 200 && res.data && res.data.code == 200) {
    const countryName_CN = countryMap[countryName.toLowerCase()];

    const cityCode = res.data.location.forEach((location) => {
      if (location.country.includes(countryName_CN)) {
        return location.id;
      }
    });

    return cityCode;
  }
  console.log(`Get the City Code Failed: ${res}`);
  return null;
};
/**
 * Get the 24h weather conditions
 *
 * @param {*} cityCode
 * @returns
 */
export const getCityWeather = async (cityCode) => {
  const url = `https://devapi.qweather.com/v7/weather/24h?location=${cityCode}&key=${config.weatherApiKey}`;
  const res = await axios
    .get(url, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .catch((err) => err);
  if (res.status == 200 && res.data && res.data.code == 200) {
    return res.data.hourly;
  }
  console.log(`Get the 24h weather Failed: ${res}`);
  return null;
};

/**
 * Calculate the date difference
 *
 * @params {*} customizedDate
 * @returns
 */
export const getDateDiffList = (customizedDate) => {
  const dayDiff = helperModule
    .selfDayjs()
    .diff(helperModule.selfDayjs(customizedDate), "day", true);

  let diffDay = Math.ceil(dayDiff);
  if (diffDay <= 0) {
    diffDay = Math.abs(Math.floor(dayDiff));
  }
  return diffDay;
};

/**
 * Get important days information
 * @param {*} festivals 
 * @returns 
 */
export const getImportantDaysMessage = (festivals) => {
  if (
    Object.prototype.toString.call(festivals) !== "[object Array]" ||
    festivals.length === 0
  ) {
    festivals = null;
  }

  // Calculate countdown dates for important days
  const importantDayList = sortBirthdayTime(festivals || []).map((it) => {
    const date = selfDayjs().add(it.diffDay, "day");
    return {
      ...it,
      soarYear: date.format("YYYY"),
      solarDate: date.format("MM-DD"),
    };
  });

  //response messages
  let resMessage = [];
  importantDayList.forEach((item, index) => {
    let message = null;

    // Birthday
    if (item.type === "Birthday") {
      if (item.diffDay === 0) {
        message = `今天是 ${item.name} 的生日哦，祝${item.name}生日快乐!!!`;
      } else {
        message = `距离${item.name} 的生日还有${item.diffDay}天`;
      }
    }

    // festivals
    if (item.type === "Festivals") {
      if (item.diffDay === 0) {
        message = `今天是 ${item.name} 哦，要永远开心！`;
      } else {
        message = `距离${item.name} 还有${item.diffDay}天`;
      }
    }

    // save message
    if (message) {
      resMessage.push(message);
    }
  });

  return resMessage;
};


