import LoadingSpinner from "@/web/components/loading-spinner";
import { Button } from "@/web/components/ui/button";

export default function GithubSignInButtonLoading() {
	return (
		<Button type="button" disabled={true} className="w-full">
			<LoadingSpinner />
			Continue with GitHub
		</Button>
	);
}
