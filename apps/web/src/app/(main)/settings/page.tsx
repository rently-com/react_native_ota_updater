import { AccessKeys } from "@/web/components/settings-page/access-keys";

export default async function SettingsPage() {
	return (
		<>
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Settings</h1>
			</div>

			<div className="space-y-6">
				<AccessKeys />
			</div>
		</>
	);
}
