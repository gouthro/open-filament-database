import { z } from 'zod';

export const genericSlicerSchema = z.object({
  first_layer_bed_temp: z.number().optional(),
  first_layer_nozzle_temp: z.number().optional(),
  bed_temp: z.number().optional(),
  nozzle_temp: z.number().optional(),
});

export const specificSlicerSchema = z.object({
  profile_name: z.string().optional()
}).merge(genericSlicerSchema);

export const slicerSettingsSchema = z.object({
  generic: genericSlicerSchema,
  prusaslicer: specificSlicerSchema,
  bambus: specificSlicerSchema,
  orca: specificSlicerSchema,
  cura: specificSlicerSchema,
});

export const filamentMaterialSchema = z
  .object({
    material: z.string(),
    default_max_dry_temperature: z.number().optional(),
  })
  .merge(slicerSettingsSchema);
