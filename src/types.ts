export type DocType = "decision" | "design" | "experiment" | "pattern" | "feature" | "memory";

export type ModeName =
  | "discuss"
  | "design"
  | "experiment"
  | "produce"
  | "maintain";

export type SyncTarget = "memory" | "core-file" | "branch" | "discard";

export interface ArtifactMarker {
  sync: boolean;
  target: SyncTarget;
  description?: string;
}

export interface ClassifiedArtifact {
  path: string;
  marker: ArtifactMarker;
}

export interface SyncPlan {
  memory: ClassifiedArtifact[];
  coreFiles: ClassifiedArtifact[];
  branch: ClassifiedArtifact[];
  discard: ClassifiedArtifact[];
}

export interface ModeConfig {
  name: ModeName;
  skill: string;
  lease: boolean;
  defaultEarlyStop: string;
}
