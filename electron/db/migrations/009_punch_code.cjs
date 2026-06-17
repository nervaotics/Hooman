/**
 * Biometric device user id — maps ZKTeco uid to employee.
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const exists = await knex.schema.hasColumn('employees', 'punch_code')
  if (!exists) {
    await knex.schema.alterTable('employees', (t) => {
      t.string('punch_code', 32).unique().nullable()
    })
  }
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  const exists = await knex.schema.hasColumn('employees', 'punch_code')
  if (exists) {
    await knex.schema.alterTable('employees', (t) => {
      t.dropColumn('punch_code')
    })
  }
}
