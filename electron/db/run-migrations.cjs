const { getMigrationsDirectory } = require('./migrationsDir.cjs')

require('dotenv').config()

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'hooman_hrm',
    timezone: 'Z',
  },
  migrations: {
    directory: getMigrationsDirectory(),
    loadExtensions: ['.cjs', '.js'],
  },
})

knex.migrate
  .latest()
  .then(([batch, log]) => {
    if (log.length) console.log('Migrations applied:', log)
    else console.log('Database schema up to date.')
    return knex.destroy()
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    knex.destroy().finally(() => process.exit(1))
  })
