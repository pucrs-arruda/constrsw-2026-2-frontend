export interface Room {
  id: string;
  code: string;
  name: string;
  building: string;
  capacity: number | null;
  active: boolean;
  enabled: boolean;
  resourceIds: string[];
}

export interface ClassSummary {
  id: string;
  code: string;
  label: string;
  status: string;
  modality: string;
  startDate: string;
  endDate: string;
  year: number;
  semester: number;
  seats: number;
  courseId: string;
  professorId: string | null;
  roomId: string;
  enabled: boolean;
  averageRating?: number | null;
}

export interface RoomView extends Room {
  classes: ClassSummary[];
}

export interface AccessibilityFeature {
  id: string;
  roomId: string;
  code: string;
  description: string | null;
  present: boolean;
  enabled: boolean;
}

export type RoomCreate = {
  code: string;
  name: string;
  building: string;
  capacity?: number | null;
  active?: boolean;
  resourceIds?: string[];
};
export type RoomUpdate = {
  code: string;
  name: string;
  building: string;
  capacity: number | null;
  active: boolean;
  resourceIds: string[];
};
export type RoomPatch = Partial<RoomUpdate>;
export type FeatureCreate = { code: string; description?: string | null; present?: boolean };
export type FeatureUpdate = { code: string; description: string | null; present: boolean };
export type FeaturePatch = Partial<FeatureUpdate>;

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gteq' | 'lt' | 'lteq' | 'like';
export interface RoomFilter {
  field: 'code' | 'name' | 'building' | 'capacity' | 'active' | 'resourceIds';
  op: FilterOp;
  value: string | number | boolean;
}
export interface RoomQuery {
  filters?: RoomFilter[];
  sort?: { field: 'code' | 'name' | 'building' | 'capacity' | 'active'; dir: 'asc' | 'desc' };
  page?: number;
  size?: number;
}
export interface Page<T> {
  items: T[];
  total: number;
}
