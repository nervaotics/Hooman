const employeeService = require('../../services/employeeService.cjs')

/**
 * @param {{ knex: import('knex').Knex }} provider
 */
async function getAll(provider, filters = {}) {
  return employeeService.fetchDirectory(provider.knex, filters)
}

/**
 * @param {{ knex: import('knex').Knex }} provider
 */
async function getOne(provider, id) {
  return employeeService.getEmployeeDetail(provider.knex, id)
}

/**
 * @param {{ knex: import('knex').Knex }} provider
 */
async function create(provider, payload) {
  return employeeService.createEmployeeFull(provider.knex, payload)
}

/**
 * @param {{ knex: import('knex').Knex }} provider
 */
async function update(provider, id, payload) {
  return employeeService.updateEmployeeFull(provider.knex, id, payload)
}

/**
 * @param {{ knex: import('knex').Knex }} provider
 */
async function remove(provider, id) {
  return employeeService.softDeleteEmployee(provider.knex, id)
}

module.exports = { getAll, getOne, create, update, remove }
