type Data = Record<string, any>;
const clean = (value: unknown) => String(value ?? '').trim();
export const registrationSkills = (value: unknown): string[] => Array.isArray(value) ? [...new Set(value.map(clean).filter(Boolean))] : [];
export const parseRegistrationSkills = (value: string): string[] => registrationSkills(value.split(/[、,，;；\n]+/));
export const validApplicantEmail = (value: string): boolean => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const validApplicantAge = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 150;
export const validApplicantProfile = (value: Data): boolean => typeof value.organization === 'string' && !!value.organization.trim() && value.organization.trim().length <= 128 && typeof value.position === 'string' && !!value.position.trim() && value.position.trim().length <= 128 && validApplicantAge(value.age);
/** Compare submitted content, excluding ephemeral form row IDs and member order. */
export function registrationContent(input: Data, owner: string) {
  const members: Data[] = Array.isArray(input.members) ? input.members : [];
  const explicit = members.findIndex(member => member.isLeader === true);
  const leader = explicit < 0 ? 0 : explicit;
  const roster = members.map((member, index) => {
    const id = clean(member.id);
    return { id: index === leader ? owner : /^m-\d+$/.test(id) ? '' : id, name: clean(member.name), phone: clean(member.phone), roleTitle: clean(member.roleTitle), isLeader: index === leader };
  }).sort((left, right) => {
    if (left.isLeader !== right.isLeader) return left.isLeader ? -1 : 1;
    const a = JSON.stringify(left), b = JSON.stringify(right);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return { projectName: clean(input.projectName), teamName: clean(input.teamName), track: clean(input.track), type: clean(input.type), projectSummary: clean(input.projectSummary), videoUrl: clean(input.videoUrl), docUrl: clean(input.docUrl), members: roster,
    ...(input.channel === undefined || input.channel === null ? {} : { channel: clean(input.channel) }),
    ...(input.teamBinding === undefined ? {} : { teamBinding: input.teamBinding.kind === 'existing' ? { kind: 'existing', id: clean(input.teamBinding.id) } : { kind: 'create' } }),
    ...(input.applicant === undefined ? {} : { applicant: { userId: owner, name: clean(input.applicant?.name), city: clean(input.applicant?.city), skills: registrationSkills(input.applicant?.skills),
      ...(input.applicant?.email === undefined ? {} : { email: clean(input.applicant.email) }),
      ...(input.applicant?.bio === undefined ? {} : { bio: clean(input.applicant.bio) }),
      ...(input.applicant?.organization === undefined ? {} : { organization: clean(input.applicant.organization) }),
      ...(input.applicant?.position === undefined ? {} : { position: clean(input.applicant.position) }),
      ...(input.applicant?.age === undefined ? {} : { age: input.applicant.age }),
    } }) };
}
export const registrationContentKey = (input: Data, owner: string) => JSON.stringify(registrationContent(input, owner));
