// The fixed base classes of member types (ADR 0026): rules use these, never a type's name.
export const baseClasses = ['adult', 'minor', 'dependent'] as const;
export type BaseClass = (typeof baseClasses)[number];
