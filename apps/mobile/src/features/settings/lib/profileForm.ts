/** The editable profile fields, keyed by the name they are validated under. */
export type ProfileFormValues = {
  name: string;
  dob: string;
  gender: string;
  country: string;
  platform: string;
};

export type ProfileFormField = keyof ProfileFormValues;

/**
 * Returns the first required field the form is missing, in the order the form
 * presents them, so the user is sent to the topmost problem. `null` means the
 * form is complete.
 */
export function firstMissingField(values: ProfileFormValues): ProfileFormField | null {
  if (!values.name.trim()) return "name";
  if (!values.dob) return "dob";
  if (!values.gender) return "gender";
  if (!values.country) return "country";
  if (!values.platform) return "platform";
  return null;
}
