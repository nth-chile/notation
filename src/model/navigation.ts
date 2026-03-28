export interface Volta {
  endings: number[]; // e.g., [1] for first ending, [2, 3] for second and third
  label?: string;
}

export interface NavigationMarks {
  volta?: Volta;
  coda?: boolean;
  segno?: boolean;
  toCoda?: boolean;
  fine?: boolean;
  dsText?: string; // "D.S. al Coda", "D.S. al Fine"
  dcText?: string; // "D.C. al Coda", "D.C. al Fine"
}
