import * as yup from 'yup';

import type { SkillLevel, Sport } from './database.types';
import { SKILL_LEVELS, SPORTS } from './labels';

const email = yup.string().trim().required('Email is required').email('Enter a valid email');

export const loginSchema = yup.object({
  email,
  password: yup.string().required('Password is required'),
});
export type LoginValues = yup.InferType<typeof loginSchema>;

export const registerSchema = yup.object({
  displayName: yup
    .string()
    .trim()
    .required('Tell other riders what to call you')
    .min(2, 'At least 2 characters')
    .max(40, 'At most 40 characters'),
  email,
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'At least 8 characters')
    .matches(/[A-Za-z]/, 'Include at least one letter')
    .matches(/\d/, 'Include at least one number'),
  confirmPassword: yup
    .string()
    .required('Confirm your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});
export type RegisterValues = yup.InferType<typeof registerSchema>;

export const forgotPasswordSchema = yup.object({ email });
export type ForgotPasswordValues = yup.InferType<typeof forgotPasswordSchema>;

const sports = SPORTS.map((s) => s.value);
const skills = SKILL_LEVELS.map((s) => s.value);

export const profileSchema = yup.object({
  displayName: yup
    .string()
    .trim()
    .required('Display name is required')
    .min(2, 'At least 2 characters')
    .max(40, 'At most 40 characters'),
  sport: yup
    .mixed<Sport>()
    .oneOf(sports, 'Pick ski, snowboard or both')
    .required('Pick ski, snowboard or both'),
  skillLevel: yup
    .mixed<SkillLevel>()
    .oneOf(skills, 'Pick your level')
    .required('Pick your level'),
  homeMountainId: yup.number().nullable().defined(),
  bio: yup.string().trim().max(280, 'At most 280 characters').defined(),
});
export type ProfileValues = yup.InferType<typeof profileSchema>;

export const tripSchema = yup.object({
  title: yup
    .string()
    .trim()
    .required('Give your trip a name')
    .min(3, 'At least 3 characters')
    .max(80, 'At most 80 characters'),
  mountainId: yup.number().typeError('Choose a mountain').required('Choose a mountain'),
  tripDate: yup
    .string()
    .required('Pick a date')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  maxRiders: yup
    .number()
    .typeError('Enter a number')
    .integer('Whole riders only')
    .min(2, 'At least 2 riders')
    .max(20, 'At most 20 riders')
    .required(),
  minSkill: yup.mixed<SkillLevel>().oneOf(skills).nullable().defined(),
  notes: yup.string().trim().max(500, 'At most 500 characters').defined(),
});
export type TripValues = yup.InferType<typeof tripSchema>;

export const messageSchema = yup.string().trim().min(1).max(2000);
