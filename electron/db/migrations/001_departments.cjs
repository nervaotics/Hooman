/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('departments', (t) => {
    t.increments('id').primary()
    t.string('name').notNullable()
    t.string('code').unique()
    t.integer('head_id').unsigned()
    t.timestamps(true, true)
  })
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('departments')
}
