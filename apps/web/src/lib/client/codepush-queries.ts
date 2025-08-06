import { queryOptions, useMutation } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { useQueryStates } from "nuqs";
import { toast } from "sonner";

import apiClient from "@/web/lib/client/api-client";
import { handleApiError } from "@/web/lib/common/error";
import { getQueryClient } from "@/web/lib/query-client";
import { queryKeys } from "@/web/lib/query-keys";
import { searchParams } from "@/web/lib/searchParams";
import { type PlatformName, useAppName, usePlatformName } from "@/web/store/store";

type TOnSuccessCallback = () => void;

const queryClient = getQueryClient();

export type TCodePushApp = InferResponseType<typeof apiClient.api.codepush.management.apps.$get, 200>["apps"];
export const getAllCollaboratorAppsQueryOptions = () => {
	return queryOptions({
		queryKey: queryKeys.codepush.appsList,
		queryFn: async () => {
			const res = await apiClient.api.codepush.management.apps.$get();

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.apps;
		},
	});
};

export const getAppQueryOptions = () => {
	const appName = useAppName();

	return queryOptions({
		queryKey: queryKeys.codepush.overview({ appName }),
		queryFn: async () => {
			const res = await apiClient.api.codepush.management.app.overview.$get({ query: { appName } });

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.app;
		},
	});
};

export const getCollaboratorsQueryOptions = () => {
	const appName = useAppName();

	return queryOptions({
		queryKey: queryKeys.codepush.collaborators({ appName }),
		queryFn: async () => {
			const res = await apiClient.api.codepush.management.collaborators.$get({ query: { appName } });

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.collaborators;
		},
	});
};

export const getPlatformDeploymentsQueryOptions = () => {
	const appName = useAppName();
	const platform = usePlatformName();

	return queryOptions({
		queryKey: queryKeys.codepush.deployments({ appName }),
		queryFn: async () => {
			const res = await apiClient.api.codepush.management.deployments.$get({ query: { appName } });

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.app.platforms;
		},
		select: (platforms) => {
			return platforms.find((platformDeployment) => platformDeployment.name === platform)?.deployments ?? [];
		},
	});
};

export type TReleaseHistory = InferResponseType<
	typeof apiClient.api.codepush.management.history.$get,
	200
>["history"][number];

