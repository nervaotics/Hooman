/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const exists = await knex.schema.hasColumn('employees', 'eobi_number')
  if (!exists) {
    await knex.schema.alterTable('employees', (t) => {
      t.string('eobi_number')
    })
  }
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  const exists = await knex.schema.hasColumn('employees', 'eobi_number')
  if (exists) {
    await knex.schema.alterTable('employees', (t) => {
      t.dropColumn('eobi_number')
    })
  }
}
