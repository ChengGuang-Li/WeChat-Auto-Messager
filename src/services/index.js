const axios = require("axios");
const dayjs = require("dayjs");
const {
  sortBirthdayTime,
  getColor,
  toLowerLine,
  parseWeatherData,
} = require("../utils/index.js");
const config = require("../config/exp-config.js");
const countryMap = require("../config/countries.js");
const {
  updateDocById,
  getDocInfoById,
  getAllDocInfo,
} = require("./firestore/index.js");
const { selfDayjs } = require("../utils/timezone-helper.js");

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
    //console.log(`appId: ${appId}, appSecret: ${appSecret}`);
  }

  const postUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

  try {
    const res = await axios.get(postUrl).catch((err) => err);
    if (res.status === 200 && res.data && res.data.access_token) {
      accessToken = res.data.access_token;
      // console.log("---");
      // console.log(`Get accessToken: ${res.data}`);
      // console.log("---");
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

  const weatherApiKey = process.env.WEATHER_KEY;
  const url = `https://geoapi.qweather.com/v2/city/lookup?location=${cityName}&key=${weatherApiKey}`;
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
  const weatherApiKey = process.env.WEATHER_KEY;
  const url = `https://devapi.qweather.com/v7/weather/24h?location=${cityCode}&key=${weatherApiKey}`;
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
  const map = new Map();
  importantDayList.forEach((item, index) => {
    let message = null;

    // Birthday
    if (item.type === "Birthday") { 
      if (item.diffDay === 0) {
        message = `今天是${item.name}的生日哦，祝${item.name}生日快乐!!!`;
      } else {
        message = `距离${item.name}的生日还有${item.diffDay}天`;
      }
    }

    // Anniversary
    if (item.type === "Anniversary") {
      if (item.diffDay === 0) {
        message = `今天是${item.name}哦，要永远开心！`;
      } else {
        message = `距离${item.name}还有${item.diffDay}天`;
      }
    }

    // save message
    if (message) {
      map.set(item.type,message);
    }
  });

  return map;
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
    return `宝贝下次例假还有 ${date} 天，出门注意包里放卫生巾, 注意早点休息`;
  } else if (date == "27") {
    return "今天是宝贝例假第二天，注意多休息, 开心最重要";
  } else if (date == "0") {
    //update period history of the user
    //update period time  of the user
    let dataNew = user.data;
    dataNew.period_time = currentDate;
    const date = new Date(currentDate);
    const key = date.getMonth() + 1;
    dataNew.period_history.set(key,currentDate);
    await updateDocById("users", user.userId, dataNew);
    return "今天是宝贝例假第一天，注意多休息，宝贝肚子不舒服就给我说，出门注意 包里放卫生巾";
  } else {
    return `距离下一次例假还有${date}天`;
  }
};

/**
 * Aggregated the data
 *
 */
const getAggregatedData = async () => {
  //Got the User Info
  const users = await getAllDocInfo("users");
  //console.log(users);

  for (user of users) {
    //get the city code
    const cityName = user.data.city;
    const countryName = user.data.country;
    const cityCode = await getCityCode(cityName, countryName); 
    let weatherInfo = [];
    if (cityCode) {
      //get the 24h weather info
      const weatherHourly = await getCityWeather(cityCode);
      weatherInfo = parseWeatherData(weatherHourly);   //24H weather Message
    }
    //get the period time
    const currentDate = dayjs().format("YYYY-MM-DD");
    const periodMessage = await getPeriodTimeMessage(user, currentDate); // Period Message
    //get the festivals
    const importantDays = [user.data.birthday, user.data.anniversary];
    const importantDayMessage = getImportantDaysMessage(importantDays);
    const birthdayMessage = importantDayMessage.get("Birthday");    //Birthday Message
    const anniversaryMessage = importantDayMessage.get("Anniversary"); //Anniversary Message
    //love day
    const loveDayMessage = `今天是我们念爱的第${getDateDiff(
      user.data.love_day
    )}天`;

    const temp = `${weatherInfo[0].temp} °C`;
    const humidity =  `${weatherInfo[0].humidity} %`;
    const weatherMessage = `${weatherInfo[0].text}`;
    const cityMessage = `${cityName}`;
    //aggregate messages
    const wxTemplateParams = [
      { name: "period_time", value: periodMessage, color: getColor() },
      {
        name: "anniversary_day",
        value: anniversaryMessage,
        color: getColor(),
      },
      {
        name: "birthday_day",
        value: birthdayMessage,
        color: getColor(),
      },
      { name: "city", value: cityMessage, color: getColor() },
      { name: "love_day", value: loveDayMessage, color: getColor() },
      { name: "temp", value: temp, color: getColor() },
      { name: "humidity", value: humidity, color: getColor() },
      {
        name: "weather_condition",
        value: weatherMessage,
        color: getColor(),
      }
    ];
    console.log(wxTemplateParams, "wxTemplateParams");
    user.wxTemplateParams = wxTemplateParams;
  }

  return users;
};

