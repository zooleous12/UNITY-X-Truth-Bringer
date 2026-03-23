import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createStudyMaterial,
  getUserStudyMaterials,
  getStudyMaterialById,
  deleteStudyMaterial,
} from "../studyMaterials";

export const studyMaterialsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserStudyMaterials(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getStudyMaterialById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        type: z.enum(["audio", "pdf", "document_scan", "video"]),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        transcription: z.string().optional(),
        summary: z.string().optional(),
        keyPoints: z.array(z.string()).optional(),
        processingStatus: z.enum(["pending", "processing", "completed", "failed"]).default("pending"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createStudyMaterial({
        userId: ctx.user.id,
        ...input,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteStudyMaterial(input.id);
      return { success: true };
    }),
});
