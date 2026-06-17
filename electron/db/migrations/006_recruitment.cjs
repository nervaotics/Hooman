/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('job_postings', (t) => {
    t.increments('id').primary()
    t.string('title').notNullable()
    t.integer('department_id').unsigned()
    t.text('description')
    t.string('status').defaultTo('open')
    t.date('closing_date')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('applicants', (t) => {
    t.increments('id').primary()
    t.integer('job_id').unsigned().references('id').inTable('job_postings').onDelete('CASCADE')
    t.string('full_name')
    t.string('email')
    t.string('phone')
    t.string('resume_url')
    t.string('stage').defaultTo('applied')
    t.text('notes')
    t.timestamps(true, true)
  })
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('applicants')
  await knex.schema.dropTableIfExists('job_postings')
}
