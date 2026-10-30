// The fixed base classes of member types (ADR 0026): rules use these, never a type's name.
export const baseClasses = ['adult', 'minor', 'dependent'] as const;
export type BaseClass = (typeof baseClasses)[number];

/** The message key of each base class's translated name. */
export const baseClassLabel = {
	adult: 'household.base_class.adult',
	minor: 'household.base_class.minor',
	dependent: 'household.base_class.dependent'
} as const satisfies Record<BaseClass, string>;
