import ManageCard from "@/web/components/manage-card";

export default function SelectPage() {
	return (
		<>
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-2xl font-semibold">My Apps</h1>
			</div>

			<ManageCard />
		</>
	);
}
