'use strict';

const test = require('/test/test-helper.xqy');
const utils = require('../testUtils.sjs');

const egressMapping = require('/fhir-accelerator/egress-mapping.sjs');

function testMemberEgress(members) {
  const result = egressMapping.transformMultiple(members, 'PatientToFHIR');

  return utils.flatMap(result, (entry, idx) => {
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

function getPractitionerAddressType(types) {
  if (types.includes('MAILING')) {
    return 'postal';
  }

  if (types.includes('PRACTICE')) {
    return 'physical';
  }

  return undefined;
}

function getPractitionerAddressUse(types) {
  if (types.includes('BILLING')) {
    return 'billing';
  }

  if (types.includes('PRACTICE')) {
    return 'work';
  }

  return undefined;
}

function testPractitionerEgress(providers) {
  const result = egressMapping.transformMultiple(providers, 'PractitionerToFHIR');

  return utils.flatMap(result, (entry, idx) => {
    const envelope = providers[idx].toObject().envelope;
    const header = envelope.headers.metadata;
    const provider = envelope.instance.provider;

    return [
      test.assertEqual(header.publicID, entry.id),
      ...['NPI', 'PTIN', 'ITIN', 'MMIS'].map(
        ident => test.assertEqual(provider.identifiers.find(id => id.key === ident).value, entry.identifier.find(id => id.type.text === ident).value),
      ),
      test.assertEqual(
        provider.providerLocations
          .filter(loc => loc.effectiveDate)
          .map(loc => ({
            period: { start: loc.effectiveDate },
            system: 'phone',
            use: 'work',
            value: loc.phoneNumber.number,
          })),
        entry.telecom,
      ),
      test.assertEqual(provider.person.prefix, entry.name[0].prefix),
      test.assertEqual([provider.person.firstName, provider.person.middleName], entry.name[0].given),
      test.assertEqual(provider.person.lastName, entry.name[0].family),
      test.assertEqual(
        provider.providerLocations.map(loc => ({
          city: loc.address.city,
          line: [loc.address.line1, loc.address.line2, loc.address.line2].filter(Boolean),
          state: loc.address.state,
          type: getPractitionerAddressType(loc.address.addresstype),
          use: getPractitionerAddressUse(loc.address.addresstype),
          postalCode: loc.address.zip,
          country: 'USA',
        })),
        entry.address,
      ),
      test.assertEqual('Practitioner', entry.resourceType),
    ];
  });
}

function testPractitionerLocationEgress(providers) {
  const result = egressMapping.transformMultiple(providers, 'ProviderToFHIRLocation');

  return utils.flatMap(result, (entry, idx) => {
    const envelope = providers[idx].toObject().envelope;
    const header = envelope.headers.metadata;
    const provider = envelope.instance.provider;

    // TODO: Add additional assertions when more data present in transformed entries
    return [
      test.assertEqual(`${header.publicID}-providerLocations-1`, entry.id),
      test.assertEqual('Location', entry.resourceType),
    ];
  });
}

function testPractitionerRoleEgress(providers) {
  const result = egressMapping.transformMultiple(providers, 'ProviderToUSCorePractitionerRole');

  utils.logger.info(result[0]);

  return utils.flatMap(result, (entry, idx) => {
    const envelope = providers[idx].toObject().envelope;
    const header = envelope.headers.metadata;
    const provider = envelope.instance.provider;

    return [
      test.assertEqual(`${header.publicID}-PractitionerRole-1`, entry.id),
      test.assertEqual(`Location/${header.publicID}-providerLocations-3`, entry.location[0].reference),
      test.assertEqual('Location', entry.location[0].type),
      test.assertEqual(`Practitioner/${header.publicID}`, entry.practitioner.reference),
      test.assertEqual('Practitioner', entry.practitioner.type),
      test.assertEqual('Organization', entry.organization.type),
      test.assertEqual('PractitionerRole', entry.resourceType),
    ];
  });
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
