/**
 * Publieke deur voor het people-domein. Consumers importeren via
 * `@repo/database/queries/people` en krijgen alles uit lookup/lists/
 * detail/pipeline.
 *
 * Voor fine-grained imports kan ook direct uit een sub-file:
 * `@repo/database/queries/people/lookup` etc.
 */

export {
  findPersonIdsByName,
  findProfileIdByName,
  findPeopleByNames,
  findPeopleByEmails,
  findPersonOrgByEmail,
} from "./lookup";

export {
  listPeople,
  listPeopleByOrganization,
  listPeopleWithOrg,
  listPeopleForAssignment,
  type PersonListItem,
  type PersonWithOrg,
  type PersonForAssignment,
} from "./lists";

export { getPersonById, getStalePeople, type PersonDetail } from "./detail";

export {
  getAllKnownPeople,
  getAdminEmails,
  getPeopleForContext,
  type KnownPerson,
  type PersonForContext,
} from "./pipeline";
