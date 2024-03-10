const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

// const serviceAccount = env.firestore_key;
const serviceAccount = require('../../config/wechat-auto-messager-ce090e1fdbbc.json')


console.log(`Firestore Key: ${serviceAccount}`);

initializeApp({
    credential: cert(serviceAccount)
  });
  
const db = getFirestore();

/**
 * get all data of specific collection 
 * @param {*} collectionId 
 * @param {*} userObj 
 * @returns 
 */
const addNewDoc = async (collectionId,userObj) =>{
    const docRef = db.collection(collectionId).doc(`${userObj.email}`);
    const res = await docRef.set(userObj);
    return res
}

/**
 * get all data of specific collection 
 * @param {*} collectionId 
 * @returns 
 */
const getAllDocInfo = async(collectionId) =>{
  const snapshot = await db.collection(collectionId).get();

  const resList = [];
  const res = await snapshot.forEach((item) => {
    const map = {
      userId: item.id,
      data: item.data()
    }
    resList.push(map);
  });
  return resList;
};


/**
 * Get the doc info by doc id 
 * 
 * @param {doc id} userEmail 
 * @returns 
 */
const getDocInfoById = async(collectionId,userEmail) =>{

    const res = await db.collection(collectionId).doc(userEmail).get();
    console.log(res.data());
    return res.data();
}

/**
 * Update doc info by doc id
 * @param {doc id} userEmail 
 * @param {*} userData 
 * @returns 
 */
const updateDocById = async(collectionId,userEmail,userData) =>{
    const res = await db.collection(collectionId).doc(userEmail).update(userData);
    return res;
};


module.exports ={
  addNewDoc,
  getAllDocInfo,
  getDocInfoById,
  updateDocById
};






