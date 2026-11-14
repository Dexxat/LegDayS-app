/** Las alumnas ingresan con usuario; la entrenadora puede usar usuario o email. */
export function usernameToEmail(u: string) {
  const v = u.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${process.env.STUDENT_EMAIL_DOMAIN || 'alumnas.legday.com.ar'}`;
}
