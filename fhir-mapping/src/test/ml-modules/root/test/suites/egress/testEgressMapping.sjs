'use strict';

const test = require('/test/test-helper.xqy');
const utils = require('../testUtils.sjs');

const egressMapping = require('/fhir-accelerator/egress-mapping.sjs');

function flatMap(arr, cb) {
  // NOTE: Flatten the array using Array.prototype.reduce (Array.prototype.flat is not supported yet)
  return arr.map(cb).reduce((acc, res) => acc.concat(res), []);
}

function testMemberEgress(members) {
  const result = egressMapping.transformMultiple(members, 'PatientToFHIR');

  return flatMap(result, (entry, idx) => {
    const envelope = members[idx].toObject().envelope;
    const header = envelope.headers;
    const member = envelope.instance.member;

    return [
      test.assertTrue(entry.identifier.map(id => id.value).includes(member.identifiers.find(id => id.type === 'SSN').value)),
      test.assertTrue(entry.identifier.map(id => id.value).includes(member.identifiers.find(id => id.type === 'MEDICAID_ID').value)),
      test.assertEqual(member.lastName, entry.name[0].family),
      test.assertEqual([member.firstName, member.middleName].join(' '), entry.name[0].given.join(' ')),
      test.assertEqual(member.sex.toLowerCase(), entry.gender.toLowerCase()),
      test.assertEqual(member.dateOfBirth, entry.birthDate),
      test.assertEqual(member.maritalStatus, entry.maritalStatus.text),
      test.assertEqual([member.addresses[0].line1, member.addresses[0].line2, member.addresses[0].line3].join(' ').trim(), entry.address[0].line.join(' ').trim()),
      test.assertEqual(member.addresses[0].city, entry.address[0].city),
      test.assertEqual(member.addresses[0].state, entry.address[0].state),
      test.assertEqual(member.addresses[0].zip, entry.address[0].postalCode),
      // test.assertEqual(member.addresses[0].country, entry.address[0].country), // No country in original member object
      test.assertEqual(member.publicID, entry.meta.id),
      test.assertEqual(header.ingestTimestamp, entry.meta.lastUpdated),
      test.assertEqual(member.dateOfDeath === null, entry.active),
      test.assertEqual('Patient', entry.resourceType),
      test.assertEqual(member.contacts.find(contact => contact.type === 'HOME_PHONE').value, entry.telecom[0].value),
    ];
  });
}

function testPractitionerEgress(providers) {
  const result = egressMapping.transformMultiple(providers, 'PractitionerToFHIR');

  return flatMap(result, (entry, idx) => {
    const envelope = providers[idx].toObject().envelope;
    const header = envelope.headers.metadata;
    const provider = envelope.instance.provider;

    utils.logger.info('%O\n\n', entry);

    return [
      test.assertEqual(header.publicID, entry.id),
      test.assertEqual(provider.identifiers.find(id => id.key === 'NPI').value, entry.identifier[0].value),
    ];
  });
}

function testPractitionerLocationEgress(providers) {
  // TODO: Implement a non-trivial test for egress
  return [
    test.assertTrue(fn.count(providers) >= 1),
  ];
}

function testPractitionerRoleEgress(providers) {
  // TODO: Implement a non-trivial test for egress
  return [
    test.assertTrue(fn.count(providers) >= 1),
  ];
}

const members = xdmp.directory('/member/').toArray();
const providers = xdmp.directory('/provider/').toArray();

const assertions = [
  ...testMemberEgress(members),
  ...testPractitionerEgress(providers),
  ...testPractitionerLocationEgress(providers),
  ...testPractitionerRoleEgress(providers),
];

assertions;