/**
 * send message to Wechat
 *
 * @param {Object} user
 * @returns
 */

const sendWechatMessage = async (user, templateId, params) => {
  const wxTemplateData = {}
  if (Object.prototype.toString.call(params) === '[object Array]') {
    params.forEach((item) => {
      wxTemplateData[item.name] = {
        value: item.value,
        color: item.color,
      }
    })
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      name: user.userId,
      success: false,
    };
  }

  //WeChat  Url
  const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;
  const data = {
    touser: user.data.wechatId,
    template_id: templateId,
    url: 'https://github.com/ChengGuang-Li/WeChat-Auto-Messager/blob/master/README.md',
    data: wxTemplateData,
  };

  // send message to WeChat url
  const res = await axios
    .post(url, data, {
      headers: {
        "Content-Type": "application/json",
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
      },
    })
    .catch((err) => err);

  //Send message success
  if (res.data && res.data.errcode === 0) {
    console.log(`${user.userId}: Send Message Success`);
  } else {
    console.error(
      `${user.userId}: Send Message Failed. errorCode: ${res.data.errcode}`,
      res.data
    );
  }

  return {
    name: user.userId,
    success: true,
  };
};

/**
 * Send messages and conduct success and failure statistics
 * @param {*} users
 * @param {*} params
 * @param {*} usePassage
 */
const sendMessageReply = async (users,templateId = null,params =null) => {
  const resList = [];
  const needPostNum = users.length;
  let successPostNum = 0;
  let failPostNum = 0;
  const successPostIds = [];
  const failPostIds = [];

  for (const user of users) {
    resList.push(
      await sendWechatMessage(
        user,
        templateId || user.data.useTemplateId,
        params || user.wxTemplateParams
      )
    );
  }
  resList.forEach((item) => {
    if (item.success) {
      successPostNum++;
      successPostIds.push(item.name);
    } else {
      failPostNum++;
      failPostIds.push(item.name);
    }
  });


  return {
    needPostNum,
    successPostNum,
    failPostNum,
    successPostIds: successPostIds.length ? successPostIds.join(",") : "无",
    failPostIds: failPostIds.length ? failPostIds.join(",") : "无",
  };

};

/**
 * Get the processed receipt message
 * @param {String} messageReply 
 * @returns 
 */
const getCallbackTemplateParams = (messageReply) => {
  const currentDate = dayjs().format("YYYY-MM-DD");
  return [
    { name: toLowerLine('postTime'), value: currentDate, color: getColor() },
    { name: toLowerLine('needPostNum'), value: messageReply.needPostNum, color: getColor() },
    { name: toLowerLine('successPostNum'), value: messageReply.successPostNum, color: getColor() },
    { name: toLowerLine('failPostNum'), value: messageReply.failPostNum, color: getColor() },
    { name: toLowerLine('successPostIds'), value: messageReply.successPostIds, color: getColor() },
    { name: toLowerLine('failPostIds'), value: messageReply.failPostIds, color: getColor() },
  ]
}

module.exports = {
  getAccessToken,
  getWeatherIcon,
  getCityCode,
  getCityWeather,
  getDateDiff,
  getImportantDaysMessage,
  getPeriodTime,
  getPeriodTimeMessage,
  getAggregatedData,
  sendWechatMessage,
  sendMessageReply,
  getCallbackTemplateParams
};
