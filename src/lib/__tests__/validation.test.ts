import { describe, expect, it } from '@jest/globals';
import { loginSchema, profileSchema, registerSchema, tripSchema } from '../validation';

const errorsFor = async (schema: { validate: (v: unknown, o: object) => Promise<unknown> }, value: unknown) => {
  try {
    await schema.validate(value, { abortEarly: false });
    return [];
  } catch (e) {
    return (e as { errors: string[] }).errors;
  }
};

describe('loginSchema', () => {
  it('requires a valid email and a password', async () => {
    expect(await errorsFor(loginSchema, { email: 'nope', password: '' })).toEqual([
      'Enter a valid email',
      'Password is required',
    ]);
    expect(await errorsFor(loginSchema, { email: ' rider@example.com ', password: 'x' })).toEqual([]);
  });
});

describe('registerSchema', () => {
  const valid = {
    displayName: 'Ava',
    email: 'ava@example.com',
    password: 'powder123',
    confirmPassword: 'powder123',
  };

  it('accepts a valid sign-up', async () => {
    expect(await errorsFor(registerSchema, valid)).toEqual([]);
  });

  it('enforces password strength and confirmation', async () => {
    const errors = await errorsFor(registerSchema, { ...valid, password: 'short', confirmPassword: 'other' });
    expect(errors).toEqual(
      expect.arrayContaining(['At least 8 characters', 'Include at least one number', 'Passwords do not match']),
    );
  });

  it('limits display name length', async () => {
    expect(await errorsFor(registerSchema, { ...valid, displayName: 'A' })).toEqual(['At least 2 characters']);
  });
});

describe('profileSchema', () => {
  it('requires sport and skill level', async () => {
    const errors = await errorsFor(profileSchema, {
      displayName: 'Ava',
      sport: undefined,
      skillLevel: 'pro',
      homeMountainId: null,
      bio: '',
    });
    expect(errors).toEqual(['Pick ski, snowboard or both', 'Pick your level']);
  });
});

describe('tripSchema', () => {
  const valid = {
    title: 'First chair',
    mountainId: 1,
    tripDate: '2030-01-15',
    maxRiders: '4',
    minSkill: null,
    notes: '',
  };

  it('casts max riders from text input', async () => {
    const trip = await tripSchema.validate(valid);
    expect(trip.maxRiders).toBe(4);
  });

  it('bounds max riders and requires a mountain', async () => {
    const errors = await errorsFor(tripSchema, { ...valid, mountainId: undefined, maxRiders: '50' });
    expect(errors).toEqual(['Choose a mountain', 'At most 20 riders']);
  });
});
