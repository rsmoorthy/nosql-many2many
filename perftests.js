const MongoClient = require('mongodb')
const R = require('ramda')
var client

const maxUsers = 50000
const maxQueues = 1000
const maxQueuesForUser = 10
const maxUsersForQueue = 50

const getHandle = async(dbName, collName) => {
  if(!client)
    client = await MongoClient.connect("mongodb://localhost:27017/")

  return client.db(dbName).collection(collName)
}

const closeClient = () => {
  if(client)
    client.close()
}

const insertUsers = async () => {
  let tm = Date.now()
  const cl = await getHandle('mydb', 'users')
  R.map(async (idx) => {
    // Let us add several fields, just to make the user record bigger
    let r = await cl.insertOne({userName: "User " + idx,
      userId: idx,
      queues: [],
      skills: [],
      gender: Math.random() > 0.50 ? "Male" : "Female",
      mobile: Math.floor(Math.random()*Math.pow(10,10)).toString(),
      address: R.join(' ', R.map(() => Math.random().toString(36).substr(2), R.range(1,10))),
      createdDate: Date.now(),
      createdBy: 'admin',
    })
  }, R.range(1,maxUsers))
  console.log("Time taken to insert users: ", (Date.now() - tm)/1000)
}

const insertManyUsers = async () => {
  let tm = Date.now()
  const cl = await getHandle('mydb', 'users')
  const users = R.map((idx) => {
    // Let us add several fields, just to make the user record bigger
    return {userName: "User " + idx,
      userId: idx,
      queues: [],
      skills: [],
      gender: Math.random() > 0.50 ? "Male" : "Female",
      mobile: Math.floor(Math.random()*Math.pow(10,10)).toString(),
      address: R.join(' ', R.map(() => Math.random().toString(36).substr(2), R.range(1,10))),
      createdDate: Date.now(),
      createdBy: 'admin',
    }
  }, R.range(1,maxUsers))
  let r = await cl.insertMany(users)
  r = await cl.createIndex({userId:1})
  console.log("Time taken to insert users: ", (Date.now() - tm)/1000)
}

const insertQueues = async () => {
  let tm = Date.now()
  const cl = await getHandle('mydb', 'queues')
  await Promise.all(
    R.map(async (idx) => {
      // Let us add several fields, just to make the user record bigger
      let r = await cl.insertOne({queueName: "Queue " + idx,
        queueId: idx,
        users: [],
        skills: [],
        active: Math.random() > 0.50 ? "Yes" : "No",
        purpose: R.join(' ', R.map(() => Math.random().toString(36).substr(2), R.range(1,10))),
        createdDate: Date.now(),
        createdBy: 'admin',
      })
    }, R.range(1,maxQueues))
  )
  await cl.createIndex({queueId:1})
  console.log("Time taken to insert queues: ", (Date.now() - tm)/1000)
}

// 1 iteration updates random 1000 associations
const associateUserQueue = async () => {
  let tm = Date.now()
  var cnt = 0
  const ucl = await getHandle('mydb', 'users')
  const qcl = await getHandle('mydb', 'queues')

  let m = R.map(async (idx) => {

    let uid = Math.floor(Math.random() * maxUsers)
    let qid = Math.floor(Math.random() * maxQueues)

    let user = await ucl.findOne({userId: uid})
    let queue = await qcl.findOne({queueId: qid})
    // console.log(user, queue)
    if(user === null || queue === null)
      return

    if(user.queues.length >= maxQueuesForUser || queue.users.length > maxUsersForQueue)  // some random validation
      return

    if(R.contains(qid, user.queues) || R.contains(uid, queue.users)) // already present
      return

    user.queues.push(qid)
    queue.users.push(uid)
    let r1 = await ucl.updateOne({userId: uid}, {$set: {queues: user.queues}})
    let r2 = await qcl.updateOne({queueId: qid}, {$set: {users: queue.users}})
    cnt = cnt + 1
    return cnt
  }, R.range(1,1000))

  let m2 = await Promise.all(m)

  console.log("Associated records and Time taken: ", cnt, (Date.now() - tm)/1000)
}

