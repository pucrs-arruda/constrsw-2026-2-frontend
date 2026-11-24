export interface Identity {
  sub: string;
  email: string;
  papeis: string[];
  employeeId?: string | null;
  professorId?: string | null;
  studentId?: string | null;
}
