import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

export type GeographyImportType =
  | "district"
  | "block"
  | "constituency"
  | "town-village"
  | "ward"
  | "booth"
  | "polling-location";

export type GeographyImportStatus =
  | "PENDING"
  | "VALIDATING"
  | "PREVIEW"
  | "IMPORTING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL";

export interface ImportRow {
  [key: string]: unknown;
}

export interface GeographyImportError {
  rowIndex: number;
  field?: string | null;
  value?: unknown;
  reason: string;
}

export interface GeographyImportJob {
  id: string;
  fileName?: string | null;
  status: GeographyImportStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  startedAt?: string | null;
  completedAt?: string | null;
  uploadedByName?: string | null;
  summary?: {
    type?: string;
    validatedRows?: ImportRow[];
    [key: string]: unknown;
  } | null;
  errors?: GeographyImportError[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface CreateImportResponse {
  jobId: string;
  status: GeographyImportStatus;
  totalRows: number;
}

const IMPORT_BASE_URL = "/admin/constituency/import";

export function useGeographyImport() {
  const [job, setJob] =
    useState<GeographyImportJob | null>(null);

  const [errors, setErrors] =
    useState<GeographyImportError[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  const pollingRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const getJob = useCallback(
    async (jobId: string) => {
      const response =
        await api.get<ApiResponse<GeographyImportJob>>(
          `${IMPORT_BASE_URL}/${jobId}`,
        );

      const nextJob =
        response.data.data;

      setJob(nextJob);

      return nextJob;
    },
    [],
  );

  const getErrors = useCallback(
    async (jobId: string) => {
      try {
        const response =
          await api.get<
            ApiResponse<GeographyImportError[]>
          >(
            `${IMPORT_BASE_URL}/${jobId}/errors`,
          );

        const nextErrors =
          Array.isArray(response.data.data)
            ? response.data.data
            : [];

        setErrors(nextErrors);

        return nextErrors;
      } catch (error) {
        console.error(
          "Failed to fetch import errors:",
          error,
        );

        setErrors([]);

        return [];
      }
    },
    [],
  );

  const pollJob = useCallback(
    async (jobId: string) => {
      stopPolling();

      const poll = async () => {
        try {
          const nextJob =
            await getJob(jobId);

          if (
            nextJob.status === "FAILED" ||
            nextJob.status === "COMPLETED" ||
            nextJob.status === "PARTIAL"
          ) {
            await getErrors(jobId);
            stopPolling();
          }
        } catch (error) {
          console.error(
            "Import polling failed:",
            error,
          );
        }
      };

      await poll();

      pollingRef.current =
        setInterval(poll, 1500);
    },
    [getJob, getErrors, stopPolling],
  );

  const uploadImport = useCallback(
    async ({
      type,
      fileName,
      fileSize,
      rows,
    }: {
      type: GeographyImportType;
      fileName: string;
      fileSize?: number;
      rows: ImportRow[];
    }) => {
      setUploading(true);
      setErrors([]);
      setJob(null);

      try {
        const response =
          await api.post<
            ApiResponse<CreateImportResponse>
          >(
            IMPORT_BASE_URL,
            {
              type,
              fileName,
              fileSize,
              rows,
            },
          );

        const created =
          response.data.data;

        const initialJob: GeographyImportJob = {
          id: created.jobId,
          fileName,
          status: created.status,
          totalRows: created.totalRows,
          processedRows: 0,
          successCount: 0,
          failedCount: 0,
          uploadedByName: null,
          errors: [],
        };

        setJob(initialJob);

        toast.success(
          response.data.message ||
            "Import uploaded successfully.",
        );

        await pollJob(
          created.jobId,
        );

        return created;
      } catch (error: any) {
        console.error(
          "Geography import upload failed:",
          error,
        );

        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to upload import.";

        toast.error(message);

        throw error;
      } finally {
        setUploading(false);
      }
    },
    [pollJob],
  );

  const confirmImport = useCallback(
    async (jobId: string) => {
      setConfirming(true);

      try {
        const response =
          await api.post<
            ApiResponse<GeographyImportJob>
          >(
            `${IMPORT_BASE_URL}/${jobId}/confirm`,
          );

        setJob(response.data.data);

        toast.success(
          response.data.message ||
            "Import confirmed successfully.",
        );

        await pollJob(jobId);

        return response.data.data;
      } catch (error: any) {
        console.error(
          "Import confirmation failed:",
          error,
        );

        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to confirm import.";

        toast.error(message);

        throw error;
      } finally {
        setConfirming(false);
      }
    },
    [pollJob],
  );

  const refreshJob = useCallback(
    async (jobId: string) => {
      setLoading(true);

      try {
        const current =
          await getJob(jobId);

        await getErrors(jobId);

        return current;
      } finally {
        setLoading(false);
      }
    },
    [getJob, getErrors],
  );

  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
    setErrors([]);
    setLoading(false);
    setUploading(false);
    setConfirming(false);
  }, [stopPolling]);

  return {
    job,
    errors,
    loading,
    uploading,
    confirming,

    uploadImport,
    confirmImport,
    refreshJob,

    startPolling: pollJob,
    stopPolling,
    reset,
  };
}