const removeRecords = async () => {
  let tm = Date.now()
  const ucl = await getHandle('mydb', 'users')
  const qcl = await getHandle('mydb', 'queues')

  await ucl.remove({})
  await qcl.remove({})
  console.log("Time taken to delete records: ", (Date.now() - tm)/1000)
}

const fetchUsers = async () => {
  const ucl = await getHandle('mydb', 'users')
  const qcl = await getHandle('mydb', 'queues')

  let uids = R.map(() => Math.floor(Math.random() * maxUsers), R.range(1,1000)) // 100 user ids

  let queues = []
  let tm = Date.now()
  let users = await ucl.find({userId: {$in: uids}}).toArray()
  let qs = {}
  R.map(u => R.map(q => qs[q] = 1, u.queues), users)
  let qids = R.map(i => parseInt(i), Object.keys(qs))
  queues = await qcl.find({queueId: {$in: qids}}).toArray()
  console.log("Time taken to fetch 1000 users: ", users.length, queues.length, (Date.now() - tm)/1000)
  return users.length
}

const fetchQueues = async () => {
  const ucl = await getHandle('mydb', 'users')
  const qcl = await getHandle('mydb', 'queues')

  let qids = R.map(() => Math.floor(Math.random() * maxQueues), R.range(1,100))

  let users = []
  let tm = Date.now()
  let queues = await qcl.find({queueId: {$in: qids}}).toArray()
  let us = {}
  R.map(q => R.map(u => us[u] = 1, q.users), queues)
  let uids = R.map(i => parseInt(i), Object.keys(us))
  users = await ucl.find({userId: {$in: uids}}).toArray()
  console.log("Time taken to fetch 100 queues: ", queues.length, users.length, (Date.now() - tm)/1000)
  return queues.length
}

const removeUsers = async () => {
  const ucl = await getHandle('mydb', 'users')
  const qcl = await getHandle('mydb', 'queues')

  let uids = R.map(() => Math.floor(Math.random() * maxUsers), R.range(1,50)) // 50 users
  let queues = []
  let tm = Date.now()
  let users = await ucl.find({userId: {$in: uids}}).toArray()
  let qs = {}
  R.map(u => R.map(q => qs[q] = 1, u.queues), users)
  let qids = R.map(i => parseInt(i), Object.keys(qs))
  queues = await qcl.find({queueId: {$in: qids}}).toArray()

  queues.forEach(queue => {
    let _users = R.filter((uid) => R.not(R.contains(uid, uids)), queue.users)
    qcl.update({queueId: queue.queueId}, {$set: {users: _users}}).then(()=>"")
  })
  await ucl.remove({userId: {$in: uids}})

  console.log("Time taken to remove 50 users and update Queues: ", users.length, queues.length, (Date.now() - tm)/1000)
  return users.length
}

const removeQueues = async () => {
  const ucl = await getHandle('mydb', 'users')
  const qcl = await getHandle('mydb', 'queues')

  let qids = R.map(() => Math.floor(Math.random() * maxQueues), R.range(1,50))

  let users = []
  let tm = Date.now()
  let queues = await qcl.find({queueId: {$in: qids}}).toArray()
  let us = {}
  R.map(q => R.map(u => us[u] = 1, q.users), queues)
  let uids = R.map(i => parseInt(i), Object.keys(us))
  users = await ucl.find({userId: {$in: uids}}).toArray()

  users.forEach(user => {
    let _queues = R.filter((qid) => R.not(R.contains(qid, qids)), user.queues)
    ucl.update({userId: user.userId}, {$set: {queues: _queues}}).then(()=>"")
  })
  await qcl.remove({queueId: {$in: qids}})

  console.log("Time taken to remove 50 queues and update Users: ", queues.length, users.length, (Date.now() - tm)/1000)
  return queues.length
}

const main = async () => {
  await removeRecords()
  let u = await insertManyUsers()
  let q = await insertQueues()

  for(var j=0; j < 50; j++) {
    await associateUserQueue()
  }

  let lenu = await fetchUsers()
  let lenq = await fetchQueues()

  let remu = await removeUsers()
  let remq = await removeQueues()
}

main().then(closeClient)
