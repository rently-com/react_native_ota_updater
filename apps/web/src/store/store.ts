import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";

type PathParam = string | null;
export type PlatformName = "ios" | "android";

export interface AppProperties {
	appName: PathParam;
	platformName: PathParam;
}

export interface AppActions {
	setAppName: (appName: string) => void;
	setPlatformName: (platformName: string) => void;
}

export type AppState = AppProperties & AppActions;

export const createAppStore = (initProps?: Partial<AppProperties>) => {
	const DEFAULT_PROPS = {
		appName: null,
		platformName: null,
	};

	return createStore<AppState>()((set) => ({
		...DEFAULT_PROPS,
		...initProps,
		setAppName: (appName: string) => set({ appName }),
		setPlatformName: (platformName: string) => set({ platformName }),
	}));
};

export type AppStore = ReturnType<typeof createAppStore>;

export interface AppStoreWithFragment {
	store: AppStore;
	fragment?: Partial<AppProperties>;
}

export const AppContext = createContext<AppStoreWithFragment | null>(null);

export function useAppStore<T>(selector: (state: AppState) => T): T {
	const storeWithFragment = useContext(AppContext);
	if (storeWithFragment === null) throw new Error("Missing AppStoreFragmentProvider in the tree");

	const { store, fragment } = storeWithFragment;

	const extendedSelector = (state: AppState) => {
		const extendedState = {
			...state,
			...fragment,
		};

		return selector(extendedState);
	};

	return useStore(store, extendedSelector);
}

export function useAppNameOptional() {
	return useAppStore((state) => state.appName);
}

export function useAppName() {
	const appName = useAppNameOptional();
	if (appName === null) throw new Error("Missing appName in the store");
	return appName;
}

export function usePlatformNameOptional() {
	return useAppStore((state) => state.platformName);
}

export function usePlatformName(): PlatformName {
	const platformName = usePlatformNameOptional();
	if (platformName === null) throw new Error("Missing platformName in the store");
	return platformName as PlatformName;
}
