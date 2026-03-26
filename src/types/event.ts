export type TransactionType = "spent" | "earned";

export type EventFormValues = {
  title: string;
  description: string;
  date: string;
  amount: number;
  transactionType: TransactionType;
  category: string;
  isHealthy: boolean;
};

export type EventRecord = {
  _id: string;
  title: string;
  description: string;
  date: string;
  amount: number;
  transactionType: TransactionType;
  category: string;
  isHealthy: boolean;
  createdAt: string;
  updatedAt: string;
};
