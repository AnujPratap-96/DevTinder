import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(4, "First name must be at least 4 characters")
      .max(50, "First name must be less than 50 characters"),
    lastName: z.string().optional(),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    age: z.number().min(18, "Must be at least 18 years old").max(100, "Invalid age"),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({ message: "Gender must be male, female, or other" }),
    }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    emailId: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const editProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(4).max(50).optional(),
    lastName: z.string().optional(),
    about: z.string().max(1000).optional(),
    age: z.number().min(18).max(100).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    skills: z.array(z.string()).max(20).optional(),
    role: z.enum([
      "frontend", "backend", "fullstack", "mobile", "design", 
      "product", "data", "devops", "other"
    ]).optional(),
    experienceYears: z.number().min(0).max(60).optional(),
    availability: z.enum(["open", "busy", "not_looking"]).optional(),
    theme: z.enum(["default", "glassmorphism", "matrix", "neon", "cyberpunk", "minimal", "hacker"]).optional(),
    photoUrl: z.array(z.string().url()).optional(),
    socialLinks: z.object({
      github: z.string().url().optional().or(z.literal("")),
      linkedin: z.string().url().optional().or(z.literal("")),
      portfolio: z.string().url().optional().or(z.literal("")),
    }).optional(),
    githubProfile: z.object({
      username: z.string().optional(),
      token: z.string().optional(),
    }).optional(),
  }).passthrough(),
});
