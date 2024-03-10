const axios = require("axios");
const dayjs = require("dayjs");
const {
  getConstellation,
  randomNum,
  sortBirthdayTime,
  getColor,
  toLowerLine,
  sleep,
  parseWeatherData,
} = require("../utils/index.js");
const config = require("../config/exp-config.js");
const countryMap = require("../config/countries.js");
const {
  updateDocById,
  getDocInfoById,
  getAllDocInfo,
} = require("./firestore/index.js");
const { selfDayjs, timeZone } = require("../utils/timezone-helper.js");

/**
 * get WeChat accessToken
 * @returns accessToken
 */
const getAccessToken = async () => {
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
const getWeatherIcon = (weather) => {
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
const getCityCode = async (cityName, countryName) => {
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

    const location = res.data.location.find((location) => {
      return location.country.includes(countryName_CN);
    });
    return location.id;
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
const getCityWeather = async (cityCode) => {
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
const getDateDiff = (customizedDate) => {
  const dayDiff = selfDayjs().diff(selfDayjs(customizedDate), "day", true);

  let diffDay = Math.ceil(dayDiff);
  if (diffDay <= 0) {
    diffDay = Math.abs(Math.floor(dayDiff));
  }
  return diffDay;
};

/**
 * Get important days information
 * @param {array} festivals
 * @returns
 */
const getImportantDaysMessage = (festivals) => {
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

/**
 * How long until the next period time
 *
 * @param {String} date
 */
const getPeriodTime = (date) => {
  const dateDiff = getDateDiff(date);
  let leftDay = 28 - parseInt(dateDiff);
  return leftDay;
};

/**
 * Get the period time message
 * @param {*} date
 */
const getPeriodTimeMessage = async (user, currentDate) => {
  const date = getPeriodTime(user.data.period_time);

  if (date == "1" || date == "2") {
    return `宝贝下次例假还有 ${date} 天，出门注意 包里放卫生巾, 注意早点休息`;
  } else if (date == "27") {
    return "今天是宝贝例假第二天，注意多休息, 开心最重要";
  } else if (date == "0") {
    //update period history of the user
    //update period time  of the user
    let dataNew = user.data;
    dataNew.period_time = currentDate;
    dataNew.period_history.push(currentDate);
    await updateDocById("users", user.userId, dataNew);
    return "今天是宝贝例假第一天，注意多休息，宝贝肚子不舒服就给我说，出门注意 包里放卫生巾";
  } else {
    return `距离下一次姨妈期还有 ${date}天`;
  }
};

/**
 * Aggregated the data
 *
 */
const getAggregatedData = async () => {
  //Got the User Info
  debugger;
  const users = await getAllDocInfo("users");
  console.log(users);

  for (user of users) {
    //get the city code
    const cityName = user.data.city;
    const countryName = user.data.country;
    const cityCode = await getCityCode(cityName, countryName);
    let weatherInfo = [];
    if (cityCode) {
      //get the 24h weather info
      const weatherHourly = await getCityWeather(cityCode);
      weatherInfo = parseWeatherData(weatherHourly);
    }
    //get the period time
    const currentDate = dayjs().format("YYYY-MM-DD");
    const periodMessage = await getPeriodTimeMessage(user, currentDate);
    //get the festivals
    const importantDays = [user.data.birthday, user.data.anniversary];
    const importantDayMessage = getImportantDaysMessage(importantDays);

    //love day
    const loveDayMessage = `今天是我们念爱的第${getDateDiff(
      user.data.love_day
    )}天`;

    const temp = weatherInfo[0].temp + "°C";
    const humidity = weatherInfo[0].humidity + "%";

    //aggregate messages
    const wxTemplateParams = [
      { name: "period_time", value: periodMessage, color: getColor() },
      {
        name: "anniversary_day",
        value: importantDayMessage[1],
        color: getColor(),
      },
      {
        name: "birthday_day",
        value: importantDayMessage[0],
        color: getColor(),
      },
      { name: "city", value: cityName, color: getColor() },
      { name: "love_day", value: loveDayMessage, color: getColor() },
      { name: "temp", value: temp, color: getColor() },
      { name: "humidity", value: humidity, color: getColor() },
      {
        name: "weather_condition",
        value: weatherInfo[0].text,
        color: getColor(),
      },
    ];
    console.log(wxTemplateParams, "wxTemplateParams");
    user.wxTemplateParams = wxTemplateParams;
  }

  return users;
};

module.exports = {
  getAccessToken,
  getWeatherIcon,
  getCityCode,
  getCityWeather,
  getDateDiff,
  getImportantDaysMessage,
  getPeriodTime,
  getPeriodTimeMessage,
  getAggregatedData
};
