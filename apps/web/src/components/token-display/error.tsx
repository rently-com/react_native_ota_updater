import { Copy } from "lucide-react";

import TokenDisplayBuilder from "./builder";
import HomepageBtn from "./homepage-btn";

export default function TokenDisplayError() {
	return (
		<TokenDisplayBuilder
			title="Authentication failed"
			description="Your API token could not be created."
			inputValue=""
			inputDisabled={true}
			buttonDisabled={true}
			buttonIcon={<Copy className="h-4 w-4" />}
			footer={
				<>
					Please try again later.
					<HomepageBtn />
				</>
			}
		/>
	);
}
