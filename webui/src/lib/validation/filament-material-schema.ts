import { z } from 'zod';

export const genericSlicerSchema = z.object({
  first_layer_bed_temp: z.preprocess((value) => {if (value === "") return undefined;return Number(value);}, z.union([z.number(), z.nan()]).optional()),
  first_layer_nozzle_temp: z.preprocess((value) => {if (value === "") return undefined;return Number(value);}, z.union([z.number(), z.nan()]).optional()),
  bed_temp: z.preprocess((value) => {if (value === "") return undefined;return Number(value);}, z.union([z.number(), z.nan()]).optional()),
  nozzle_temp: z.preprocess((value) => {if (value === "") return undefined;return Number(value);}, z.union([z.number(), z.nan()]).optional()),
});

export const specificSlicerSchema = z.object({
  profile_name: z.string().optional()
}).merge(genericSlicerSchema);

export const slicerSettingsSchema = z.object({
  generic: genericSlicerSchema,
  prusaslicer: specificSlicerSchema,
  orcaslicer: specificSlicerSchema,
  bambustudio: specificSlicerSchema,
  cura: specificSlicerSchema,
});

export const filamentMaterialSchema = z
  .object({
    material: z.string(),
    default_max_dry_temperature: z.number().optional(),
    default_slicer_settings: slicerSettingsSchema
  });
