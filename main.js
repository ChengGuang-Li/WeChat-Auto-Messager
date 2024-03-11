const {
  getAggregatedData,
  sendMessageReply,
  getCallbackTemplateParams,
} = require("./src/services/index");
const dayjs = require("dayjs");
const USER_CONFIG = require("./src/config/index");

const mainForProd = async () => {
  //start -- aggregate data
  console.log("\n\n");
  console.log(dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("----------【Data Acquisition】Start -------");
  const aggregatedData = await getAggregatedData();
  console.log("----------【Data Acquisition】End -------");

  //send wechat message
  console.log("---------[Message content template] Push starts-----------");
  const {
    needPostNum,
    successPostNum,
    failPostNum,
    successPostIds,
    failPostIds,
  } = await sendMessageReply(aggregatedData, null, null);

  console.log("---------[Message content template] Push end-----------");

  // Get receipt information
  const callbackTemplateParams = getCallbackTemplateParams({
    needPostNum,
    successPostNum,
    failPostNum,
    successPostIds,
    failPostIds,
  });

  // notification delivery feedback
  if (USER_CONFIG.REPLY_TEMPLATE_ID) {
    console.log("------【Notificatio Feedback】Push starts------");

    await sendMessageReply(
      aggregatedData,
      USER_CONFIG.REPLY_TEMPLATE_ID,
      callbackTemplateParams
    );

    console.log("------【Notificatio Feedback】Push end------");
  }
};

mainForProd();