export const getPlatformDeploymentHistoryQueryOptions = () => {
	const appName = useAppName();
	const platform = usePlatformName();
	const [{ deployment: deploymentName }] = useQueryStates(searchParams);

	return queryOptions({
		queryKey: queryKeys.codepush.history({ appName, platform, deploymentName }),
		queryFn: async () => {
			const res = await apiClient.api.codepush.management.history.$get({
				query: { appName, platform, deploymentName },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.history;
		},
	});
};

export const getReleaseDetailsQueryOptions = () => {
	const appName = useAppName();
	const platform = usePlatformName();
	const [{ deployment: deploymentName, label }] = useQueryStates(searchParams);

	const refetchInterval = deploymentName === "Production" ? 30000 : undefined;

	return queryOptions({
		refetchInterval,
		queryKey: queryKeys.codepush.release({ appName, platform, deploymentName, label }),
		queryFn: async () => {
			const res = await apiClient.api.codepush.management.release.$get({
				query: { appName, platform, deploymentName, label },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.release;
		},
	});
};

export const getReleaseDownloadUrlQueryOptions = ({ blobId }: { blobId: string }) => {
	return queryOptions({
		queryKey: queryKeys.codepush.releaseDownloadUrl({ blobId }),
		queryFn: async () => {
			const res = await apiClient.api.codepush.management.release.download.$get({
				query: { blobId },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.url;
		},
	});
};

export type UpdateReleaseFields = InferRequestType<
	typeof apiClient.api.codepush.management.release.$patch
>["json"]["packageInfo"];

export const useUpdateReleaseMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();
	const platform = usePlatformName();
	const [{ deployment, label }] = useQueryStates(searchParams);

	return useMutation({
		mutationFn: async (updatedRelease: UpdateReleaseFields) => {
			const res = await apiClient.api.codepush.management.release.$patch({
				query: { appName, platform, deploymentName: deployment },
				json: {
					packageInfo: {
						label: updatedRelease.label,
						appVersion: updatedRelease.appVersion,
						description: updatedRelease.description,
						rollout: updatedRelease.rollout,
						isDisabled: updatedRelease.isDisabled,
						isMandatory: updatedRelease.isMandatory,
					},
				},
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();

			return data.message ?? data;
		},
		onSuccess: (data) => {
			if (Number.parseInt(data) === 304) {
				onSuccessCallback();
				toast.info("Not Modified");
				return;
			}

			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.history({ appName, platform, deploymentName: deployment }),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.release({ appName, platform, deploymentName: deployment, label }),
			});
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export type AddAppFields = InferRequestType<typeof apiClient.api.codepush.management.app.$post>["json"];

export const useAddAppMutation = (onSuccessCallback: TOnSuccessCallback) => {
	return useMutation({
		mutationFn: async (formData: AddAppFields) => {
			const res = await apiClient.api.codepush.management.app.$post({
				json: { appName: formData.appName, appIcon: formData.appIcon },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.app;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.codepush.appsList });
			toast.success("App created successfully");
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export type AddCollaboratorFormValue = Omit<
	InferRequestType<typeof apiClient.api.codepush.management.collaborator.$post>["json"],
	"appName"
>;

export const useAddCollaboratorMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();

	return useMutation({
		mutationFn: async (formData: AddCollaboratorFormValue) => {
			const res = await apiClient.api.codepush.management.collaborator.$post({
				json: { appName, email: formData.email, permission: formData.permission },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.codepush.collaborators({ appName }) });
			toast.success("Collaborator added successfully");
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export type BulkAddCollaboratorFormValue = Omit<
	InferRequestType<typeof apiClient.api.codepush.management.collaborator.$post>["json"],
	"appName" | "email"
> & {
	emails: string[];
};

export const useBulkAddCollaboratorMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();

	return useMutation({
		mutationFn: async (formData: BulkAddCollaboratorFormValue) => {
			// Create an array of promises for each email
			const promises = formData.emails.map(async (email) => {
				const res = await apiClient.api.codepush.management.collaborator.$post({
					json: { appName, email, permission: formData.permission },
				});

				if (!res.ok) {
					return { email, success: false, error: await res.text() };
				}

				return { email, success: true };
			});

			// Execute all promises and return results
			const results = await Promise.all(promises);

			// Check if any failed
			const failures = results.filter((result) => !result.success);
			if (failures.length > 0) {
				return `Failed to add ${failures.length} of ${results.length} collaborators`;
			}

			return `Added ${results.length} collaborators successfully`;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.codepush.collaborators({ appName }) });
			toast.success("Collaborators added successfully");
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export type UpdateCollaboratorPermissionFormValue = Omit<
	InferRequestType<typeof apiClient.api.codepush.management.collaborator.$post>["json"],
	"appName"
>;

export const useUpdateCollaboratorPermissionMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();

	return useMutation({
		mutationFn: async (formData: UpdateCollaboratorPermissionFormValue) => {
			const res = await apiClient.api.codepush.management.collaborator.$post({
				json: { appName, email: formData.email, permission: formData.permission },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: (data) => {
			toast.success(data);
			queryClient.invalidateQueries({ queryKey: queryKeys.codepush.collaborators({ appName }) });
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export const useDeleteCollaboratorMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();

	return useMutation({
		mutationFn: async (email: string) => {
			const res = await apiClient.api.codepush.management.collaborator.$delete({
				json: { appName, email },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: (data) => {
			toast.success(data);
			queryClient.invalidateQueries({ queryKey: queryKeys.codepush.collaborators({ appName }) });
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export type AddDeploymentFormValue = Omit<
	InferRequestType<typeof apiClient.api.codepush.management.deployment.$post>["json"],
	"appName"
>;

export const useAddDeploymentMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();

	return useMutation({
		mutationFn: async (formData: AddDeploymentFormValue) => {
			const res = await apiClient.api.codepush.management.deployment.$post({
				json: { appName, deploymentName: formData.deploymentName },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.app;
		},
		onSuccess: () => {
			toast.success("Deployment created successfully");
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export const usePromoteReleaseMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();
	const platform = usePlatformName();
	const [{ deployment, label }] = useQueryStates(searchParams);

	return useMutation({
		mutationFn: async (targetDeployment: string) => {
			const res = await apiClient.api.codepush.management.release.promote.$post({
				query: { appName, platform, deploymentName: deployment },
				json: {
					packageInfo: { label },
					targetDeployment,
				},
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.history({ appName, platform, deploymentName: deployment }),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.release({ appName, platform, deploymentName: deployment, label }),
			});
			toast.success(data);
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export const useDeleteReleaseMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();
	const platform = usePlatformName();
	const [{ deployment, label }] = useQueryStates(searchParams);

	return useMutation({
		mutationFn: async () => {
			const res = await apiClient.api.codepush.management.release.$delete({
				query: { appName, platform, deploymentName: deployment, label },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.history({ appName, platform, deploymentName: deployment }),
			});
			toast.success(data);
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export const useRollbackReleaseMutation = (onSuccessCallback: TOnSuccessCallback) => {
	const appName = useAppName();
	const platform = usePlatformName();
	const [{ deployment, label }] = useQueryStates(searchParams);

	return useMutation({
		mutationFn: async () => {
			const res = await apiClient.api.codepush.management.release.rollback.$post({
				query: { appName, platform, deploymentName: deployment, targetReleaseLabel: label },
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.history({ appName, platform, deploymentName: deployment }),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.release({ appName, platform, deploymentName: deployment, label }),
			});
			toast.success(data);
			onSuccessCallback();
		},
		onError: (error) => toast.error(error.message),
	});
};

export function useRollDeploymentKeyMutation() {
	return useMutation({
		mutationFn: async ({
			appName,
			deploymentName,
			platform,
		}: {
			appName: string;
			deploymentName: string;
			platform: PlatformName;
		}) => {
			const res = await apiClient.api.codepush.management.deployment["roll-key"].$post({
				json: {
					appName,
					platform,
					deploymentName,
				},
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.overview({ appName: variables.appName }),
			});
		},
	});
}

export function useSetCustomDeploymentKeyMutation() {
	return useMutation({
		mutationFn: async ({
			appName,
			deploymentName,
			platform,
			customKey,
		}: {
			appName: string;
			deploymentName: string;
			platform: PlatformName;
			customKey: string;
		}) => {
			const res = await apiClient.api.codepush.management.deployment["custom-key"].$post({
				json: {
					appName,
					platform,
					deploymentName,
					customKey,
				},
			});

			if (!res.ok) {
				return await handleApiError(res);
			}

			const data = await res.json();
			return data.message;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.codepush.overview({ appName: variables.appName }),
			});
		},
	});
}
