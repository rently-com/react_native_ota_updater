"use client";

import { useContext, useEffect, useRef } from "react";
import { AppContext, type AppState, type AppStoreWithFragment, createAppStore } from "./store";

export type StoreProviderProps = React.PropsWithChildren<Partial<AppState>>;

export function AppStoreProvider({ children, ...props }: StoreProviderProps) {
	const storeWithFragmentRef = useRef<AppStoreWithFragment | null>(null);

	if (storeWithFragmentRef.current === null) {
		const store = createAppStore(props);
		storeWithFragmentRef.current = { store };
	}

	return <AppContext.Provider value={storeWithFragmentRef.current}>{children}</AppContext.Provider>;
}

export function AppStoreFragmentProvider({ children, ...props }: StoreProviderProps) {
	const initialisedRef = useRef(false);

	const parentStoreWithFragment = useContext(AppContext);

	if (parentStoreWithFragment === null) throw new Error("AppStoreFragmentProvider must be inside an AppStoreProvider.");

	const { store, fragment } = parentStoreWithFragment;

	useEffect(() => {
		store.setState({ ...props });
		initialisedRef.current = true;
	}, []);

	const combinedFragment = initialisedRef.current
		? fragment
		: {
				...fragment,
				...props,
			};

	const storeWithFragment = {
		store,
		fragment: combinedFragment,
	};

	return <AppContext.Provider value={storeWithFragment}>{children}</AppContext.Provider>;
}
