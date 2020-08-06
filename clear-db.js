const { db } = require('./db')

const record = db.prepare('select count(*) as c from gd').get()
db.prepare('delete from gd').run()
console.log('deleted', record.c, 'data')

db.exec('vacuum')
db.close()
