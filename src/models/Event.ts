import { Schema, model, models } from "mongoose";

const EventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 400,
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionType: {
      type: String,
      required: true,
      enum: ["spent", "earned"],
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    isHealthy: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const EventModel = models.Event || model("Event", EventSchema);
