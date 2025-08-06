import { queryOptions, useMutation } from "@tanstack/react-query";
import type { InferResponseType } from "hono";
import { toast } from "sonner";

import apiClient from "@/web/lib/client/api-client";
import { handleApiError } from "@/web/lib/common/error";
import { getQueryClient } from "@/web/lib/query-client";
import { queryKeys } from "@/web/lib/query-keys";

const queryClient = getQueryClient();

export const generateCliTokenQueryOptions = ({ hostname }: { hostname: string }) => {
	return queryOptions({
		refetchOnWindowFocus: false,
		staleTime: Number.POSITIVE_INFINITY,
		queryKey: queryKeys.cliToken({ hostname }),
		queryFn: async () => {
			const res = await apiClient.api.management["cli-login"].$get({ query: { hostname } });

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.token;
		},
	});
};

export type TUsers = InferResponseType<typeof apiClient.api.management.users.$get, 200>["users"];
export const getAllUsersQueryOptions = () => {
	return queryOptions({
		queryKey: queryKeys.users,
		queryFn: async () => {
			const res = await apiClient.api.management.users.$get();

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.users;
		},
	});
};

export const getAccessKeysQueryOptions = () => {
	return queryOptions({
		queryKey: queryKeys.accessKeys,
		queryFn: async () => {
			const res = await apiClient.api.management.accessKeys.$get();

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.accessKeys;
		},
	});
};

export const useAddAccessKeyMutation = () => {
	return useMutation({
		mutationFn: async ({ name, ttl }: { name: string; ttl?: number }) => {
			const res = await apiClient.api.management.accessKey.$post({
				json: {
					createdBy: typeof window !== "undefined" ? window.location.hostname : "web",
					name,
					ttl,
				},
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.accessKey;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.accessKeys });
			toast.success("Access key created successfully");
		},
		onError: (error) => toast.error(error.message),
	});
};

export const useDeleteAccessKeyMutation = () => {
	return useMutation({
		mutationFn: async ({ name }: { name: string }) => {
			const res = await apiClient.api.management.accessKey.$delete({
				json: { name },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.accessKeys });
			toast.success("Access key deleted successfully");
		},
		onError: (error) => toast.error(error.message),
	});
};
