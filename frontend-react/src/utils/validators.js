export function validatePass(p) {
  return {
    length:    p.length >= 8 && p.length <= 16,
    uppercase: /[A-Z]/.test(p),
    lowercase: /[a-z]/.test(p),
    number:    /[0-9]/.test(p),
    special:   /[!_@#$%^&*(),?":{}|<>]/.test(p),
    noSpaces:  !/\s/.test(p) && !p.includes('.') && p.length > 0,
  };
}
