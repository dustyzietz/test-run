import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  description: z.string().trim().max(400).default(""),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "A valid date is required.",
  }),
  amount: z.coerce.number().min(0, "Amount must be 0 or greater."),
  transactionType: z.enum(["spent", "earned"]),
  category: z.string().trim().min(1, "Category is required.").max(60),
  isHealthy: z.coerce.boolean(),
});

export type EventInput = z.infer<typeof eventSchema>;
